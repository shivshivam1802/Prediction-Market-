// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    event CollateralWithdrawn(address indexed token, address indexed recipient, uint256 amount);
    event PlatformFeeUpdated(uint256 newFeeBasisPoints);

    uint256 public platformFeeBasisPoints; // e.g. 100 = 1%
    
    constructor(uint256 _initialFeeBasisPoints) Ownable(msg.sender) {
        platformFeeBasisPoints = _initialFeeBasisPoints;
    }

    function updateFee(uint256 _newFeeBasisPoints) external onlyOwner {
        require(_newFeeBasisPoints <= 500, "Treasury: Max fee is 5%");
        platformFeeBasisPoints = _newFeeBasisPoints;
        emit PlatformFeeUpdated(_newFeeBasisPoints);
    }

    function withdraw(address token, address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Treasury: Invalid recipient");
        require(amount > 0, "Treasury: Amount must be > 0");

        IERC20(token).safeTransfer(recipient, amount);
        emit CollateralWithdrawn(token, recipient, amount);
    }

    // Allows direct ETH withdrawals if native is sent
    function withdrawNative(address payable recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Treasury: Invalid recipient");
        require(amount <= address(this).balance, "Treasury: Insufficient balance");
        
        recipient.transfer(amount);
    }

    receive() external payable {}
}
