'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, ArrowUpRight, ArrowDownRight, Wallet, History, ExternalLink } from 'lucide-react';

interface Position {
  id: string;
  marketId: string;
  marketTitle: string;
  marketContractAddress: string;
  marketStatus: string;
  outcomeId: string;
  outcomeName: string;
  sharesOwned: number;
  averageBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
}

interface Trade {
  id: string;
  txHash: string;
  market: { title: string };
  outcome: { name: string };
  type: string;
  amount: number;
  shares: number;
  pricePaid: number;
  timestamp: string;
}

interface Profile {
  walletAddress: string;
  username: string;
  netWorth: number;
  unrealizedPnl: number;
  realizedPnl: number;
  positions: Position[];
  trades: Trade[];
}

interface PortfolioTabProps {
  walletAddress: string;
  usdcBalance: number;
  onMarketSelect: (marketId: string) => void;
}

export default function PortfolioTab({ walletAddress, usdcBalance, onMarketSelect }: PortfolioTabProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [walletAddress, usdcBalance]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/users/${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-foreground gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Fetching portfolio metrics...</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Net Worth */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-bold uppercase tracking-wider">Estimated Net Worth</span>
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-foreground">
            ${(usdcBalance + profile.positions.reduce((sum, p) => sum + p.currentValue, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="text-[11px] text-secondary">
            Wallet Balance + Open Positions Value
          </div>
        </div>

        {/* Wallet USDC Balance */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-bold uppercase tracking-wider">Wallet Balance</span>
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-foreground">
            ${usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="text-[11px] text-secondary font-semibold text-accent-green">
            Demo Funds Active
          </div>
        </div>

        {/* Unrealized PnL */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-bold uppercase tracking-wider">Unrealized P&L</span>
            {profile.unrealizedPnl >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-accent-green" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-accent-red" />
            )}
          </div>
          <span className={`text-2xl font-black ${
            profile.unrealizedPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
          }`}>
            {profile.unrealizedPnl >= 0 ? '+' : ''}
            ${profile.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="text-[11px] text-secondary">
            Open positions profit/loss
          </div>
        </div>

        {/* Realized PnL */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-xs font-bold uppercase tracking-wider">Realized P&L</span>
            {profile.realizedPnl >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-accent-green" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-accent-red" />
            )}
          </div>
          <span className={`text-2xl font-black ${
            profile.realizedPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
          }`}>
            {profile.realizedPnl >= 0 ? '+' : ''}
            ${profile.realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="text-[11px] text-secondary">
            Closed positions profit/loss
          </div>
        </div>

      </div>

      {/* Open Positions */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b border-border bg-card/40">
          <h3 className="font-bold text-base text-foreground">Open Positions</h3>
        </div>

        {profile.positions && profile.positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-secondary text-xs uppercase tracking-wider font-semibold bg-background/30">
                  <th className="px-6 py-3.5">Market</th>
                  <th className="px-6 py-3.5">Position</th>
                  <th className="px-6 py-3.5 text-right">Shares Owned</th>
                  <th className="px-6 py-3.5 text-right">Avg Buy Price</th>
                  <th className="px-6 py-3.5 text-right">Current Price</th>
                  <th className="px-6 py-3.5 text-right">Current Value</th>
                  <th className="px-6 py-3.5 text-right">Unrealized P&L</th>
                  <th className="px-6 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {profile.positions.map((pos) => (
                  <tr key={pos.id} className="border-b border-border/40 hover:bg-border/10 transition-all font-medium">
                    <td 
                      onClick={() => onMarketSelect(pos.marketId)}
                      className="px-6 py-4 text-primary font-semibold cursor-pointer hover:underline max-w-xs truncate"
                    >
                      {pos.marketTitle}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        pos.outcomeName.toUpperCase() === 'YES' 
                          ? 'bg-accent-green/10 text-accent-green' 
                          : pos.outcomeName.toUpperCase() === 'NO'
                          ? 'bg-accent-red/10 text-accent-red'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {pos.outcomeName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">{(Number(pos.sharesOwned)).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">{(Number(pos.averageBuyPrice) * 100).toFixed(0)}¢</td>
                    <td className="px-6 py-4 text-right">{(Number(pos.currentPrice) * 100).toFixed(0)}¢</td>
                    <td className="px-6 py-4 text-right">${pos.currentValue.toFixed(2)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${
                      pos.unrealizedPnl >= 0 ? 'text-accent-green' : 'text-accent-red'
                    }`}>
                      {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onMarketSelect(pos.marketId)}
                        className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-border transition-all text-xs font-bold text-foreground cursor-pointer"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-secondary text-sm font-semibold flex flex-col gap-2.5">
            <span>You have no active predictions at this time.</span>
            <button
              onClick={() => onMarketSelect('')} // trigger list refresh or tab redirection
              className="w-fit mx-auto px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer"
            >
              Browse Active Markets
            </button>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b border-border bg-card/40 flex items-center gap-2">
          <History className="w-5 h-5 text-secondary" />
          <h3 className="font-bold text-base text-foreground">Transaction History</h3>
        </div>

        {profile.trades && profile.trades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-secondary text-xs uppercase tracking-wider font-semibold bg-background/30">
                  <th className="px-6 py-3.5">Market</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Outcome</th>
                  <th className="px-6 py-3.5 text-right">Shares Traded</th>
                  <th className="px-6 py-3.5 text-right">Price per Share</th>
                  <th className="px-6 py-3.5 text-right">Total USDC</th>
                  <th className="px-6 py-3.5 text-right">Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {profile.trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-border/40 hover:bg-border/10 transition-all font-medium">
                    <td className="px-6 py-4 max-w-xs truncate text-foreground/90">{trade.market?.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        trade.type === 'BUY' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-accent-red/10 text-accent-red'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground/80">{trade.outcome?.name}</td>
                    <td className="px-6 py-4 text-right">{(Number(trade.shares)).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">{(Number(trade.pricePaid) * 100).toFixed(0)}¢</td>
                    <td className="px-6 py-4 text-right">${(Number(trade.amount)).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-secondary flex items-center justify-end gap-1.5 hover:text-primary transition-all">
                      <span>{trade.txHash.substring(0, 12)}...</span>
                      <ExternalLink className="w-3 h-3 cursor-pointer" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-secondary text-sm font-medium">
            No trades verified.
          </div>
        )}
      </div>

    </div>
  );
}
