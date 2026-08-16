import React, { useState } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Plus, 
  Receipt, 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Wallet, 
  Menu, 
  X,
  LogOut,
  Calendar
} from 'lucide-react';
import { BatchConfig, FundStats } from '../types';

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
  liveDateStr?: string;
  liveTimeStr?: string;
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
  liveDateStr,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students (64)', icon: Users },
    { id: 'matrix', label: 'Contribution Tracker', icon: CalendarDays },
    { id: 'expenses', label: 'Expense Audit', icon: Receipt },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand & Institution Info */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="https://i.postimg.cc/htGh5FFC/540271483-122132074802921166-1834135919526935801-n.jpg"
              alt="অসীমতট Logo"
              referrerPolicy="no-referrer"
              className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shadow-sm border border-gray-200 shrink-0"
            />
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                অসীমতট (CSE-17 Batch Fund)
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold tracking-wider uppercase leading-none mt-0.5">
                {config.institution || 'SYLHET ENGINEERING COLLEGE'}
              </p>
            </div>
          </div>

          {/* Center: Live Date Pill (Desktop) */}
          {liveDateStr && (
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 shadow-2xs backdrop-blur-sm transition-all shrink-0">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 tracking-tight">{liveDateStr}</span>
            </div>
          )}

          {/* Right Action Controls: Unified Height (h-9), Consistent Vertical Alignment */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Net Balance Pill */}
            <div className="h-9 px-3 sm:px-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 flex items-center gap-2 shadow-2xs shrink-0">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase font-bold text-emerald-800 hidden sm:inline">Balance:</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-700 font-mono">
                  ৳ {stats.netBalance.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            {isAdmin ? (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenPaymentModal}
                  className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Collect</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenExpenseModal}
                  className="h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Expense</span>
                </button>

                {/* Admin Active Pill with inline Logout */}
                <div className="h-9 px-2.5 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center gap-2 shadow-2xs">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase hidden md:inline">Admin</span>
                  </div>
                  <button
                    type="button"
                    onClick={onLogoutAdmin}
                    className="h-6 px-2 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    title="Logout Admin"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenPinModal}
                className="hidden sm:inline-flex h-9 px-3.5 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold items-center justify-center gap-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                title="Admin Login Panel"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Login</span>
              </button>
            )}

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:block bg-white/80 border-t border-slate-200/60 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-6 lg:gap-8">
          {navLinks.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNavClick(tab.id)}
                className={`py-3 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'text-emerald-700 border-emerald-600'
                    : 'text-slate-500 hover:text-slate-900 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Dropdown Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleNavClick(tab.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors text-left ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Admin Actions */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            {isAdmin ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenPaymentModal();
                  }}
                  className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Collect
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenExpenseModal();
                  }}
                  className="h-9 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogoutAdmin();
                  }}
                  className="col-span-2 h-9 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout Admin
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenPinModal();
                }}
                className="w-full h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Admin Login Panel</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

