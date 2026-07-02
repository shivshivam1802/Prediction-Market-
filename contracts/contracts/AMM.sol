// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AMM is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event LiquidityAdded(address indexed provider, uint256 outcomeId, uint256 collateralAmount, uint256 sharesMinted);
    event LiquidityRemoved(address indexed provider, uint256 outcomeId, uint256 sharesBurned, uint256 collateralReturned);
    event Swapped(address indexed swapper, uint256 indexed outcomeId, bool isBuy, uint256 collateralAmount, uint256 shareAmount);

    IERC20 public collateralToken;
    
    // Outcome ID => Liquidity Pool balance
    mapping(uint256 => uint256) public poolCollateral;
    mapping(uint256 => uint256) public poolShares;
    
    // Provider address => Outcome ID => liquidity shares
    mapping(address => mapping(uint256 => uint256)) public liquidityProviderShares;
    mapping(uint256 => uint256) public totalLiquidityShares;

    constructor(address _collateralToken) Ownable(msg.sender) {
        collateralToken = IERC20(_collateralToken);
    }

    // Add liquidity to a specific outcome market pool
    function addLiquidity(uint256 outcomeId, uint256 collateralAmount) external nonReentrant {
        require(collateralAmount > 0, "AMM: Collateral must be > 0");

        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);

        uint256 sharesToMint;
        if (totalLiquidityShares[outcomeId] == 0) {
            sharesToMint = collateralAmount; // 1:1 initial liquidity
        } else {
            sharesToMint = (collateralAmount * totalLiquidityShares[outcomeId]) / poolCollateral[outcomeId];
        }

        poolCollateral[outcomeId] += collateralAmount;
        // Simulate printing backing outcome shares
        poolShares[outcomeId] += collateralAmount; 

        liquidityProviderShares[msg.sender][outcomeId] += sharesToMint;
        totalLiquidityShares[outcomeId] += sharesToMint;

        emit LiquidityAdded(msg.sender, outcomeId, collateralAmount, sharesToMint);
    }

    // Remove liquidity and claim collateral share
    function removeLiquidity(uint256 outcomeId, uint256 lpShares) external nonReentrant {
        require(lpShares > 0, "AMM: LP shares must be > 0");
        require(liquidityProviderShares[msg.sender][outcomeId] >= lpShares, "AMM: Insufficient LP shares");

        uint256 collateralToReturn = (lpShares * poolCollateral[outcomeId]) / totalLiquidityShares[outcomeId];

        liquidityProviderShares[msg.sender][outcomeId] -= lpShares;
        totalLiquidityShares[outcomeId] -= lpShares;
        
        poolCollateral[outcomeId] -= collateralToReturn;
        poolShares[outcomeId] -= collateralToReturn;

        collateralToken.safeTransfer(msg.sender, collateralToReturn);

        emit LiquidityRemoved(msg.sender, outcomeId, lpShares, collateralToReturn);
    }

    // Calculate dynamic swap output based on Constant Product AMM (x * y = k)
    // x = collateral reserve, y = shares reserve
    function getSwapAmountOut(uint256 outcomeId, uint256 collateralIn, bool isBuy) public view returns (uint256) {
        uint256 reserveCollateral = poolCollateral[outcomeId];
        uint256 reserveShares = poolShares[outcomeId];

        if (reserveCollateral == 0 || reserveShares == 0) {
            return collateralIn; // 1:1 if empty
        }

        if (isBuy) {
            // User puts in collateral, gets shares
            // reserveCollateral * reserveShares = (reserveCollateral + collateralIn) * (reserveShares - sharesOut)
            uint256 numerator = collateralIn * reserveShares;
            uint256 denominator = reserveCollateral + collateralIn;
            return numerator / denominator;
        } else {
            // User puts in shares, gets collateral
            uint256 numerator = collateralIn * reserveCollateral;
            uint256 denominator = reserveShares + collateralIn;
            return numerator / denominator;
        }
    }

    // Execute swap inside the AMM
    function swap(uint256 outcomeId, uint256 collateralIn, bool isBuy) external nonReentrant returns (uint256) {
        require(collateralIn > 0, "AMM: Swap amount must be > 0");
        
        uint256 amountOut = getSwapAmountOut(outcomeId, collateralIn, isBuy);
        
        if (isBuy) {
            collateralToken.safeTransferFrom(msg.sender, address(this), collateralIn);
            poolCollateral[outcomeId] += collateralIn;
            poolShares[outcomeId] -= amountOut;
        } else {
            // In a sell swap, the user provides shares, but since shares are tracked inside PredictionMarket,
            // we simulate receiving the collateral backing value.
            require(poolCollateral[outcomeId] >= amountOut, "AMM: Insufficient pool liquidity");
            poolCollateral[outcomeId] -= amountOut;
            poolShares[outcomeId] += collateralIn;
            collateralToken.safeTransfer(msg.sender, amountOut);
        }

        emit Swapped(msg.sender, outcomeId, isBuy, collateralIn, amountOut);
        return amountOut;
    }
}
