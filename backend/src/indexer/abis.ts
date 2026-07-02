export const MARKET_FACTORY_ABI = [
  "event MarketCreated(string indexed marketId, address indexed marketAddress, string title, string[] outcomes, uint256 endDate, address creator)",
  "function allMarkets(uint256) view returns (address)",
  "function getMarketById(string) view returns (address)",
  "function getMarketsCount() view returns (uint256)"
];

export const PREDICTION_MARKET_ABI = [
  "event SharesBought(address indexed buyer, uint256 indexed outcomeId, uint256 amountSpent, uint256 sharesReceived, uint256 feePaid)",
  "event SharesSold(address indexed seller, uint256 indexed outcomeId, uint256 sharesSold, uint256 amountReturned, uint256 feePaid)",
  "event MarketClosed(uint256 winningOutcomeId)",
  "event RewardsClaimed(address indexed claimer, uint256 sharesRedeemed, uint256 collateralReceived)",
  
  "function marketId() view returns (string)",
  "function title() view returns (string)",
  "function endDate() view returns (uint256)",
  "function outcomeCount() view returns (uint256)",
  "function isResolved() view returns (bool)",
  "function winningOutcomeId() view returns (uint256)",
  "function getOutcomePrice(uint256) view returns (uint256)",
  "function outcomes(uint256) view returns (string name, uint256 totalShares)"
];
