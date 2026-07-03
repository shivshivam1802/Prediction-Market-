'use client';

import React, { useEffect, useState } from 'react';
import { Activity, User, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';

interface Trade {
  id: string;
  txHash: string;
  type: string;
  amount: number;
  shares: number;
  pricePaid: number;
  timestamp: string;
  user: { walletAddress: string; username: string };
  market: { title: string; id: string };
  outcome: { name: string };
}

export default function ActivityTab() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalActivity();
  }, []);

  const fetchGlobalActivity = async () => {
    try {
      setLoading(true);
      // Fetch some sample trades. We can fetch all markets and join, or fetch user trades.
      // Let's create a small fallback loop querying the API or loading mock events.
      const res = await fetch('http://localhost:3001/api/markets');
      if (res.ok) {
        const markets = await res.json();
        // Extract recent trades from first few markets
        let allTrades: any[] = [];
        for (const m of markets) {
          const detailRes = await fetch(`http://localhost:3001/api/markets/${m.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            if (detail.trades) {
              const tradesWithMarket = detail.trades.map((t: any) => ({
                ...t,
                market: { id: detail.id, title: detail.title }
              }));
              allTrades = [...allTrades, ...tradesWithMarket];
            }
          }
        }
        allTrades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTrades(allTrades.slice(0, 30));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return new Date(isoString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-foreground gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Fetching active streams...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-black text-foreground">Global Live Activity</h2>
      </div>

      <div className="flex flex-col gap-3">
        {trades.length > 0 ? (
          trades.map((trade) => (
            <div 
              key={trade.id} 
              className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in market-card-hover"
            >
              {/* Profile, Action and Market */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-border flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    <span className="font-bold text-foreground/90">{trade.user?.username || 'anonymous'}</span>
                    <span className="text-secondary"> index-traded </span>
                    <span className={`font-bold ${
                      trade.type === 'BUY' ? 'text-primary' : 'text-accent-red'
                    }`}>
                      {trade.type} {trade.outcome?.name}
                    </span>
                    <span className="text-secondary"> on </span>
                    <span className="font-bold text-foreground">{trade.market?.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-secondary font-semibold mt-1">
                    <span>{getRelativeTime(trade.timestamp)}</span>
                    <span>•</span>
                    <span className="font-mono">{truncateAddress(trade.user?.walletAddress)}</span>
                  </div>
                </div>
              </div>

              {/* Amount Details */}
              <div className="flex sm:flex-col items-end justify-between shrink-0 font-semibold text-sm">
                <div className="text-foreground font-black">
                  ${(Number(trade.amount)).toFixed(2)} USDC
                </div>
                <div className="text-xs text-secondary flex items-center gap-1 mt-0.5 hover:text-primary transition-all font-mono">
                  <span>{(Number(trade.shares)).toFixed(2)} Shares</span>
                  <ExternalLink className="w-3 h-3 cursor-pointer" />
                </div>
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-20 rounded-2xl border border-border bg-card/40 text-secondary text-sm font-semibold">
            No live trades registered recently. Execute a buy/sell trade to view the stream!
          </div>
        )}
      </div>
    </div>
  );
}
