import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateMarketDto {
  title: string;
  description: string;
  category: string;
  type: string;
  endDate: string;
  oracleSource: string;
  resolutionMethod: string;
  creatorAddress: string;
  outcomes: string[];
  tags?: string[];
  bannerUrl?: string;
  rules?: string;
}

export interface CreateTradeDto {
  walletAddress: string;
  outcomeId: string;
  type: 'BUY' | 'SELL';
  amount: number; // For BUY, this is collateral (USDC) spent. For SELL, this is shares to sell.
}

export interface CreateCommentDto {
  walletAddress: string;
  content: string;
  parentId?: string;
}

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string, search?: string, status?: string) {
    const where: any = {};

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    return this.prisma.market.findMany({
      where,
      include: {
        outcomes: true,
      },
      orderBy: {
        totalVolume: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: {
        outcomes: true,
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        trades: {
          include: {
            user: true,
            outcome: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${id} not found`);
    }

    return market;
  }

  async create(dto: CreateMarketDto) {
    // Ensure creator exists
    await this.prisma.user.upsert({
      where: { walletAddress: dto.creatorAddress.toLowerCase() },
      update: {},
      create: {
        walletAddress: dto.creatorAddress.toLowerCase(),
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        username: `user_${dto.creatorAddress.substring(2, 6).toLowerCase()}`,
      },
    });

    // Clean outcomes
    const outcomes = dto.outcomes && dto.outcomes.length > 0 ? dto.outcomes : ['YES', 'NO'];
    const initialPrice = 1.0 / outcomes.length;

    // Generate pseudo random contract address
    const mockContractAddress = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    return this.prisma.market.create({
      data: {
        contractAddress: mockContractAddress,
        title: dto.title,
        description: dto.description,
        category: dto.category.toUpperCase() || 'CRYPTO',
        type: dto.type.toUpperCase() || 'YES_NO',
        rules: dto.rules || 'Rules govern default predictions. Resolves according to Oracle source.',
        endDate: new Date(dto.endDate),
        oracleSource: dto.oracleSource,
        resolutionMethod: dto.resolutionMethod,
        creatorAddress: dto.creatorAddress.toLowerCase(),
        tags: dto.tags ? dto.tags.join(',') : ['prediction', dto.category.toLowerCase()].join(','),
        bannerUrl: dto.bannerUrl || null,
        outcomes: {
          create: outcomes.map((name) => ({
            name: name,
            price: initialPrice,
            totalShares: 0,
          })),
        },
      },
      include: {
        outcomes: true,
      },
    });
  }

  async trade(marketId: string, dto: CreateTradeDto) {
    const walletAddress = dto.walletAddress.toLowerCase();
    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
      include: { outcomes: true },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status !== 'ACTIVE') {
      throw new BadRequestException('Trading is only allowed on active markets');
    }

    if (new Date() > market.endDate) {
      throw new BadRequestException('Trading has ended for this market');
    }

    const outcome = market.outcomes.find((o) => o.id === dto.outcomeId);
    if (!outcome) {
      throw new NotFoundException('Outcome not found in this market');
    }

    // Ensure user profile exists
    const user = await this.prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: {
        walletAddress,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        username: `user_${walletAddress.substring(2, 6).toLowerCase()}`,
      },
    });

    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const feeBasisPoints = 100; // 1%

    if (dto.type === 'BUY') {
      const amountSpent = dto.amount;
      if (amountSpent <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      const fee = (amountSpent * feeBasisPoints) / 10000;
      const netAmount = amountSpent - fee;

      // Price calculation
      const currentPrice = Number(outcome.price);
      const sharesReceived = netAmount / currentPrice;

      // Create trade
      await this.prisma.trade.create({
        data: {
          txHash,
          userId: user.id,
          marketId,
          outcomeId: outcome.id,
          type: 'BUY',
          amount: amountSpent,
          shares: sharesReceived,
          pricePaid: currentPrice,
          feePaid: fee,
        },
      });

      // Update position
      const existingPosition = await this.prisma.position.findFirst({
        where: { userId: user.id, outcomeId: outcome.id },
      });

      if (existingPosition) {
        const existingShares = Number(existingPosition.sharesOwned);
        const newShares = existingShares + sharesReceived;
        const averagePrice = (Number(existingPosition.averageBuyPrice) * existingShares + currentPrice * sharesReceived) / newShares;

        await this.prisma.position.update({
          where: { id: existingPosition.id },
          data: {
            sharesOwned: newShares,
            averageBuyPrice: averagePrice,
            updatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.position.create({
          data: {
            userId: user.id,
            marketId,
            outcomeId: outcome.id,
            sharesOwned: sharesReceived,
            averageBuyPrice: currentPrice,
          },
        });
      }

      // Update outcome total shares
      await this.prisma.outcome.update({
        where: { id: outcome.id },
        data: {
          totalShares: Number(outcome.totalShares) + sharesReceived,
        },
      });

      // Recalculate AMM prices for all outcomes in this market
      await this.recalculatePrices(marketId);

      // Update market metrics
      await this.prisma.market.update({
        where: { id: marketId },
        data: {
          totalVolume: Number(market.totalVolume) + amountSpent,
          tvl: Number(market.tvl) + netAmount,
          openInterest: Number(market.openInterest) + netAmount,
        },
      });

    } else if (dto.type === 'SELL') {
      const sharesToSell = dto.amount;
      if (sharesToSell <= 0) {
        throw new BadRequestException('Shares must be greater than 0');
      }

      const position = await this.prisma.position.findFirst({
        where: { userId: user.id, outcomeId: outcome.id },
      });

      if (!position || Number(position.sharesOwned) < sharesToSell) {
        throw new BadRequestException('Insufficient shares owned to sell');
      }

      const currentPrice = Number(outcome.price);
      const collateralReturned = sharesToSell * currentPrice;

      const fee = (collateralReturned * feeBasisPoints) / 10000;
      const netCollateralReturned = collateralReturned - fee;

      // Create trade
      await this.prisma.trade.create({
        data: {
          txHash,
          userId: user.id,
          marketId,
          outcomeId: outcome.id,
          type: 'SELL',
          amount: netCollateralReturned,
          shares: sharesToSell,
          pricePaid: currentPrice,
          feePaid: fee,
        },
      });

      // Update position
      const newSharesOwned = Number(position.sharesOwned) - sharesToSell;
      if (newSharesOwned <= 0.0001) {
        await this.prisma.position.delete({
          where: { id: position.id },
        });
      } else {
        await this.prisma.position.update({
          where: { id: position.id },
          data: {
            sharesOwned: newSharesOwned,
            updatedAt: new Date(),
          },
        });
      }

      // Update outcome total shares
      await this.prisma.outcome.update({
        where: { id: outcome.id },
        data: {
          totalShares: Math.max(0, Number(outcome.totalShares) - sharesToSell),
        },
      });

      // Recalculate AMM prices
      await this.recalculatePrices(marketId);

      // Update market metrics
      await this.prisma.market.update({
        where: { id: marketId },
        data: {
          totalVolume: Number(market.totalVolume) + netCollateralReturned,
          tvl: Math.max(0, Number(market.tvl) - collateralReturned),
          openInterest: Math.max(0, Number(market.openInterest) - collateralReturned),
        },
      });
    }

    return this.findOne(marketId);
  }

  private async recalculatePrices(marketId: string) {
    const outcomes = await this.prisma.outcome.findMany({
      where: { marketId },
    });

    const totalSharesSum = outcomes.reduce((sum, o) => sum + Number(o.totalShares), 0);

    if (totalSharesSum === 0) {
      const defaultPrice = 1.0 / outcomes.length;
      for (const outcome of outcomes) {
        await this.prisma.outcome.update({
          where: { id: outcome.id },
          data: { price: defaultPrice },
        });
      }
      return;
    }

    for (const outcome of outcomes) {
      let rawPrice = Number(outcome.totalShares) / totalSharesSum;
      // Clamping between 0.02 and 0.98 to avoid extreme pricing
      if (rawPrice < 0.02) rawPrice = 0.02;
      if (rawPrice > 0.98) rawPrice = 0.98;

      await this.prisma.outcome.update({
        where: { id: outcome.id },
        data: { price: rawPrice },
      });
    }
  }

  async resolve(marketId: string, winningOutcomeId: string) {
    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
      include: { outcomes: true },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    const winningOutcome = market.outcomes.find((o) => o.id === winningOutcomeId);
    if (!winningOutcome) {
      throw new NotFoundException('Winning outcome not found in this market');
    }

    return this.prisma.market.update({
      where: { id: marketId },
      data: {
        status: 'RESOLVED',
        resolutionValue: winningOutcome.name,
        resolvedAt: new Date(),
      },
      include: {
        outcomes: true,
      },
    });
  }

  async addComment(marketId: string, dto: CreateCommentDto) {
    const walletAddress = dto.walletAddress.toLowerCase();
    
    // Ensure user profile exists
    const user = await this.prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: {
        walletAddress,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        username: `user_${walletAddress.substring(2, 6).toLowerCase()}`,
      },
    });

    return this.prisma.comment.create({
      data: {
        marketId,
        userId: user.id,
        content: dto.content,
        parentId: dto.parentId || null,
      },
      include: {
        user: true,
      },
    });
  }
}
