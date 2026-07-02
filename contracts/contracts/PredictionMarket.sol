// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Oracle.sol";

contract PredictionMarket is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Structs
    struct Outcome {
        string name;
        uint256 totalShares;
    }

    // State Variables
    string public marketId;
    string public title;
    IERC20 public collateralToken;
    Oracle public oracle;
    
    uint256 public endDate;
    uint256 public outcomeCount;
    bool public isResolved;
    uint256 public winningOutcomeId;
    
    uint256 public feeBasisPoints; // 100 = 1%
    address public treasury;

    // Mappings
    mapping(uint256 => Outcome) public outcomes;
    // userAddress => outcomeId => shareAmount
    mapping(address => mapping(uint256 => uint256)) public shareBalances;
    
    // Total collateral locked in the market contract
    uint256 public totalCollateralLocked;

    // Events
    event SharesBought(address indexed buyer, uint256 indexed outcomeId, uint256 amountSpent, uint256 sharesReceived, uint256 feePaid);
    event SharesSold(address indexed seller, uint256 indexed outcomeId, uint256 sharesSold, uint256 amountReturned, uint256 feePaid);
    event MarketClosed(uint256 winningOutcomeId);
    event RewardsClaimed(address indexed claimer, uint256 sharesRedeemed, uint256 collateralReceived);

    constructor(
        string memory _marketId,
        string memory _title,
        address _collateralToken,
        address _oracle,
        string[] memory outcomeNames,
        uint256 _endDate,
        uint256 _feeBasisPoints,
        address _treasury,
        address _creator
    ) Ownable(_creator) {
        require(_endDate > block.timestamp, "PredictionMarket: End date must be in the future");
        require(_collateralToken != address(0), "PredictionMarket: Invalid collateral token");
        require(_oracle != address(0), "PredictionMarket: Invalid oracle");
        require(_treasury != address(0), "PredictionMarket: Invalid treasury");
        require(outcomeNames.length >= 2, "PredictionMarket: At least 2 outcomes required");

        marketId = _marketId;
        title = _title;
        collateralToken = IERC20(_collateralToken);
        oracle = Oracle(_oracle);
        endDate = _endDate;
        feeBasisPoints = _feeBasisPoints;
        treasury = _treasury;

        outcomeCount = outcomeNames.length;
        for (uint256 i = 0; i < outcomeNames.length; i++) {
            outcomes[i] = Outcome({
                name: outcomeNames[i],
                totalShares: 0
            });
        }
    }

    // Buy shares directly from the market (Simple Linear/Constant Pricing AMM simulation)
    // In production, pricing is calculated via AMM contract; we integrate basic pricing math here.
    function buyShares(uint256 outcomeId, uint256 collateralAmount) external nonReentrant whenNotPaused {
        require(block.timestamp < endDate, "PredictionMarket: Trading has ended");
        require(!isResolved, "PredictionMarket: Market is resolved");
        require(outcomeId < outcomeCount, "PredictionMarket: Invalid outcome");
        require(collateralAmount > 0, "PredictionMarket: Collateral must be > 0");

        // Transfer collateral
        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);

        // Deduct platform fee
        uint256 fee = (collateralAmount * feeBasisPoints) / 10000;
        uint256 netCollateral = collateralAmount - fee;
        if (fee > 0) {
            collateralToken.safeTransfer(treasury, fee);
        }

        // Price mapping calculation (Logarithmic / Constant Sum Product simulation)
        // Standard simplified formula: sharesReceived = netCollateral * (1 / Price)
        // Here we simulate price based on demand. Current price is (shares of this outcome) / (total shares + 1)
        uint256 price = getOutcomePrice(outcomeId);
        uint256 sharesReceived = (netCollateral * 1e18) / price;

        shareBalances[msg.sender][outcomeId] += sharesReceived;
        outcomes[outcomeId].totalShares += sharesReceived;
        totalCollateralLocked += netCollateral;

        emit SharesBought(msg.sender, outcomeId, collateralAmount, sharesReceived, fee);
    }

    // Sell shares back to the contract before resolution
    function sellShares(uint256 outcomeId, uint256 sharesToSell) external nonReentrant whenNotPaused {
        require(block.timestamp < endDate, "PredictionMarket: Trading has ended");
        require(!isResolved, "PredictionMarket: Market is resolved");
        require(outcomeId < outcomeCount, "PredictionMarket: Invalid outcome");
        require(shareBalances[msg.sender][outcomeId] >= sharesToSell, "PredictionMarket: Insufficient balance");

        uint256 price = getOutcomePrice(outcomeId);
        uint256 collateralReturned = (sharesToSell * price) / 1e18;
        require(collateralReturned <= totalCollateralLocked, "PredictionMarket: Insufficient liquidity");

        // Deduct platform fee on sell
        uint256 fee = (collateralReturned * feeBasisPoints) / 10000;
        uint256 netCollateral = collateralReturned - fee;

        shareBalances[msg.sender][outcomeId] -= sharesToSell;
        outcomes[outcomeId].totalShares -= sharesToSell;
        totalCollateralLocked -= collateralReturned;

        if (fee > 0) {
            collateralToken.safeTransfer(treasury, fee);
        }
        collateralToken.safeTransfer(msg.sender, netCollateral);

        emit SharesSold(msg.sender, outcomeId, sharesToSell, netCollateral, fee);
    }

    // Sync resolution state with the Oracle
    function resolve() external nonReentrant {
        require(!isResolved, "PredictionMarket: Already resolved");
        
        (bool resolved, uint256 outcomeId) = oracle.getResolution(marketId);
        require(resolved, "PredictionMarket: Oracle has not resolved this market");
        require(outcomeId < outcomeCount, "PredictionMarket: Invalid resolved outcome");

        isResolved = true;
        winningOutcomeId = outcomeId;

        emit MarketClosed(winningOutcomeId);
    }

    // Claim rewards for the winning outcome shares post-resolution
    function claimRewards() external nonReentrant {
        require(isResolved, "PredictionMarket: Market is not resolved yet");
        uint256 winningShares = shareBalances[msg.sender][winningOutcomeId];
        require(winningShares > 0, "PredictionMarket: No winning shares to claim");

        // User gets proportional share of the total collateral pool
        // Proportional payout: collateralReceived = (userWinningShares / totalWinningShares) * totalCollateralLocked
        uint256 totalWinningShares = outcomes[winningOutcomeId].totalShares;
        uint256 payout = (winningShares * totalCollateralLocked) / totalWinningShares;

        shareBalances[msg.sender][winningOutcomeId] = 0;
        totalCollateralLocked -= payout;

        collateralToken.safeTransfer(msg.sender, payout);

        emit RewardsClaimed(msg.sender, winningShares, payout);
    }

    // Dynamic price estimation based on demand
    // Outcome price in decimals (1e18 represents $1.00)
    function getOutcomePrice(uint256 outcomeId) public view returns (uint256) {
        uint256 targetShares = outcomes[outcomeId].totalShares;
        uint256 sumShares = 0;
        for (uint256 i = 0; i < outcomeCount; i++) {
            sumShares += outcomes[i].totalShares;
        }

        if (sumShares == 0) {
            return 1e18 / outcomeCount; // Equidistributed price (e.g. 0.50 for YES/NO)
        }

        // Price = (targetShares / sumShares) with bounds (0.02 to 0.98) to protect from extreme slippage
        uint256 rawPrice = (targetShares * 1e18) / sumShares;
        if (rawPrice < 0.02 * 1e18) return 0.02 * 1e18;
        if (rawPrice > 0.98 * 1e18) return 0.98 * 1e18;
        return rawPrice;
    }

    // Admin commands
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
