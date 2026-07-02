// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardDistributor is Ownable {
    using SafeERC20 for IERC20;

    event RewardsAllocated(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    IERC20 public rewardToken;
    
    mapping(address => uint256) public rewardBalances;
    uint256 public totalAllocatedRewards;

    constructor(address _rewardToken) Ownable(msg.sender) {
        require(_rewardToken != address(0), "RewardDistributor: Invalid token");
        rewardToken = IERC20(_rewardToken);
    }

    // Allocate incentives (called by backend sync admin/automated rule scripts)
    function allocateRewards(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "RewardDistributor: Invalid user");
        require(amount > 0, "RewardDistributor: Amount must be > 0");

        rewardBalances[user] += amount;
        totalAllocatedRewards += amount;

        emit RewardsAllocated(user, amount);
    }

    // Claim rewards to user wallet
    function claimRewards() external {
        uint256 rewards = rewardBalances[msg.sender];
        require(rewards > 0, "RewardDistributor: No rewards to claim");
        require(rewardToken.balanceOf(address(this)) >= rewards, "RewardDistributor: Insufficient pool balance");

        rewardBalances[msg.sender] = 0;
        totalAllocatedRewards -= rewards;

        rewardToken.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }
}
