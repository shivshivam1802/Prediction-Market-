'use client';

import React from 'react';
import { TrendingUp, BarChart2, Calendar } from 'lucide-react';

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

interface MarketCardProps {
  market: Market;
  onClick: () => void;
  onQuickTrade: (marketId: string, outcomeId: string, outcomeName: string) => void;
}

export default function MarketCard({ market, onClick, onQuickTrade }: MarketCardProps) {
  // Sort outcomes or search for YES/NO
  const outcomes = market.outcomes || [];
  const yesOutcome = outcomes.find(o => o.name.toUpperCase() === 'YES');
  const noOutcome = outcomes.find(o => o.name.toUpperCase() === 'NO');

  const formatVolume = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'CRYPTO': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'AI': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'POLITICS': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'SPORTS': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'BUSINESS': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-secondary/10 text-secondary border-secondary/20';
    }
  };

  const formattedDate = new Date(market.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      onClick={onClick}
      className="market-card-hover cursor-pointer p-5 rounded-2xl border border-border bg-card text-foreground flex flex-col justify-between gap-4 select-none relative overflow-hidden"
    >
      {/* Category and Volume */}
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${getCategoryColor(market.category)}`}>
          {market.category}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Vol: {formatVolume(Number(market.totalVolume))}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors flex-grow">
        {market.title}
      </h3>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
        <Calendar className="w-3.5 h-3.5" />
        <span>Ends: {formattedDate}</span>
      </div>

      {/* Quick Trade Outcomes */}
      <div className="flex gap-2.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
        {yesOutcome && noOutcome ? (
          <>
            <button
              onClick={() => onQuickTrade(market.id, yesOutcome.id, 'YES')}
              className="flex-1 py-2 px-3 rounded-xl border border-accent-green/20 bg-accent-green/5 text-accent-green hover:bg-accent-green hover:text-white font-semibold text-sm transition-all duration-200 flex items-center justify-between"
            >
              <span>Yes</span>
              <span className="opacity-80">{(Number(yesOutcome.price) * 100).toFixed(0)}¢</span>
            </button>
            <button
              onClick={() => onQuickTrade(market.id, noOutcome.id, 'NO')}
              className="flex-1 py-2 px-3 rounded-xl border border-accent-red/20 bg-accent-red/5 text-accent-red hover:bg-accent-red hover:text-white font-semibold text-sm transition-all duration-200 flex items-center justify-between"
            >
              <span>No</span>
              <span className="opacity-80">{(Number(noOutcome.price) * 100).toFixed(0)}¢</span>
            </button>
          </>
        ) : (
          outcomes.slice(0, 2).map((outcome) => (
            <button
              key={outcome.id}
              onClick={() => onQuickTrade(market.id, outcome.id, outcome.name)}
              className="flex-1 py-2 px-3 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white font-semibold text-sm transition-all duration-200 flex items-center justify-between"
            >
              <span className="truncate max-w-[80px]">{outcome.name}</span>
              <span className="opacity-80">{(Number(outcome.price) * 100).toFixed(0)}¢</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
