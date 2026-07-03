'use client';

import React, { useState } from 'react';
import { Wallet, Sun, Moon, LogOut, ChevronDown, Check, Award, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
  usdcBalance: number;
  setUsdcBalance: React.Dispatch<React.SetStateAction<number>>;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  walletAddress,
  setWalletAddress,
  usdcBalance,
  setUsdcBalance,
  isAdmin,
  setIsAdmin,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const mockAccounts = [
    {
      address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      name: 'trader.eth',
      isAdmin: false,
    },
    {
      address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      name: 'admin.eth',
      isAdmin: true,
    },
  ];

  const toggleDarkMode = () => {
    const html = document.querySelector('html');
    if (html) {
      html.classList.toggle('dark');
    }
  };

  const selectAccount = (address: string, isAccAdmin: boolean) => {
    setWalletAddress(address);
    setIsAdmin(isAccAdmin);
    setDropdownOpen(false);
  };

  const handleConnectWallet = () => {
    // Default connect trader
    setWalletAddress(mockAccounts[0].address);
    setIsAdmin(mockAccounts[0].isAdmin);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setIsAdmin(false);
    setDropdownOpen(false);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Brand Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('markets')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
          P
        </div>
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-400 bg-clip-text text-transparent">
          POLYPREDICT
        </span>
      </div>

      {/* Tabs Navigation */}
      <nav className="flex items-center gap-1 md:gap-2">
        {[
          { id: 'markets', label: 'Markets' },
          { id: 'portfolio', label: 'Portfolio' },
          { id: 'leaderboard', label: 'Leaderboard' },
          { id: 'activity', label: 'Activity' },
          ...(walletAddress ? [{ id: 'admin', label: 'Admin Panel' }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-secondary hover:text-foreground hover:bg-border/20'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full tab-underline" />
            )}
          </button>
        ))}
      </nav>

      {/* Right Side Widgets */}
      <div className="flex items-center gap-3">
        {/* Dark Mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-lg border border-border bg-card text-foreground hover:bg-border/30 transition-all"
          title="Toggle Light/Dark Theme"
        >
          <Sun className="h-4.5 w-4.5 dark:hidden" />
          <Moon className="h-4.5 w-4.5 hidden dark:block text-blue-400" />
        </button>

        {/* Wallet Widget */}
        {walletAddress ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-border/20 transition-all text-sm font-medium"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
              <span>{usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
              <span className="text-secondary">|</span>
              <span className="text-foreground">{truncateAddress(walletAddress)}</span>
              <ChevronDown className="w-4 h-4 text-secondary" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl glass shadow-2xl p-4 flex flex-col gap-3 animate-fade-in z-50">
                <div className="text-xs text-secondary font-semibold uppercase tracking-wider">
                  Select Demo Wallet Account
                </div>
                <div className="flex flex-col gap-1.5">
                  {mockAccounts.map((acc) => (
                    <button
                      key={acc.address}
                      onClick={() => selectAccount(acc.address, acc.isAdmin)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left text-sm ${
                        walletAddress.toLowerCase() === acc.address.toLowerCase()
                          ? 'border-primary/50 bg-primary/5 text-primary'
                          : 'border-border bg-card/40 hover:bg-border/20 text-foreground'
                      }`}
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          {acc.name}
                          {acc.isAdmin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 font-bold uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-secondary">{truncateAddress(acc.address)}</div>
                      </div>
                      {walletAddress.toLowerCase() === acc.address.toLowerCase() && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="border-t border-border/50 pt-2.5 flex justify-between items-center">
                  <div className="text-xs text-secondary">
                    Mode: <span className="text-accent-green font-semibold">Simulated Web3</span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 text-xs text-accent-red font-semibold hover:opacity-80 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleConnectWallet}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-lg shadow-blue-500/20 glow-primary transition-all duration-200"
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
