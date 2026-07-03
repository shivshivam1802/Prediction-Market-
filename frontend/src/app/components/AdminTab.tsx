'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Award, CheckCircle, ShieldAlert } from 'lucide-react';

interface Outcome {
  id: string;
  name: string;
  price: number;
}

interface Market {
  id: string;
  title: string;
  status: string;
  outcomes: Outcome[];
}

interface AdminTabProps {
  walletAddress: string;
  onMarketCreated: () => void;
}

export default function AdminTab({ walletAddress, onMarketCreated }: AdminTabProps) {
  // Market creation form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('CRYPTO');
  const [outcomesCsv, setOutcomesCsv] = useState('YES, NO');
  const [endDate, setEndDate] = useState('');
  const [oracleSource, setOracleSource] = useState('Chainlink Price Feed / Resolver consensus');
  const [resolutionMethod, setResolutionMethod] = useState('Oracle validation / Admin consensus');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(false);

  // Market resolution state
  const [activeMarkets, setActiveMarkets] = useState<Market[]>([]);
  const [resolvingMarketId, setResolvingMarketId] = useState('');
  const [winningOutcomeId, setWinningOutcomeId] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionSuccess, setResolutionSuccess] = useState(false);

  useEffect(() => {
    fetchActiveMarkets();
  }, []);

  const fetchActiveMarkets = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/markets?status=ACTIVE');
      if (res.ok) {
        const data = await res.json();
        setActiveMarkets(data);
        if (data.length > 0) {
          setResolvingMarketId(data[0].id);
          if (data[0].outcomes && data[0].outcomes.length > 0) {
            setWinningOutcomeId(data[0].outcomes[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load active markets for resolution:', err);
    }
  };

  const handleMarketChange = (marketId: string) => {
    setResolvingMarketId(marketId);
    const m = activeMarkets.find(x => x.id === marketId);
    if (m && m.outcomes && m.outcomes.length > 0) {
      setWinningOutcomeId(m.outcomes[0].id);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !endDate) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const outcomes = outcomesCsv.split(',').map(s => s.trim()).filter(Boolean);
      
      const res = await fetch('http://localhost:3001/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          type: outcomes.length === 2 && outcomes.includes('YES') ? 'YES_NO' : 'MULTIPLE_CHOICE',
          endDate,
          oracleSource,
          resolutionMethod,
          creatorAddress: walletAddress,
          outcomes,
          tags: [category.toLowerCase(), 'prediction'],
        }),
      });

      if (res.ok) {
        setCreationSuccess(true);
        setTitle('');
        setDescription('');
        setOutcomesCsv('YES, NO');
        setEndDate('');
        onMarketCreated();
        fetchActiveMarkets();
        setTimeout(() => setCreationSuccess(false), 4000);
      } else {
        alert('Failed to create market.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating market.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingMarketId || !winningOutcomeId) return;

    try {
      setIsResolving(true);
      const res = await fetch(`http://localhost:3001/api/markets/${resolvingMarketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winningOutcomeId,
        }),
      });

      if (res.ok) {
        setResolutionSuccess(true);
        fetchActiveMarkets();
        setTimeout(() => setResolutionSuccess(false), 4000);
      } else {
        alert('Failed to resolve market.');
      }
    } catch (err) {
      console.error(err);
      alert('Error resolving market.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in max-w-6xl mx-auto">
      
      {/* Create Market Form */}
      <div className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg text-foreground">Create Prediction Market</h3>
        </div>

        {creationSuccess && (
          <div className="p-3.5 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-center text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Market successfully deployed on-chain & indexed!</span>
          </div>
        )}

        <form onSubmit={handleCreateMarket} className="flex flex-col gap-4 text-sm font-semibold">
          <div className="flex flex-col gap-1.5">
            <label className="text-secondary text-[11px] uppercase tracking-wider">Market Title *</label>
            <input
              type="text"
              placeholder="e.g. Will Ethereum transition to gasless transactions in 2026?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary font-medium"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-secondary text-[11px] uppercase tracking-wider">Description *</label>
            <textarea
              placeholder="Provide a detailed summary of the parameters, rules, and scope of this prediction market..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary font-medium resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-secondary text-[11px] uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary font-medium cursor-pointer"
              >
                <option value="CRYPTO">Crypto</option>
                <option value="AI">Artificial Intelligence</option>
                <option value="POLITICS">Politics</option>
                <option value="SPORTS">Sports</option>
                <option value="BUSINESS">Business</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-secondary text-[11px] uppercase tracking-wider">End Date *</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary font-medium cursor-pointer"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-secondary text-[11px] uppercase tracking-wider">Outcomes (Comma separated) *</label>
            <input
              type="text"
              placeholder="YES, NO (or multiple options: Apple, NVIDIA, Google)"
              value={outcomesCsv}
              onChange={(e) => setOutcomesCsv(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary font-medium"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-secondary text-[11px] uppercase tracking-wider">Oracle Source</label>
            <input
              type="text"
              value={oracleSource}
              onChange={(e) => setOracleSource(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-secondary text-[11px] uppercase tracking-wider">Resolution Method</label>
            <input
              type="text"
              value={resolutionMethod}
              onChange={(e) => setResolutionMethod(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2.5 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-md flex items-center justify-center cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Deploy Prediction Market'
            )}
          </button>
        </form>
      </div>

      {/* Resolve Market Form */}
      <div className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-lg text-foreground">Resolve Active Markets</h3>
        </div>

        {resolutionSuccess && (
          <div className="p-3.5 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-center text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Market resolved! Payouts updated successfully.</span>
          </div>
        )}

        {activeMarkets.length > 0 ? (
          <form onSubmit={handleResolveMarket} className="flex flex-col gap-5 text-sm font-semibold">
            <div className="flex flex-col gap-1.5">
              <label className="text-secondary text-[11px] uppercase tracking-wider">Select Market to Resolve</label>
              <select
                value={resolvingMarketId}
                onChange={(e) => handleMarketChange(e.target.value)}
                className="px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary font-medium cursor-pointer"
              >
                {activeMarkets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-secondary text-[11px] uppercase tracking-wider">Select Winning Outcome</label>
              <div className="flex flex-col gap-1.5">
                {(activeMarkets.find(x => x.id === resolvingMarketId)?.outcomes || []).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setWinningOutcomeId(o.id)}
                    className={`p-3.5 rounded-xl border text-left font-bold transition-all ${
                      winningOutcomeId === o.id
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-500'
                        : 'border-border bg-background hover:bg-border/25 text-foreground'
                    }`}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-400 flex gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>
                Resolving a market is permanent. Once resolved, the winning outcome's share price changes to 100¢ ($1.00), other outcomes fall to 0¢, and trades are disabled.
              </span>
            </div>

            <button
              type="submit"
              disabled={isResolving || !winningOutcomeId}
              className="py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md flex items-center justify-center cursor-pointer"
            >
              {isResolving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Finalize and Resolve Market'
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-20 text-secondary text-sm font-semibold">
            No active markets available for resolution. Create a new market first!
          </div>
        )}
      </div>

    </div>
  );
}
