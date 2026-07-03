'use client';

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MarketCard from './components/MarketCard';
import MarketDetailModal from './components/MarketDetailModal';
import PortfolioTab from './components/PortfolioTab';
import LeaderboardTab from './components/LeaderboardTab';
import ActivityTab from './components/ActivityTab';
import AdminTab from './components/AdminTab';
import { Search, Compass, TrendingUp, Info } from 'lucide-react';

interface Outcome {
  id: string;
  name: string;
  price: number;
}

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  endDate: string;
  totalVolume: number;
  outcomes: Outcome[];
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('markets');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState(10000.0); // Starts with 10k USDC demo funds
  
  // Market listings state
  const [markets, setMarkets] = useState<Market[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Selected Market for detailed modal view
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  // Trigger list refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchMarkets();
  }, [selectedCategory, searchQuery, refreshTrigger]);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:3001/api/markets';
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMarkets(data);
      }
    } catch (err) {
      console.error('Failed to fetch markets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTrade = (marketId: string, outcomeId: string, outcomeName: string) => {
    // Open detailed modal so they can review slippage & execute trade
    setSelectedMarketId(marketId);
  };

  const handleTradeSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const trendingMarket = markets.find((m) => m.status === 'ACTIVE') || markets[0];

  return (
    <div className="flex flex-col min-h-screen text-foreground relative pb-16">
      
      {/* Header component */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        walletAddress={walletAddress}
        setWalletAddress={setWalletAddress}
        usdcBalance={usdcBalance}
        setUsdcBalance={setUsdcBalance}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
      />

      {/* Main Container */}
      <main className="flex-grow px-6 md:px-12 py-8 max-w-7xl mx-auto w-full">
        
        {activeTab === 'markets' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            
            {/* Featured Hero Banner */}
            {trendingMarket && (
              <div 
                onClick={() => setSelectedMarketId(trendingMarket.id)}
                className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-blue-600/90 to-indigo-700/90 hover:from-blue-600 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/10 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6 transition-all border border-blue-500/20"
              >
                <div className="flex flex-col gap-2.5 max-w-xl text-left">
                  <div className="flex items-center gap-1.5 text-xs text-blue-200 font-bold uppercase tracking-widest">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Trending Prediction</span>
                  </div>
                  <h2 className="text-xl md:text-3xl font-black tracking-tight leading-tight">
                    {trendingMarket.title}
                  </h2>
                  <p className="text-sm text-blue-100 font-medium line-clamp-2 mt-1">
                    {trendingMarket.description}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur border border-white/15 px-6 py-4.5 rounded-2xl shrink-0 text-center min-w-[200px]">
                  <span className="text-xs text-blue-200 font-bold uppercase tracking-widest">YES probability</span>
                  <span className="text-4xl font-black">
                    {(Number(trendingMarket.outcomes?.[0]?.price || 0.5) * 100).toFixed(0)}%
                  </span>
                  <span className="text-[11px] text-blue-100 font-bold">
                    Vol: ${(Number(trendingMarket.totalVolume)).toLocaleString()} USDC
                  </span>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Category selector */}
              <div className="flex flex-wrap items-center gap-1.5 bg-card/25 border border-border rounded-xl p-1 w-full sm:w-auto">
                {['ALL', 'CRYPTO', 'AI', 'POLITICS', 'SPORTS', 'BUSINESS'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-secondary hover:text-foreground hover:bg-border/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                <input
                  type="text"
                  placeholder="Search prediction markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/30 focus:outline-none focus:border-primary text-sm text-foreground placeholder:text-secondary"
                />
              </div>
            </div>

            {/* Grid layout of market cards */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-secondary font-semibold">Updating market positions...</span>
              </div>
            ) : markets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {markets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onClick={() => setSelectedMarketId(market.id)}
                    onQuickTrade={handleQuickTrade}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 rounded-3xl border border-border bg-card/10 text-secondary text-sm font-semibold flex flex-col gap-2">
                <span>No prediction markets found matches parameters.</span>
                <span className="text-xs font-medium text-secondary/60">Try clearing filters or search strings.</span>
              </div>
            )}

          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          walletAddress ? (
            <PortfolioTab
              walletAddress={walletAddress}
              usdcBalance={usdcBalance}
              onMarketSelect={(id) => {
                if (id) {
                  setSelectedMarketId(id);
                } else {
                  setActiveTab('markets');
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-3xl p-8 max-w-md mx-auto">
              <Compass className="w-12 h-12 text-secondary/50 mb-3" />
              <h3 className="font-bold text-lg text-foreground">Connect Demo Wallet</h3>
              <p className="text-sm text-secondary mt-1.5 mb-6">
                Connect a simulated wallet account in the top-right widget to inspect positions and manage custom holdings.
              </p>
              <button
                onClick={() => {
                  setWalletAddress('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
                  setIsAdmin(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer"
              >
                Connect Demo Trader
              </button>
            </div>
          )
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && <LeaderboardTab />}

        {/* Activity Tab */}
        {activeTab === 'activity' && <ActivityTab />}

        {/* Admin Panel Tab */}
        {activeTab === 'admin' && walletAddress && (
          <AdminTab
            walletAddress={walletAddress}
            onMarketCreated={handleTradeSuccess}
          />
        )}

      </main>

      {/* Detailed Modal Overlay */}
      {selectedMarketId && (
        <MarketDetailModal
          marketId={selectedMarketId}
          onClose={() => setSelectedMarketId(null)}
          walletAddress={walletAddress}
          usdcBalance={usdcBalance}
          setUsdcBalance={setUsdcBalance}
          onTradeSuccess={handleTradeSuccess}
        />
      )}

      {/* Floating disclaimer footer */}
      <footer className="w-full text-center text-[10px] text-secondary font-semibold py-4 border-t border-border mt-12 bg-card/5">
        POLYPREDICT DEMO PLATFORM • COMPILED WITH SOLIDITY SMART CONTRACTS ON LOCAL RPC NETWORKS OR REST FALLBACKS
      </footer>

    </div>
  );
}
