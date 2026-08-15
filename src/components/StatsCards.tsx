import React from 'react';
import { Wallet, TrendingUp, TrendingDown, CheckCircle2, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { FundStats } from '../types';

interface StatsCardsProps {
  stats: FundStats;
  monthlyFee: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, monthlyFee }) => {
  const paidUpPercentage = Math.round((stats.paidUpStudentsCount / (stats.totalStudents || 1)) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 w-full">
      
      {/* Net Balance Card */}
      <div className="w-full bg-white rounded-2xl p-6 md:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 group relative overflow-hidden flex flex-col items-center text-center md:items-start md:text-left">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
        <div className="w-full flex flex-col items-center md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <span className="text-xs md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Cash Balance</span>
          <div className="p-2.5 md:p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 group-hover:scale-105 transition-transform">
            <Wallet className="w-5 h-5 md:w-4 md:h-4" />
          </div>
        </div>
        <div className="text-3xl md:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono tracking-tight mb-1">
          ৳ {stats.netBalance.toLocaleString('en-US')}
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 text-xs md:text-[11px] text-emerald-700 font-semibold mt-2">
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 text-[10px] font-extrabold">
            <ArrowUpRight className="w-3 h-3" /> Active
          </span>
          <span className="text-slate-500 font-medium">Available for batch usage</span>
        </div>
      </div>

      {/* Total Collected Card */}
      <div className="w-full bg-white rounded-2xl p-6 md:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-200 transition-all duration-200 group relative overflow-hidden flex flex-col items-center text-center md:items-start md:text-left">
        <div className="w-full flex flex-col items-center md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <span className="text-xs md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Fund Collected</span>
          <div className="p-2.5 md:p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100/80 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5 md:w-4 md:h-4" />
          </div>
        </div>
        <div className="text-3xl md:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono tracking-tight mb-1">
          ৳ {stats.totalCollected.toLocaleString('en-US')}
        </div>
        <div className="text-xs md:text-[11px] text-slate-500 font-medium mt-2">
          Accumulated across <span className="font-bold text-slate-800">{stats.totalStudents}</span> students (৳{monthlyFee}/mo)
        </div>
      </div>

      {/* Total Expenses Card */}
      <div className="w-full bg-white rounded-2xl p-6 md:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-200 transition-all duration-200 group relative overflow-hidden flex flex-col items-center text-center md:items-start md:text-left">
        <div className="w-full flex flex-col items-center md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <span className="text-xs md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Expenses</span>
          <div className="p-2.5 md:p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100/80 group-hover:scale-105 transition-transform">
            <TrendingDown className="w-5 h-5 md:w-4 md:h-4" />
          </div>
        </div>
        <div className="text-3xl md:text-2xl lg:text-3xl font-extrabold text-rose-600 font-mono tracking-tight mb-1">
          ৳ {stats.totalSpent.toLocaleString('en-US')}
        </div>
        <div className="text-xs md:text-[11px] text-slate-500 font-medium mt-2 flex items-center justify-center md:justify-start gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Voucher-verified batch expenditures</span>
        </div>
      </div>

      {/* Payment Compliance Progress Card */}
      <div className="w-full bg-white rounded-2xl p-6 md:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 group relative overflow-hidden flex flex-col items-center text-center md:items-start md:text-left">
        <div className="w-full flex flex-col items-center md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <span className="text-xs md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Compliance</span>
          <div className="p-2.5 md:p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4" />
          </div>
        </div>
        <div className="w-full flex items-baseline justify-center md:justify-between mb-1 gap-2">
          <div className="text-3xl md:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {stats.paidUpStudentsCount} <span className="text-xs text-slate-400 font-semibold font-sans">/ {stats.totalStudents}</span>
          </div>
          <span className="text-xs font-black text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            {paidUpPercentage}%
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 mt-2 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${paidUpPercentage}%` }}
          />
        </div>
      </div>

    </div>
  );
};


