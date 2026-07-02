// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PredictionMarket.sol";

contract MarketFactory is Ownable {
    // Events
    event MarketCreated(
        string indexed marketId,
        address indexed marketAddress,
        string title,
        string[] outcomes,
        uint256 endDate,
        address creator
    );

    // State Variables
    address public collateralToken;
    address public oracle;
    address public treasury;
    uint256 public feeBasisPoints; // Default platform fee e.g. 100 = 1%

    address[] public allMarkets;
    mapping(string => address) public getMarketById;

    constructor(
        address _collateralToken,
        address _oracle,
        address _treasury,
        uint256 _feeBasisPoints
    ) Ownable(msg.sender) {
        require(_collateralToken != address(0), "MarketFactory: Invalid collateral");
        require(_oracle != address(0), "MarketFactory: Invalid oracle");
        require(_treasury != address(0), "MarketFactory: Invalid treasury");

        collateralToken = _collateralToken;
        oracle = _oracle;
        treasury = _treasury;
        feeBasisPoints = _feeBasisPoints;
    }

    function setFeeBasisPoints(uint256 _feeBasisPoints) external onlyOwner {
        require(_feeBasisPoints <= 1000, "MarketFactory: Fee too high"); // Max 10%
        feeBasisPoints = _feeBasisPoints;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "MarketFactory: Invalid treasury");
        treasury = _treasury;
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "MarketFactory: Invalid oracle");
        oracle = _oracle;
    }

    function createMarket(
        string calldata marketId,
        string calldata title,
        string[] calldata outcomeNames,
        uint256 endDate
    ) external returns (address) {
        require(getMarketById[marketId] == address(0), "MarketFactory: Market ID already exists");
        require(endDate > block.timestamp, "MarketFactory: End date must be in the future");

        PredictionMarket market = new PredictionMarket(
            marketId,
            title,
            collateralToken,
            oracle,
            outcomeNames,
            endDate,
            feeBasisPoints,
            treasury,
            msg.sender
        );

        address marketAddress = address(market);
        allMarkets.push(marketAddress);
        getMarketById[marketId] = marketAddress;

        emit MarketCreated(
            marketId,
            marketAddress,
            title,
            outcomeNames,
            endDate,
            msg.sender
        );

        return marketAddress;
    }

    function getMarketsCount() external view returns (uint256) {
        return allMarkets.length;
    }
}
