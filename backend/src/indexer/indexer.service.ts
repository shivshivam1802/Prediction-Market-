import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import { MARKET_FACTORY_ABI, PREDICTION_MARKET_ABI } from './abis';

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;
  private activeListeners = new Set<string>();

  // Mock addresses for local execution/testing if variables are missing
  private factoryAddress = process.env.MARKET_FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  private rpcUrl = process.env.PROVIDER_RPC_URL || 'http://127.0.0.1:8545';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Initializing Blockchain Indexer Service...');
    
    // We run the indexing loop asynchronously so it doesn't block bootstrap
    this.startIndexer().catch((error) => {
      this.logger.error('Failed to start indexer service:', error.message);
    });
  }

  private async startIndexer() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      
      // Test provider connection
      await this.provider.getNetwork();
      this.logger.log(`Successfully connected to blockchain provider at: ${this.rpcUrl}`);
      
      this.factoryContract = new ethers.Contract(this.factoryAddress, MARKET_FACTORY_ABI, this.provider);
      
      // Start polling for MarketCreated events
      this.listenToFactoryEvents();
      
      // Sync historic markets already deployed
      await this.syncHistoricMarkets();
    } catch (err) {
      this.logger.warn(`Could not connect to chain provider at ${this.rpcUrl}. Indexer is running in offline listener fallback mode.`);
    }
  }

  private listenToFactoryEvents() {
    this.logger.log(`Subscribing to MarketFactory events on: ${this.factoryAddress}`);
    
    this.factoryContract.on('MarketCreated', async (marketId, marketAddress, title, outcomes, endDate, creator, event) => {
      this.logger.log(`New market detected on-chain! ID: ${marketId}, Address: ${marketAddress}`);
      
      await this.registerMarketInDb(marketId, marketAddress, title, outcomes, Number(endDate), creator);
      this.subscribeToMarketEvents(marketId, marketAddress);
    });
  }

  private async syncHistoricMarkets() {
    // Read count of all markets deployed
    try {
      const count = await this.factoryContract.getMarketsCount();
      this.logger.log(`Syncing ${count} historic markets from chain...`);
      
      for (let i = 0; i < Number(count); i++) {
        const marketAddress = await this.factoryContract.allMarkets(i);
        const marketContract = new ethers.Contract(marketAddress, PREDICTION_MARKET_ABI, this.provider);
        
        const marketId = await marketContract.marketId();
        const title = await marketContract.title();
        const endDate = await marketContract.endDate();
        const isResolved = await marketContract.isResolved();
        
        // Read outcomes names
        const outcomeCount = await marketContract.outcomeCount();
        const outcomes: string[] = [];
        for (let j = 0; j < Number(outcomeCount); j++) {
          const outcomeInfo = await marketContract.outcomes(j);
          outcomes.push(outcomeInfo.name);
        }

        const creator = await marketContract.runner; // dummy creator address or default
        await this.registerMarketInDb(marketId, marketAddress, title, outcomes, Number(endDate), creator || '0x0000000000000000000000000000000000000000');
        
        // If it's active, keep listening to trade/resolution events
        if (!isResolved) {
          this.subscribeToMarketEvents(marketId, marketAddress);
        }
      }
    } catch (error) {
      this.logger.warn(`Historic sync skipped: ${error.message}`);
    }
  }

  private async registerMarketInDb(
    marketId: string,
    marketAddress: string,
    title: string,
    outcomes: string[],
    endDateSec: number,
    creatorAddress: string
  ) {
    try {
      const exists = await this.prisma.market.findUnique({
        where: { contractAddress: marketAddress }
      });

      if (!exists) {
        await this.prisma.market.create({
          data: {
            id: marketId,
            contractAddress: marketAddress,
            title: title,
            description: `Prediction market for: ${title}`,
            category: 'CRYPTO', // Default category, editable via Admin API
            type: 'YES_NO',
            rules: 'Rules govern default predictions. Verified by Oracle resolution sources.',
            endDate: new Date(endDateSec * 1000),
            oracleSource: 'Chainlink Oracle Feed / Admin Resolution',
            resolutionMethod: 'Oracle contract verification',
            creatorAddress: creatorAddress,
            tags: ['decentralized', 'predict'],
            outcomes: {
              create: outcomes.map((name) => ({
                name: name,
                price: 0.50, // Initial midprice
                totalShares: 0
              }))
            }
          }
        });
        this.logger.log(`Successfully indexed market in DB: ${title}`);
      }
    } catch (err) {
      this.logger.error(`Database write error during market indexing: ${err.message}`);
    }
  }

  private subscribeToMarketEvents(marketId: string, marketAddress: string) {
    if (this.activeListeners.has(marketAddress)) return;
    this.activeListeners.add(marketAddress);

    this.logger.log(`Subscribing to market events on: ${marketAddress}`);
    const marketContract = new ethers.Contract(marketAddress, PREDICTION_MARKET_ABI, this.provider);

    // 1. Listen for Trade Swaps (SharesBought)
    marketContract.on('SharesBought', async (buyer, outcomeId, amountSpent, sharesReceived, feePaid, event) => {
      this.logger.log(`Trade BUY detected in market ${marketId}: User ${buyer} bought outcome ${outcomeId}`);
      await this.indexTrade(marketId, buyer, Number(outcomeId), 'BUY', amountSpent, sharesReceived, feePaid, event.log.transactionHash);
    });

    // 2. Listen for Trade Swaps (SharesSold)
    marketContract.on('SharesSold', async (seller, outcomeId, sharesSold, amountReturned, feePaid, event) => {
      this.logger.log(`Trade SELL detected in market ${marketId}: User ${seller} sold outcome ${outcomeId}`);
      await this.indexTrade(marketId, seller, Number(outcomeId), 'SELL', amountReturned, sharesSold, feePaid, event.log.transactionHash);
    });

    // 3. Listen for Resolution (MarketClosed)
    marketContract.on('MarketClosed', async (winningOutcomeId) => {
      this.logger.log(`Market ${marketId} resolved to winning outcome ID: ${winningOutcomeId}`);
      await this.indexResolution(marketId, Number(winningOutcomeId));
      
      // Stop listening to this market since it has resolved
      marketContract.removeAllListeners();
      this.activeListeners.delete(marketAddress);
    });
  }

  private async indexTrade(
    marketId: string,
    userAddress: string,
    outcomeIdNum: number,
    type: 'BUY' | 'SELL',
    amountRaw: bigint,
    sharesRaw: bigint,
    feeRaw: bigint,
    txHash: string
  ) {
    try {
      const amount = parseFloat(ethers.formatUnits(amountRaw, 6)); // Assuming USDC 6 decimals
      const shares = parseFloat(ethers.formatUnits(sharesRaw, 18));
      const fee = parseFloat(ethers.formatUnits(feeRaw, 6));
      const pricePaid = amount / shares;

      // Ensure user profile exists
      await this.prisma.user.upsert({
        where: { walletAddress: userAddress },
        update: {},
        create: {
          walletAddress: userAddress,
          referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
        }
      });

      // Find outcome model ID
      const marketOutcomes = await this.prisma.outcome.findMany({
        where: { marketId }
      });
      const outcome = marketOutcomes[outcomeIdNum];
      if (!outcome) return;

      // Write trade record
      await this.prisma.trade.create({
        data: {
          txHash,
          userId: (await this.prisma.user.findUnique({ where: { walletAddress: userAddress } })).id,
          marketId,
          outcomeId: outcome.id,
          type,
          amount,
          shares,
          pricePaid,
          feePaid: fee
        }
      });

      // Update position
      const position = await this.prisma.position.findFirst({
        where: {
          userId: (await this.prisma.user.findUnique({ where: { walletAddress: userAddress } })).id,
          outcomeId: outcome.id
        }
      });

      if (position) {
        const newShares = type === 'BUY' 
          ? Number(position.sharesOwned) + shares 
          : Number(position.sharesOwned) - shares;

        await this.prisma.position.update({
          where: { id: position.id },
          data: {
            sharesOwned: newShares,
            averageBuyPrice: type === 'BUY' 
              ? (Number(position.averageBuyPrice) * Number(position.sharesOwned) + pricePaid * shares) / newShares
              : position.averageBuyPrice
          }
        });
      } else {
        await this.prisma.position.create({
          data: {
            userId: (await this.prisma.user.findUnique({ where: { walletAddress: userAddress } })).id,
            marketId,
            outcomeId: outcome.id,
            sharesOwned: shares,
            averageBuyPrice: pricePaid
          }
        });
      }

      // Update live prices on outcome database
      const marketContract = new ethers.Contract(
        (await this.prisma.market.findUnique({ where: { id: marketId } })).contractAddress,
        PREDICTION_MARKET_ABI,
        this.provider
      );
      const currentPriceRaw = await marketContract.getOutcomePrice(outcomeIdNum);
      const currentPrice = parseFloat(ethers.formatUnits(currentPriceRaw, 18));

      await this.prisma.outcome.update({
        where: { id: outcome.id },
        data: { price: currentPrice }
      });

      this.logger.log(`Successfully indexed transaction for user ${userAddress}`);
    } catch (err) {
      this.logger.error(`Error indexing trade: ${err.message}`);
    }
  }

  private async indexResolution(marketId: string, winningOutcomeId: number) {
    try {
      const outcomes = await this.prisma.outcome.findMany({ where: { marketId } });
      const winningOutcome = outcomes[winningOutcomeId];

      await this.prisma.market.update({
        where: { id: marketId },
        data: {
          status: 'RESOLVED',
          resolutionValue: winningOutcome ? winningOutcome.name : `Outcome ID: ${winningOutcomeId}`,
          resolvedAt: new Date()
        }
      });

      this.logger.log(`Successfully updated database resolution state for market ${marketId}`);
    } catch (err) {
      this.logger.error(`Database resolution update error: ${err.message}`);
    }
  }
}
