import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding prediction markets SQLite database...');

  // Clear existing data
  await prisma.commentLike.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.trade.deleteMany({});
  await prisma.position.deleteMany({});
  await prisma.outcome.deleteMany({});
  await prisma.market.deleteMany({});
  await prisma.user.deleteMany({});

  // Mock Admin & Users
  const adminUser = await prisma.user.create({
    data: {
      walletAddress: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', // Hardhat Account #0 (lowercased)
      ensName: 'admin.eth',
      username: 'platformadmin',
      referralCode: 'PLATFORM10',
    },
  });

  const traderUser = await prisma.user.create({
    data: {
      walletAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', // Hardhat Account #1 (lowercased)
      ensName: 'trader.eth',
      username: 'marketmaker',
      referralCode: 'TRADER55',
    },
  });

  // Mock Markets
  const marketsData = [
    {
      contractAddress: '0x1111111111111111111111111111111111111111',
      title: 'Will Bitcoin reach $100,000 in 2026?',
      description: 'BTC price prediction market. Resolves to YES if BTC hits $100,000 on or before December 31, 2026.',
      category: 'CRYPTO',
      type: 'YES_NO',
      status: 'ACTIVE',
      endDate: new Date('2026-12-31T23:59:59Z'),
      oracleSource: 'Chainlink BTC/USD Feed',
      rules: 'This market resolves to YES if Bitcoin trades at or above $100,000.00 according to the Chainlink BTC/USD price feed on or before December 31, 2026.',
      resolutionMethod: 'Chainlink Price Feed',
      creatorAddress: adminUser.walletAddress,
      tags: 'bitcoin,crypto,price',
      outcomes: ['YES', 'NO'],
      prices: [0.65, 0.35],
    },
    {
      contractAddress: '0x2222222222222222222222222222222222222222',
      title: 'Will AI achieve general intelligence (AGI) by late 2026?',
      description: 'AI breakthrough prediction. Resolves to YES if leading tech institutions reach consensus on AGI implementation.',
      category: 'AI',
      type: 'YES_NO',
      status: 'ACTIVE',
      endDate: new Date('2026-11-30T23:59:59Z'),
      oracleSource: 'Major news consensus (OpenAI, Anthropic, Google DeepMind announcements)',
      rules: 'This market resolves to YES if OpenAI, Anthropic, or Google DeepMind announces public deployment or research consensus of an artificial general intelligence model.',
      resolutionMethod: 'Consensus news resolution',
      creatorAddress: adminUser.walletAddress,
      tags: 'ai,technology,future',
      outcomes: ['YES', 'NO'],
      prices: [0.42, 0.58],
    },
    {
      contractAddress: '0x3333333333333333333333333333333333333333',
      title: 'Who will win the next tech company race to a $4T valuation?',
      description: 'Business valuation predictions for Apple, Microsoft, NVIDIA, and Alphabet.',
      category: 'BUSINESS',
      type: 'MULTIPLE_CHOICE',
      status: 'ACTIVE',
      endDate: new Date('2026-10-15T23:59:59Z'),
      oracleSource: 'Yahoo Finance Market Capitalization data',
      rules: 'Resolves to the first company to reach and close at a market capitalization of $4 Trillion USD on the NASDAQ or NYSE exchange.',
      resolutionMethod: 'Market cap close prices',
      creatorAddress: adminUser.walletAddress,
      tags: 'stocks,business,valuation',
      outcomes: ['NVIDIA', 'Microsoft', 'Apple', 'Alphabet'],
      prices: [0.45, 0.25, 0.20, 0.10],
    },
  ];

  for (const data of marketsData) {
    const market = await prisma.market.create({
      data: {
        contractAddress: data.contractAddress,
        title: data.title,
        description: data.description,
        category: data.category,
        type: data.type,
        status: data.status,
        endDate: data.endDate,
        oracleSource: data.oracleSource,
        rules: data.rules,
        resolutionMethod: data.resolutionMethod,
        creatorAddress: data.creatorAddress,
        tags: data.tags,
        totalVolume: 50000.0,
        openInterest: 25000.0,
        tvl: 12500.0,
      },
    });

    for (let i = 0; i < data.outcomes.length; i++) {
      await prisma.outcome.create({
        data: {
          marketId: market.id,
          name: data.outcomes[i],
          price: data.prices[i],
          totalShares: 10000.0,
        },
      });
    }
  }

  // Create a sample comment
  const btcMarket = await prisma.market.findFirst({
    where: { title: { contains: 'Bitcoin' } }
  });

  if (btcMarket) {
    await prisma.comment.create({
      data: {
        marketId: btcMarket.id,
        userId: traderUser.id,
        content: 'Bitcoin is definitely hitting 100k! The institutional flow is just too strong.',
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
