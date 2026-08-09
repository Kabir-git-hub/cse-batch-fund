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
    <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand & Institution Info */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 p-1 rounded-full border border-slate-200/80 shadow-xs shrink-0 flex items-center justify-center overflow-hidden">
              <SecLogo className="w-10 h-10 sm:w-11 sm:h-11" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase text-slate-900">
                {config.batchName || 'SEC CSE Batch-17'} Fund
              </h1>
              <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">
                {config.institution || 'Sylhet Engineering College'}
              </p>
            </div>
          </div>

          {/* Right Side: Live Clock, Balance & Right Admin Login Panel */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Real-time Date & Clock Widget */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100/90 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-slate-700 shadow-2xs">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase leading-none">{dateStr || 'SEC Live'}</span>
                <span className="text-xs font-black font-mono text-emerald-700 leading-tight mt-0.5">{timeStr || '00:00:00 AM'}</span>
              </div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl px-3.5 py-1.5 flex items-center gap-3 shadow-2xs">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-800/80 font-bold">Net Balance</div>
                <div className="text-base font-black text-emerald-700 font-mono">৳ {stats.netBalance.toLocaleString('en-US')} BDT</div>
              </div>
            </div>

            {/* FAR RIGHT: Admin Login Panel / Active Admin Controls */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onQuickSheetSync}
                  disabled={isSyncingSheet}
                  className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                  title="Sync live data with Google Sheet without opening modal"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin text-teal-600' : 'text-teal-600'}`} />
                  <span>{isSyncingSheet ? 'Syncing...' : 'Sheet Sync'}</span>
                </button>
                <button
                  onClick={onOpenPaymentModal}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs hover:shadow-md transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Collect
                </button>
                <button
                  onClick={onOpenExpenseModal}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs hover:shadow-md transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Expense
                </button>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold uppercase text-emerald-800 leading-none">Admin Active</span>
                    <span className="text-[11px] font-mono text-emerald-900 truncate max-w-[120px]">
                      {localStorage.getItem('sec_admin_email') || PRIMARY_ADMIN_EMAIL}
                    </span>
                  </div>
                  <button
                    onClick={onLogoutAdmin}
                    className="ml-1 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 transition shadow-2xs"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenPinModal}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-2 group"
                title="Admin Login Panel (Continue with Google)"
              >
                <Shield className="w-4 h-4 text-amber-200 group-hover:scale-110 transition-transform" />
                <span className="font-extrabold tracking-wide">Admin Login Panel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/80 border-t border-slate-200/60 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-6 sm:gap-8 overflow-x-auto pt-2 pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2.5 pt-1 text-xs flex items-center gap-2 whitespace-nowrap transition border-b-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'font-bold text-slate-900 border-emerald-500'
                : 'font-medium text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`} /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`pb-2.5 pt-1 text-xs flex items-center gap-2 whitespace-nowrap transition border-b-2 cursor-pointer ${
              activeTab === 'students'
                ? 'font-bold text-slate-900 border-emerald-500'
                : 'font-medium text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'students' ? 'text-emerald-600' : 'text-slate-400'}`} /> Student(64)
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-2.5 pt-1 text-xs flex items-center gap-2 whitespace-nowrap transition border-b-2 cursor-pointer ${
              activeTab === 'matrix'
                ? 'font-bold text-slate-900 border-emerald-500'
                : 'font-medium text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <CalendarDays className={`w-4 h-4 ${activeTab === 'matrix' ? 'text-emerald-600' : 'text-slate-400'}`} /> Contribution Tracker
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-2.5 pt-1 text-xs flex items-center gap-2 whitespace-nowrap transition border-b-2 cursor-pointer ${
              activeTab === 'expenses'
                ? 'font-bold text-slate-900 border-emerald-500'
                : 'font-medium text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <Receipt className={`w-4 h-4 ${activeTab === 'expenses' ? 'text-emerald-600' : 'text-slate-400'}`} /> Expense Audit
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-2.5 pt-1 text-xs flex items-center gap-2 whitespace-nowrap transition border-b-2 cursor-pointer ${
              activeTab === 'ai'
                ? 'font-bold text-purple-900 border-purple-600'
                : 'font-medium text-purple-600/80 hover:text-purple-900 border-transparent'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-500" /> Fund AI Auditor
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={onQuickSheetSync}
              disabled={isSyncingSheet}
              className="ml-auto px-4 py-2 bg-teal-100/80 hover:bg-teal-200/80 text-teal-800 border border-teal-300/80 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer disabled:opacity-50"
              title="Click to refresh and sync live data with Google Sheet without opening any modal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin text-teal-600' : 'text-teal-600'}`} />
              <span>{isSyncingSheet ? 'Syncing...' : 'Sheet Sync'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
