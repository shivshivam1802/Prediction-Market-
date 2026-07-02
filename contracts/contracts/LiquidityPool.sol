// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event Deposited(address indexed provider, uint256 amount, uint256 poolSharesMinted);
    event Withdrawn(address indexed provider, uint256 amount, uint256 poolSharesBurned);
    event YieldDistributed(uint256 amount);

    IERC20 public collateralToken;
    
    uint256 public totalPoolShares;
    uint256 public totalCollateralDeposited;

    mapping(address => uint256) public providerShares;

    constructor(address _collateralToken) Ownable(msg.sender) {
        collateralToken = IERC20(_collateralToken);
    }

    // Deposit USDC/Collateral into the platform wide liquidity reserve
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "LiquidityPool: Amount must be > 0");

        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 sharesToMint;
        if (totalPoolShares == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalPoolShares) / totalCollateralDeposited;
        }

        providerShares[msg.sender] += sharesToMint;
        totalPoolShares += sharesToMint;
        totalCollateralDeposited += amount;

        emit Deposited(msg.sender, amount, sharesToMint);
    }

    // Withdraw collateral and yield fees
    function withdraw(uint256 shares) external nonReentrant {
        require(shares > 0, "LiquidityPool: Shares must be > 0");
        require(providerShares[msg.sender] >= shares, "LiquidityPool: Insufficient shares");

        uint256 amountToReturn = (shares * totalCollateralDeposited) / totalPoolShares;

        providerShares[msg.sender] -= shares;
        totalPoolShares -= shares;
        totalCollateralDeposited -= amountToReturn;

        collateralToken.safeTransfer(msg.sender, amountToReturn);

        emit Withdrawn(msg.sender, amountToReturn, shares);
    }

    // Allocate trading fee payouts from prediction transactions back to the LP pool
    function distributeYield(uint256 amount) external onlyOwner {
        require(amount > 0, "LiquidityPool: Distribute amount must be > 0");
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        totalCollateralDeposited += amount;

        emit YieldDistributed(amount);
    }
}
