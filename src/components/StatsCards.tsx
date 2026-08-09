import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FundStats } from '../types';

interface StatsCardsProps {
  stats: FundStats;
  monthlyFee: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, monthlyFee }) => {
  const paidUpPercentage = Math.round((stats.paidUpStudentsCount / (stats.totalStudents || 1)) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      
      {/* Net Balance */}
      <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgb(0,0,0,0.06)] transition-all">
        <p className="text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Net Cash Balance</p>
        <p className="text-3xl font-black text-slate-900 font-mono">৳ {stats.netBalance.toLocaleString('en-US')}</p>
        <p className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1">
        
        </p>
      </div>

      {/* Total Collected */}
      <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgb(0,0,0,0.06)] transition-all">
        <p className="text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Total Fund Collected</p>
        <p className="text-3xl font-black text-slate-900 font-mono">৳ {stats.totalCollected.toLocaleString('en-US')}</p>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Accumulated from 64 students (৳{monthlyFee}/mo)
        </p>
      </div>

      {/* Total Expenses */}
      <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgb(0,0,0,0.06)] transition-all">
        <p className="text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Total Expenses</p>
        <p className="text-3xl font-black text-rose-600 font-mono">৳ {stats.totalSpent.toLocaleString('en-US')}</p>
        <p className="text-xs text-rose-500 mt-2 font-medium">
          
        </p>
      </div>

      {/* Monthly Goal & Student Compliance */}
      <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgb(0,0,0,0.06)] transition-all">
        <div className="flex justify-between items-baseline mb-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">PAYMENT DONE</p>
          <span className="text-xs font-extrabold text-emerald-600 font-mono">{paidUpPercentage}%</span>
        </div>
        <p className="text-3xl font-black text-slate-900 font-mono">
          {stats.paidUpStudentsCount} <span className="text-xs text-slate-400 font-normal">/ {stats.totalStudents}</span>
        </p>
        <div className="w-full bg-slate-100 h-2 mt-3 rounded-full overflow-hidden border border-slate-200/50">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${paidUpPercentage}%` }}></div>
        </div>
      </div>

    </div>
  );
};
