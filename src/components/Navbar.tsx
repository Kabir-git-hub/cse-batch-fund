import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Plus, Receipt, Bot, LayoutDashboard, Users, CalendarDays, Wallet, Clock, RefreshCw } from 'lucide-react';
import { BatchConfig, FundStats } from '../types';
import { PRIMARY_ADMIN_EMAIL } from '../config/adminConfig';
import { SecLogo } from './SecLogo';

interface NavbarProps {
  config: BatchConfig;
  stats: FundStats;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  onOpenPinModal: () => void;
  onLogoutAdmin: () => void;
  onOpenPaymentModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenSheetSyncModal: () => void;
  onQuickSheetSync?: () => void;
  isSyncingSheet?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  stats,
  activeTab,
  setActiveTab,
  isAdmin,
  onOpenPinModal,
  onLogoutAdmin,
  onOpenPaymentModal,
  onOpenExpenseModal,
  onOpenSheetSyncModal,
  onQuickSheetSync,
  isSyncingSheet,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 text-white border-b-4 border-emerald-500 sticky top-0 z-30 shadow-lg">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand & Institution Info */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-full shadow-md shrink-0 flex items-center justify-center overflow-hidden">
              <SecLogo className="w-10 h-10 sm:w-11 sm:h-11" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase text-white">
                {config.batchName || 'SEC CSE Batch-17'} Fund
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">
                {config.institution || 'Sylhet Engineering College'}
              </p>
            </div>
          </div>

          {/* Right Side: Live Clock, Balance & Right Admin Login Panel */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Real-time Date & Clock Widget */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-slate-300">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase leading-none">{dateStr || 'SEC Live'}</span>
                <span className="text-xs font-black font-mono text-emerald-300 leading-tight mt-0.5">{timeStr || '00:00:00 AM'}</span>
              </div>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-1.5 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Net Balance</div>
                <div className="text-base font-black text-emerald-400 font-mono">৳ {stats.netBalance.toLocaleString('en-US')} BDT</div>
              </div>
            </div>

            {/* FAR RIGHT: Admin Login Panel / Active Admin Controls */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onQuickSheetSync}
                  disabled={isSyncingSheet}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                  title="Sync live data with Google Sheet without opening modal"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin text-teal-400' : 'text-teal-400'}`} />
                  <span>{isSyncingSheet ? 'Syncing...' : 'Sheet Sync'}</span>
                </button>
                <button
                  onClick={onOpenPaymentModal}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Collect
                </button>
                <button
                  onClick={onOpenExpenseModal}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Expense
                </button>
                <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold uppercase text-emerald-400 leading-none">Admin Active</span>
                    <span className="text-[11px] font-mono text-emerald-200 truncate max-w-[120px]">
                      {localStorage.getItem('sec_admin_email') || PRIMARY_ADMIN_EMAIL}
                    </span>
                  </div>
                  <button
                    onClick={onLogoutAdmin}
                    className="ml-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenPinModal}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer group"
                title="Admin Login Panel (Continue with Google)"
              >
                <Shield className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                <span className="font-extrabold tracking-wide">Admin Login Panel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-950/90 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'students'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" /> Student(64)
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'matrix'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Contribution Tracker
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'expenses'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-4 h-4" /> Expense Audit
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-purple-300 hover:text-purple-200 hover:bg-purple-950/40'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-400" /> Fund AI Auditor
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={onQuickSheetSync}
              disabled={isSyncingSheet}
              className="ml-auto px-3.5 py-2 bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer disabled:opacity-50"
              title="Click to refresh and sync live data with Google Sheet without opening any modal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin text-teal-400' : 'text-teal-400'}`} />
              <span>{isSyncingSheet ? 'Syncing...' : 'Sheet Sync'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
