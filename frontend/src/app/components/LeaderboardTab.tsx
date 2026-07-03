'use client';

import React from 'react';
import { Award, Trophy, User, ArrowUpRight } from 'lucide-react';

export default function LeaderboardTab() {
  const leaderboardData = [
    { rank: 1, name: 'marketmaker', address: '0x7099...79C8', volume: 54020.0, pnl: 4890.50, accuracy: '78%' },
    { rank: 2, name: 'whale_predicts', address: '0x3c44...43f2', volume: 41200.0, pnl: 3200.25, accuracy: '72%' },
    { rank: 3, name: 'blockchain_oracle', address: '0x90F8...c5E4', volume: 29500.0, pnl: 1850.00, accuracy: '69%' },
    { rank: 4, name: 'platformadmin', address: '0xf39F...2266', volume: 25000.0, pnl: 1100.10, accuracy: '65%' },
    { rank: 5, name: 'alpha_trader', address: '0x15d3...6a11', volume: 18400.0, pnl: 920.00, accuracy: '62%' },
    { rank: 6, name: 'crypto_seeker', address: '0x2546...bc8f', volume: 12100.0, pnl: -140.20, accuracy: '48%' },
    { rank: 7, name: 'no_cap_bets', address: '0xbDA5...9c7e', volume: 9800.0, pnl: 400.50, accuracy: '58%' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in">
      
      {/* Hero Podium */}
      <div className="grid grid-cols-3 items-end gap-4 p-6 rounded-3xl border border-border bg-card/40 shadow-sm text-center">
        {/* 2nd Place */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-foreground relative">
            <Trophy className="w-6 h-6 text-slate-400 absolute -top-4" />
            2
          </div>
          <span className="font-bold text-sm text-foreground/90">{leaderboardData[1].name}</span>
          <span className="text-xs text-secondary">${leaderboardData[1].pnl.toLocaleString()} Profit</span>
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center gap-2 p-4 border border-primary/20 bg-primary/5 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center font-extrabold text-slate-900 relative shadow-lg shadow-amber-400/20">
            <Trophy className="w-8 h-8 text-amber-500 absolute -top-6 animate-bounce" />
            1
          </div>
          <span className="font-black text-base text-foreground mt-1">{leaderboardData[0].name}</span>
          <span className="text-xs text-primary font-bold">${leaderboardData[0].pnl.toLocaleString()} Profit</span>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="w-12 h-12 rounded-full bg-amber-600/40 flex items-center justify-center font-bold text-foreground relative">
            <Trophy className="w-6 h-6 text-amber-700 absolute -top-4" />
            3
          </div>
          <span className="font-bold text-sm text-foreground/90">{leaderboardData[2].name}</span>
          <span className="text-xs text-secondary">${leaderboardData[2].pnl.toLocaleString()} Profit</span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/80 text-secondary text-xs uppercase tracking-wider font-semibold bg-background/30">
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Trader</th>
              <th className="px-6 py-4 text-right">Trading Volume</th>
              <th className="px-6 py-4 text-right">Total Profit/Loss</th>
              <th className="px-6 py-4 text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((row) => (
              <tr key={row.rank} className={`border-b border-border/40 hover:bg-border/10 transition-all font-medium ${
                row.rank <= 3 ? 'bg-primary/[0.01]' : ''
              }`}>
                <td className="px-6 py-4 font-bold text-foreground">
                  {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                </td>
                <td className="px-6 py-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground/90">{row.name}</div>
                    <div className="text-[10px] text-secondary font-mono">{row.address}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-foreground/80">${row.volume.toLocaleString()} USDC</td>
                <td className={`px-6 py-4 text-right font-bold ${row.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {row.pnl >= 0 ? '+' : ''}${row.pnl.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-foreground/80">{row.accuracy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
