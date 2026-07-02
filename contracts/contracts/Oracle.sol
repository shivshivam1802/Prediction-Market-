// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IChainlinkAggregator {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract Oracle is Ownable {
    // Events
    event FeedRegistered(string marketId, address feedAddress);
    event CustomResolutionRequested(string marketId, string description);
    event MarketResolved(string marketId, uint256 finalOutcomeId);
    event MarketDisputed(string marketId);
    event DisputeResolved(string marketId, uint256 finalOutcomeId);

    struct MarketResolutionInfo {
        bool isCustom;
        bool isResolved;
        bool isDisputed;
        uint256 resolvedOutcomeId;
        address chainlinkFeed;
        string description;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    // Mapping from market ID to its resolution configuration
    mapping(string => MarketResolutionInfo) public marketsResolution;
    
    // Admins authorized to resolve custom markets
    mapping(address => bool) public authorizedResolvers;

    modifier onlyResolver() {
        require(msg.sender == owner() || authorizedResolvers[msg.sender], "Oracle: Unauthorized resolver");
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedResolvers[msg.sender] = true;
    }

    function setResolver(address resolver, bool status) external onlyOwner {
        authorizedResolvers[resolver] = status;
    }

    // Register a standard Chainlink oracle feed for automated resolution
    function registerChainlinkFeed(string calldata marketId, address feedAddress) external onlyResolver {
        require(feedAddress != address(0), "Oracle: Invalid feed address");
        marketsResolution[marketId] = MarketResolutionInfo({
            isCustom: false,
            isResolved: false,
            isDisputed: false,
            resolvedOutcomeId: 0,
            chainlinkFeed: feedAddress,
            description: "",
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        emit FeedRegistered(marketId, feedAddress);
    }

    // Register a custom market requiring manual/multisig resolution
    function registerCustomResolution(string calldata marketId, string calldata description) external onlyResolver {
        marketsResolution[marketId] = MarketResolutionInfo({
            isCustom: true,
            isResolved: false,
            isDisputed: false,
            resolvedOutcomeId: 0,
            chainlinkFeed: address(0),
            description: description,
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        emit CustomResolutionRequested(marketId, description);
    }

    // Resolve via automated Chainlink price feed checking
    function resolveWithChainlink(string calldata marketId, int256 priceThreshold, bool resolveAbove) external {
        MarketResolutionInfo storage info = marketsResolution[marketId];
        require(!info.isResolved, "Oracle: Already resolved");
        require(!info.isCustom, "Oracle: Custom market");
        require(info.chainlinkFeed != address(0), "Oracle: No feed registered");

        (, int256 latestPrice, , , ) = IChainlinkAggregator(info.chainlinkFeed).latestRoundData();
        
        uint256 outcome;
        if (resolveAbove) {
            outcome = latestPrice >= priceThreshold ? 1 : 0; // 1 = YES, 0 = NO
        } else {
            outcome = latestPrice < priceThreshold ? 1 : 0;
        }

        info.isResolved = true;
        info.resolvedOutcomeId = outcome;
        info.resolvedAt = block.timestamp;

        emit MarketResolved(marketId, outcome);
    }

    // Resolve manually by authorized resolver/multisig admin
    function resolveManually(string calldata marketId, uint256 outcomeId) external onlyResolver {
        MarketResolutionInfo storage info = marketsResolution[marketId];
        require(!info.isResolved, "Oracle: Already resolved");
        
        info.isResolved = true;
        info.resolvedOutcomeId = outcomeId;
        info.resolvedAt = block.timestamp;

        emit MarketResolved(marketId, outcomeId);
    }

    // Flag market as disputed
    function disputeMarket(string calldata marketId) external {
        MarketResolutionInfo storage info = marketsResolution[marketId];
        require(info.isResolved, "Oracle: Market not resolved yet");
        require(!info.isDisputed, "Oracle: Already disputed");
        require(block.timestamp - info.resolvedAt <= 1 days, "Oracle: Dispute window closed");

        info.isDisputed = true;
        emit MarketDisputed(marketId);
    }

    // Resolve dispute by admin/multisig
    function resolveDispute(string calldata marketId, uint256 correctedOutcomeId) external onlyResolver {
        MarketResolutionInfo storage info = marketsResolution[marketId];
        require(info.isDisputed, "Oracle: Market is not disputed");
        
        info.isDisputed = false;
        info.resolvedOutcomeId = correctedOutcomeId;
        info.resolvedAt = block.timestamp;

        emit DisputeResolved(marketId, correctedOutcomeId);
    }

    // View function to check if resolved and what outcome
    function getResolution(string calldata marketId) external view returns (bool resolved, uint256 outcomeId) {
        MarketResolutionInfo memory info = marketsResolution[marketId];
        return (info.isResolved && !info.isDisputed, info.resolvedOutcomeId);
    }
}
