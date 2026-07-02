// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Referral is Ownable {
    // Events
    event ReferrerRegistered(address indexed user, address indexed referrer);
    event CommissionPaid(address indexed referrer, address indexed referee, uint256 commissionAmount);

    // Maps a user address to their referrer's address
    mapping(address => address) public referrers;
    // Maps a user to their total referrals count
    mapping(address => uint256) public referralsCount;
    // Commission rate in basis points (e.g. 500 = 5%)
    uint256 public commissionBasisPoints = 500;

    constructor() Ownable(msg.sender) {}

    function setCommissionBasisPoints(uint256 _rate) external onlyOwner {
        require(_rate <= 2000, "Referral: Max commission rate is 20%");
        commissionBasisPoints = _rate;
    }

    // Register user as referred by someone else
    function registerReferral(address user, address referrer) external {
        require(user != address(0), "Referral: Invalid user");
        require(referrer != address(0), "Referral: Invalid referrer");
        require(user != referrer, "Referral: Self referral invalid");
        require(referrers[user] == address(0), "Referral: Referrer already set");

        referrers[user] = referrer;
        referralsCount[referrer]++;

        emit ReferrerRegistered(user, referrer);
    }

    // Get commission payout calculation
    function getReferralCommission(address user, uint256 feePaid) external view returns (address referrer, uint256 commission) {
        address ref = referrers[user];
        if (ref == address(0)) {
            return (address(0), 0);
        }
        uint256 calculatedCommission = (feePaid * commissionBasisPoints) / 10000;
        return (ref, calculatedCommission);
    }
}
