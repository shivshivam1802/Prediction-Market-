'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ShieldAlert, Coins, HelpCircle, ArrowUpRight, TrendingUp, Users, Send } from 'lucide-react';

interface Outcome {
  id: string;
  name: string;
  price: number;
  totalShares: number;
}

interface User {
  username: string;
  walletAddress: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface Trade {
  id: string;
  type: string;
  amount: number;
  shares: number;
  pricePaid: number;
  timestamp: string;
  user: User;
  outcome: { name: string };
}

interface Market {
  id: string;
  contractAddress: string;
  title: string;
  description: string;
  category: string;
  type: string;
  status: string;
  rules: string;
  endDate: string;
  oracleSource: string;
  resolutionMethod: string;
  totalVolume: number;
  tvl: number;
  openInterest: number;
  outcomes: Outcome[];
  comments?: Comment[];
  trades?: Trade[];
}

interface MarketDetailModalProps {
  marketId: string;
  onClose: () => void;
  walletAddress: string | null;
  usdcBalance: number;
  setUsdcBalance: React.Dispatch<React.SetStateAction<number>>;
  onTradeSuccess: () => void;
}

export default function MarketDetailModal({
  marketId,
  onClose,
  walletAddress,
  usdcBalance,
  setUsdcBalance,
  onTradeSuccess,
}: MarketDetailModalProps) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('');
  const [tradeAmount, setTradeAmount] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string>('');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number } | null>(null);

  useEffect(() => {
    fetchMarketDetails();
  }, [marketId]);

  const fetchMarketDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/markets/${marketId}`);
      if (res.ok) {
        const data = await res.json();
        setMarket(data);
        if (data.outcomes && data.outcomes.length > 0) {
          setSelectedOutcomeId(data.outcomes[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch market details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !market) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="p-8 rounded-2xl glass flex flex-col items-center gap-4 text-foreground">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-semibold text-sm">Loading market details...</span>
        </div>
      </div>
    );
  }

  const selectedOutcome = market.outcomes.find((o) => o.id === selectedOutcomeId) || market.outcomes[0];
  const outcomes = market.outcomes || [];

  // Simulated chart logic
  const currentPrice = Number(selectedOutcome.price);
  const chartPoints = [
    { x: 0, y: 0.50, label: 'Jan' },
    { x: 20, y: 0.52, label: 'Feb' },
    { x: 40, y: 0.45, label: 'Mar' },
    { x: 60, y: 0.54, label: 'Apr' },
    { x: 80, y: currentPrice - 0.08 < 0.02 ? 0.05 : currentPrice - 0.08, label: 'May' },
    { x: 100, y: currentPrice, label: 'Now' },
  ];

  // SVG Area path generator
  const getSvgPath = () => {
    const width = 500;
    const height = 180;
    const coords = chartPoints.map((p) => {
      const px = (p.x / 100) * width;
      const py = height - (p.y * height);
      return `${px},${py}`;
    });
    return `M ${coords.join(' L ')}`;
  };

  const getSvgAreaPath = () => {
    const width = 500;
    const height = 180;
    const path = getSvgPath();
    return `${path} L ${width},${height} L 0,${height} Z`;
  };

  const executeTrade = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first.');
      return;
    }

    const val = parseFloat(tradeAmount);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid numeric amount.');
      return;
    }

    if (tradeType === 'BUY' && val > usdcBalance) {
      alert('Insufficient USDC balance.');
      return;
    }

    try {
      setIsSubmittingTrade(true);
      const res = await fetch(`http://localhost:3001/api/markets/${marketId}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          outcomeId: selectedOutcomeId,
          type: tradeType,
          amount: val,
        }),
      });

      if (res.ok) {
        const updatedMarket = await res.json();
        setMarket(updatedMarket);
        
        // Update user balance
        const totalFee = (val * 100) / 10000; // 1%
        if (tradeType === 'BUY') {
          setUsdcBalance((prev) => prev - val);
          setTradeSuccessMsg(`Successfully bought ${(val / Number(selectedOutcome.price)).toFixed(2)} shares of ${selectedOutcome.name}!`);
        } else {
          const cashBack = val * Number(selectedOutcome.price) - totalFee;
          setUsdcBalance((prev) => prev + cashBack);
          setTradeSuccessMsg(`Successfully sold ${val} shares of ${selectedOutcome.name}!`);
        }
        
        setTradeAmount('');
        onTradeSuccess();

        // Clear success message after 4s
        setTimeout(() => setTradeSuccessMsg(''), 4000);
      } else {
        const error = await res.json();
        alert(`Trade failed: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error executing trade.');
    } finally {
      setIsSubmittingTrade(false);
    }
  };

  const submitComment = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet to comment.');
      return;
    }
    if (!commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      const res = await fetch(`http://localhost:3001/api/markets/${marketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          content: commentText,
        }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setMarket((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            comments: [newComment, ...(prev.comments || [])],
          };
        });
        setCommentText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const calculatedShares = () => {
    const val = parseFloat(tradeAmount);
    if (isNaN(val) || val <= 0) return 0;
    const price = Number(selectedOutcome.price);
    if (tradeType === 'BUY') {
      return (val * 0.99) / price; // 1% fee deduction
    } else {
      return val * price * 0.99; // returns cash minus fee
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl glass shadow-2xl p-6 md:p-8 flex flex-col gap-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full border border-border bg-card/50 text-foreground hover:bg-border transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-1.5 max-w-[85%]">
          <span className="text-xs text-primary font-bold uppercase tracking-widest">{market.category}</span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">{market.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-secondary font-semibold mt-1">
            <span>Volume: ${(Number(market.totalVolume)).toLocaleString()} USDC</span>
            <span>•</span>
            <span>TVL: ${(Number(market.tvl)).toLocaleString()} USDC</span>
            <span>•</span>
            <span>Oracle: {market.oracleSource}</span>
          </div>
        </div>

        {/* Content Body split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns - Chart and Info */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* SVG Chart */}
            <div className="p-5 rounded-2xl border border-border bg-card/30 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground/90">Probability Curve</span>
                </div>
                <div className="text-lg font-black text-primary">
                  {(Number(selectedOutcome.price) * 100).toFixed(0)}% Probability
                </div>
              </div>

              <div className="h-[200px] w-full flex items-end">
                <svg viewBox="0 0 500 180" className="w-full h-[180px] overflow-visible">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="45" x2="500" y2="45" stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="135" x2="500" y2="135" stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="4" />

                  {/* Gradient Area */}
                  <path d={getSvgAreaPath()} fill="url(#chartGradient)" />

                  {/* Curve Path */}
                  <path d={getSvgPath()} fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Intersect Dots */}
                  {chartPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={(pt.x / 100) * 500}
                      cy={180 - (pt.y * 180)}
                      r="4.5"
                      className="fill-primary stroke-card cursor-pointer hover:r-6 transition-all"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
              </div>

              {/* Chart Dates */}
              <div className="flex justify-between text-[11px] text-secondary font-bold mt-2.5 px-1">
                {chartPoints.map((pt, i) => (
                  <span key={i}>{pt.label}</span>
                ))}
              </div>
            </div>

            {/* Description & Rules */}
            <div className="p-5 rounded-2xl border border-border bg-card/25 flex flex-col gap-3">
              <div>
                <h4 className="text-xs text-secondary font-bold uppercase tracking-wider mb-1">Description</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{market.description}</p>
              </div>
              <div className="border-t border-border/40 pt-3">
                <h4 className="text-xs text-secondary font-bold uppercase tracking-wider mb-1">Rules</h4>
                <p className="text-xs text-foreground/75 leading-relaxed">{market.rules}</p>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-secondary" />
                <h3 className="font-bold text-base text-foreground">Discussions ({market.comments?.length || 0})</h3>
              </div>

              {/* Create comment */}
              {walletAddress ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Share your perspective on this market..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-grow px-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:border-primary text-sm text-foreground"
                  />
                  <button
                    onClick={submitComment}
                    disabled={isSubmittingComment}
                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-secondary/5 text-center text-xs text-secondary font-semibold">
                  Please connect wallet to participate in the discussions.
                </div>
              )}

              {/* List Comments */}
              <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                {market.comments && market.comments.length > 0 ? (
                  market.comments.map((comment) => (
                    <div key={comment.id} className="p-3.5 rounded-xl border border-border/40 bg-card/20 flex flex-col gap-1.5 animate-fade-in">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-foreground/90">{comment.user?.username || 'anonymous'}</span>
                        <span className="text-[10px] text-secondary font-bold">
                          {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-normal">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-secondary font-medium">
                    No arguments presented yet. Be the first to share!
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column - Trading Terminal */}
          <div className="flex flex-col gap-5">
            <div className="p-5 rounded-3xl border border-border bg-card shadow-lg flex flex-col gap-5">
              
              {/* Buy / Sell Tabs */}
              <div className="flex border border-border/60 rounded-xl p-1 bg-background">
                <button
                  onClick={() => setTradeType('BUY')}
                  className={`flex-1 py-2 text-center rounded-lg text-sm font-bold transition-all ${
                    tradeType === 'BUY'
                      ? 'bg-primary text-white shadow'
                      : 'text-secondary hover:text-foreground'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeType('SELL')}
                  className={`flex-1 py-2 text-center rounded-lg text-sm font-bold transition-all ${
                    tradeType === 'SELL'
                      ? 'bg-card text-foreground border border-border/40 shadow-sm'
                      : 'text-secondary hover:text-foreground'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Outcome Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-secondary font-bold uppercase tracking-wider">Select Outcome</label>
                <div className="flex flex-col gap-1.5">
                  {outcomes.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setSelectedOutcomeId(o.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-sm font-semibold ${
                        selectedOutcomeId === o.id
                          ? o.name.toUpperCase() === 'YES'
                            ? 'border-accent-green bg-accent-green/10 text-accent-green'
                            : o.name.toUpperCase() === 'NO'
                            ? 'border-accent-red bg-accent-red/10 text-accent-red'
                            : 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-border/20 text-foreground'
                      }`}
                    >
                      <span>{o.name}</span>
                      <span className="opacity-90">{(Number(o.price) * 100).toFixed(0)}¢</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade Input */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] text-secondary font-bold uppercase tracking-wider">
                    {tradeType === 'BUY' ? 'Amount to Spend' : 'Shares to Sell'}
                  </label>
                  <span className="text-[10px] text-secondary font-bold">
                    {tradeType === 'BUY'
                      ? `Avail: ${usdcBalance.toLocaleString()} USDC`
                      : `Avail: ${selectedOutcome.name} shares`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary text-base font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-secondary font-semibold">
                    {tradeType === 'BUY' ? 'USDC' : 'SHARES'}
                  </span>
                </div>
              </div>

              {/* Output Payout Estimation */}
              <div className="p-3.5 rounded-2xl bg-background border border-border/40 flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center text-secondary">
                  <span>Price per Share</span>
                  <span className="font-bold text-foreground">{(Number(selectedOutcome.price) * 100).toFixed(1)}¢</span>
                </div>
                <div className="flex justify-between items-center text-secondary">
                  <span>Platform Fee (1%)</span>
                  <span className="font-bold text-foreground">
                    {tradeType === 'BUY' 
                      ? `$${(parseFloat(tradeAmount || '0') * 0.01).toFixed(2)} USDC`
                      : `$${(parseFloat(tradeAmount || '0') * Number(selectedOutcome.price) * 0.01).toFixed(2)} USDC`}
                  </span>
                </div>
                <div className="border-t border-border/40 my-1" />
                <div className="flex justify-between items-center text-foreground font-semibold">
                  <span>{tradeType === 'BUY' ? 'Estimated Shares' : 'Collateral Return'}</span>
                  <span className={`text-sm font-black ${tradeType === 'BUY' ? 'text-primary' : 'text-accent-green'}`}>
                    {tradeType === 'BUY' 
                      ? `${calculatedShares().toFixed(2)} Shares`
                      : `$${calculatedShares().toFixed(2)} USDC`}
                  </span>
                </div>
              </div>

              {/* Success Notification Alert */}
              {tradeSuccessMsg && (
                <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-center text-xs font-semibold animate-fade-in">
                  {tradeSuccessMsg}
                </div>
              )}

              {/* Trade CTA */}
              <button
                onClick={executeTrade}
                disabled={isSubmittingTrade || !tradeAmount || market.status !== 'ACTIVE'}
                className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide text-white transition-all shadow-md flex items-center justify-center cursor-pointer ${
                  market.status !== 'ACTIVE'
                    ? 'bg-secondary cursor-not-allowed'
                    : tradeType === 'BUY'
                    ? 'bg-primary hover:bg-primary-hover shadow-blue-500/10'
                    : 'bg-accent-red hover:opacity-90 shadow-red-500/10'
                }`}
              >
                {isSubmittingTrade ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : market.status !== 'ACTIVE' ? (
                  'Market Resolved'
                ) : tradeType === 'BUY' ? (
                  'Buy YES Shares'
                ) : (
                  'Sell Shares'
                )}
              </button>
            </div>

            {/* Platform Stats Widget */}
            <div className="p-4 rounded-2xl border border-border bg-card/25 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-1 text-secondary font-bold">
                <Coins className="w-3.5 h-3.5" />
                <span>CONTRACT SPECIFICATIONS</span>
              </div>
              <div className="flex flex-col gap-1.5 font-medium mt-1">
                <div className="flex justify-between text-secondary">
                  <span>Resolution Method</span>
                  <span className="text-foreground">{market.resolutionMethod}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Collateral Address</span>
                  <span className="text-foreground font-mono">{market.contractAddress.substring(0, 10)}...</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Status</span>
                  <span className={`font-bold ${market.status === 'ACTIVE' ? 'text-accent-green' : 'text-accent-red'}`}>
                    {market.status}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
