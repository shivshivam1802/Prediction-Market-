import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertUserDto {
  walletAddress: string;
  username?: string;
  ensName?: string;
  avatarUrl?: string;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByWallet(walletAddress: string) {
    const address = walletAddress.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: address },
      include: {
        positions: {
          include: {
            market: {
              include: {
                outcomes: true,
              },
            },
            outcome: true,
          },
        },
        trades: {
          include: {
            market: true,
            outcome: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    if (!user) {
      // Return a blank profile rather than throwing, to allow new visitors to connect smoothly
      return {
        walletAddress: address,
        username: `user_${address.substring(2, 6)}`,
        positions: [],
        trades: [],
        netWorth: 10000.0, // Default starting demo balance
        unrealizedPnl: 0,
        realizedPnl: 0,
      };
    }

    // Calculate position stats
    let totalPositionValue = 0;
    let totalUnrealizedPnl = 0;

    const formattedPositions = user.positions.map((pos) => {
      const shares = Number(pos.sharesOwned);
      const avgPrice = Number(pos.averageBuyPrice);
      const currentPrice = Number(pos.outcome.price);
      const currentValue = shares * currentPrice;
      const unrealizedPnl = currentValue - (shares * avgPrice);

      totalPositionValue += currentValue;
      totalUnrealizedPnl += unrealizedPnl;

      return {
        id: pos.id,
        marketId: pos.marketId,
        marketTitle: pos.market.title,
        marketContractAddress: pos.market.contractAddress,
        marketStatus: pos.market.status,
        outcomeId: pos.outcomeId,
        outcomeName: pos.outcome.name,
        sharesOwned: shares,
        averageBuyPrice: avgPrice,
        currentPrice: currentPrice,
        currentValue: currentValue,
        unrealizedPnl: unrealizedPnl,
      };
    });

    // Sum total realized P&L from trades (just sum P&L for simplicity or return running metrics)
    const totalRealizedPnl = user.trades
      .filter((t) => t.type === 'SELL')
      .reduce((sum, trade) => {
        // Find matching purchase or average price (estimated)
        const avgBuy = formattedPositions.find((p) => p.outcomeId === trade.outcomeId)?.averageBuyPrice || 0.50;
        const profit = (Number(trade.pricePaid) - avgBuy) * Number(trade.shares);
        return sum + profit;
      }, 0);

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username || `user_${address.substring(2, 6)}`,
      ensName: user.ensName,
      avatarUrl: user.avatarUrl,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      positions: formattedPositions,
      trades: user.trades,
      netWorth: 10000.0 + totalPositionValue + totalRealizedPnl - user.trades.filter((t) => t.type === 'BUY').reduce((sum, t) => sum + Number(t.amount), 0) + user.trades.filter((t) => t.type === 'SELL').reduce((sum, t) => sum + Number(t.amount), 0),
      unrealizedPnl: totalUnrealizedPnl,
      realizedPnl: totalRealizedPnl,
    };
  }

  async upsertUser(dto: UpsertUserDto) {
    const address = dto.walletAddress.toLowerCase();
    const defaultUsername = dto.username || `user_${address.substring(2, 6).toLowerCase()}`;
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return this.prisma.user.upsert({
      where: { walletAddress: address },
      update: {
        username: dto.username,
        ensName: dto.ensName,
        avatarUrl: dto.avatarUrl,
      },
      create: {
        walletAddress: address,
        username: defaultUsername,
        ensName: dto.ensName,
        avatarUrl: dto.avatarUrl,
        referralCode,
      },
    });
  }
}
