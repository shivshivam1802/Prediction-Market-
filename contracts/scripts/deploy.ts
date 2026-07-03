import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of Polymarket prediction market system...");

  const [deployer, resolver, treasury] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // 1. Deploy Mock Collateral Token (USDC)
  const initialSupply = ethers.parseEther("10000000"); // 10 Million USDC
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const collateralToken = await MockERC20.deploy("USD Coin", "USDC", initialSupply);
  await collateralToken.waitForDeployment();
  const tokenAddress = await collateralToken.getAddress();
  console.log(`MockERC20 (USDC) deployed to: ${tokenAddress}`);

  // 2. Deploy Oracle
  const Oracle = await ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`Oracle deployed to: ${oracleAddress}`);

  // Set resolver
  await oracle.setResolver(deployer.address, true);
  console.log(`Set resolver authorization for: ${deployer.address}`);

  // 3. Deploy MarketFactory
  const feeBasisPoints = 100; // 1%
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(
    tokenAddress,
    oracleAddress,
    treasury.address,
    feeBasisPoints
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`MarketFactory deployed to: ${factoryAddress}`);

  // 4. Deploy AMM
  const AMM = await ethers.getContractFactory("AMM");
  const amm = await AMM.deploy(tokenAddress);
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  console.log(`AMM deployed to: ${ammAddress}`);

  // Create sample markets on chain
  console.log("Creating on-chain prediction markets...");
  const SECONDS_IN_A_DAY = 86400;
  const endDate1 = Math.floor(Date.now() / 1000) + SECONDS_IN_A_DAY * 180; // 180 days from now
  const endDate2 = Math.floor(Date.now() / 1000) + SECONDS_IN_A_DAY * 120; // 120 days from now
  const endDate3 = Math.floor(Date.now() / 1000) + SECONDS_IN_A_DAY * 90; // 90 days from now

  // Market 1: Bitcoin price
  await factory.createMarket(
    "btc-100k-2026",
    "Will Bitcoin reach $100,000 in 2026?",
    ["YES", "NO"],
    endDate1
  );
  const market1Address = await factory.getMarketById("btc-100k-2026");
  console.log(`Market 1 (BTC $100k) created at: ${market1Address}`);

  // Register resolutions in Oracle
  await oracle.registerCustomResolution("btc-100k-2026", "Resolves to YES if BTC hits $100,000 on or before December 31, 2026.");

  // Market 2: AGI breakthrough
  await factory.createMarket(
    "agi-late-2026",
    "Will AI achieve general intelligence (AGI) by late 2026?",
    ["YES", "NO"],
    endDate2
  );
  const market2Address = await factory.getMarketById("agi-late-2026");
  console.log(`Market 2 (AGI 2026) created at: ${market2Address}`);
  await oracle.registerCustomResolution("agi-late-2026", "Resolves to YES if OpenAI, Anthropic, or Google DeepMind announces public deployment of AGI.");

  // Market 3: Tech Valuation Race
  await factory.createMarket(
    "tech-4t-valuation",
    "Who will win the next tech company race to a $4T valuation?",
    ["NVIDIA", "Microsoft", "Apple", "Alphabet"],
    endDate3
  );
  const market3Address = await factory.getMarketById("tech-4t-valuation");
  console.log(`Market 3 ($4T Valuation) created at: ${market3Address}`);
  await oracle.registerCustomResolution("tech-4t-valuation", "Resolves to the first company to close at a $4T market capitalization.");

  console.log("\nSummary of deployed addresses:");
  console.log(`USDC Token:     ${tokenAddress}`);
  console.log(`Oracle:         ${oracleAddress}`);
  console.log(`MarketFactory:  ${factoryAddress}`);
  console.log(`AMM:            ${ammAddress}`);
  console.log("Deployment and seeding completed successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
