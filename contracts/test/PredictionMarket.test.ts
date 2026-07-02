import { expect } from "chai";
import { ethers } from "hardhat";
import { MockERC20, Oracle, MarketFactory, PredictionMarket, AMM } from "../typechain-types";

describe("Polymarket Clone Prediction Market System", function () {
  let collateralToken: MockERC20;
  let oracle: Oracle;
  let factory: MarketFactory;
  let amm: AMM;
  let market: PredictionMarket;

  let owner: any;
  let resolver: any;
  let trader1: any;
  let trader2: any;
  let treasury: any;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const MARKET_ID = "election-2026-us";
  const MARKET_TITLE = "Will candidate X win the election?";
  const OUTCOMES = ["YES", "NO"];
  const FEE_BASIS_POINTS = 100; // 1%

  beforeEach(async function () {
    [owner, resolver, trader1, trader2, treasury] = await ethers.getSigners();

    // 1. Deploy Collateral Token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    collateralToken = await MockERC20Factory.deploy("USD Coin", "USDC", INITIAL_SUPPLY);

    // 2. Deploy Oracle
    const OracleFactory = await ethers.getContractFactory("Oracle");
    oracle = await OracleFactory.deploy();
    await oracle.setResolver(resolver.address, true);

    // 3. Deploy MarketFactory
    const MarketFactoryClass = await ethers.getContractFactory("MarketFactory");
    factory = await MarketFactoryClass.deploy(
      await collateralToken.getAddress(),
      await oracle.getAddress(),
      treasury.address,
      FEE_BASIS_POINTS
    );

    // 4. Deploy AMM
    const AMMFactory = await ethers.getContractFactory("AMM");
    amm = await AMMFactory.deploy(await collateralToken.getAddress());

    // Allocate funds to traders
    await collateralToken.mint(trader1.address, ethers.parseEther("10000"));
    await collateralToken.mint(trader2.address, ethers.parseEther("10000"));

    // Approve factory
    const endDate = Math.floor(Date.now() / 1000) + 3600 * 24 * 7; // 7 days from now
    await factory.createMarket(MARKET_ID, MARKET_TITLE, OUTCOMES, endDate);
    
    const marketAddress = await factory.getMarketById(MARKET_ID);
    const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarket");
    market = PredictionMarketFactory.attach(marketAddress) as PredictionMarket;

    // Approve market contract for traders
    await collateralToken.connect(trader1).approve(marketAddress, ethers.parseEther("100000"));
    await collateralToken.connect(trader2).approve(marketAddress, ethers.parseEther("100000"));
  });

  describe("Scaffolding & Deployments", function () {
    it("Should initialize market parameters correctly", async function () {
      expect(await market.marketId()).to.equal(MARKET_ID);
      expect(await market.title()).to.equal(MARKET_TITLE);
      expect(await market.outcomeCount()).to.equal(2);
      expect(await market.isResolved()).to.be.false;
    });

    it("Should support oracle updates by owner", async function () {
      expect(await factory.oracle()).to.equal(await oracle.getAddress());
    });
  });

  describe("Trading YES/NO Positions", function () {
    it("Should allow buying outcome shares", async function () {
      const buyAmount = ethers.parseEther("1000"); // 1000 USDC
      
      // Trader 1 buys YES shares (outcomeId = 0)
      await expect(market.connect(trader1).buyShares(0, buyAmount))
        .to.emit(market, "SharesBought");

      // Verify shares received
      const shares = await market.shareBalances(trader1.address, 0);
      expect(shares).to.be.greaterThan(0n);
      
      // Verify treasury received fee (1% fee)
      const treasuryBalance = await collateralToken.balanceOf(treasury.address);
      expect(treasuryBalance).to.equal(ethers.parseEther("10")); // 10 USDC fee
    });

    it("Should allow selling outcome shares before endDate", async function () {
      const buyAmount = ethers.parseEther("1000");
      await market.connect(trader1).buyShares(0, buyAmount);

      const initialShares = await market.shareBalances(trader1.address, 0);
      const sellShares = initialShares / 2n;

      await expect(market.connect(trader1).sellShares(0, sellShares))
        .to.emit(market, "SharesSold");

      const finalShares = await market.shareBalances(trader1.address, 0);
      expect(finalShares).to.equal(initialShares - sellShares);
    });
  });

  describe("Resolving Markets and Claiming Rewards", function () {
    it("Should transition and pay correct payouts upon Oracle resolution", async function () {
      const buyAmount = ethers.parseEther("1000");
      await market.connect(trader1).buyShares(0, buyAmount); // Buy YES shares

      // Setup Oracle resolution
      await oracle.connect(resolver).registerCustomResolution(MARKET_ID, "Election winner");
      await oracle.connect(resolver).resolveManually(MARKET_ID, 0); // YES wins!

      // Sync resolved state
      await expect(market.resolve())
        .to.emit(market, "MarketClosed")
        .withArgs(0n);

      expect(await market.isResolved()).to.be.true;
      expect(await market.winningOutcomeId()).to.equal(0n);

      // Claim payout
      const balanceBefore = await collateralToken.balanceOf(trader1.address);
      await expect(market.connect(trader1).claimRewards())
        .to.emit(market, "RewardsClaimed");

      const balanceAfter = await collateralToken.balanceOf(trader1.address);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
  });

  describe("AMM liquidity actions", function () {
    it("Should calculate pricing curve shift upon liquidity changes", async function () {
      await collateralToken.connect(trader1).approve(await amm.getAddress(), ethers.parseEther("100000"));
      await expect(amm.connect(trader1).addLiquidity(0, ethers.parseEther("5000")))
        .to.emit(amm, "LiquidityAdded");
        
      const reserve = await amm.poolCollateral(0);
      expect(reserve).to.equal(ethers.parseEther("5000"));
    });
  });
});
