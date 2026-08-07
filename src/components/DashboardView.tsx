import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Receipt, CreditCard, ArrowDownRight, Phone, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { BatchConfig, PaymentReceipt, Expense, FundStats } from '../types';

interface DashboardViewProps {
  config: BatchConfig;
  stats: FundStats;
  receipts: PaymentReceipt[];
  expenses: Expense[];
  isAdmin: boolean;
  onSelectReceipt: (receipt: PaymentReceipt) => void;
  onSelectExpense: (expense: Expense) => void;
  onOpenPaymentModal: () => void;
  onOpenPinModal: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  config,
  stats,
  receipts,
  expenses,
  isAdmin,
  onSelectReceipt,
  onSelectExpense,
  onOpenPaymentModal,
  onOpenPinModal,
}) => {
  // Aggregate monthly collection chart data
  const monthlyDataMap: Record<string, { month: string; collection: number; expense: number }> = {};

  receipts.forEach((r) => {
    const monthKey = r.paymentDate ? r.paymentDate.substring(0, 7) : 'Unknown';
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = { month: monthKey, collection: 0, expense: 0 };
    }
    monthlyDataMap[monthKey].collection += Number(r.amount || 0);
  });

  expenses.forEach((e) => {
    const monthKey = e.date ? e.date.substring(0, 7) : 'Unknown';
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = { month: monthKey, collection: 0, expense: 0 };
    }
    monthlyDataMap[monthKey].expense += Number(e.amount || 0);
  });

  const chartData = Object.values(monthlyDataMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-8); // last 8 months

  // Expense breakdown by category
  const expenseCategoryMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Other';
    expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + Number(e.amount || 0);
  });

  const pieChartData = Object.keys(expenseCategoryMap).map((cat) => ({
    name: cat,
    value: expenseCategoryMap[cat],
  }));

  return (
    <div className="space-y-6">
      
      {/* Batch Payment Information Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white rounded-2xl p-6 border border-emerald-700/40 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-500/30">
              <Info className="w-3.5 h-3.5" /> Batch Fund Guidelines
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Sylhet Engineering College — CSE Batch-17
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Every student contributes <strong className="text-emerald-300 font-semibold">৳ 50 BDT / Month</strong>. This fund is transparently managed for batch events, sports tournaments, lab/academic contingencies, and student welfare.
            </p>
            
            <div className="pt-2 flex flex-wrap gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>bKash Personal: <strong className="text-white font-mono">{config.bkashNumber || '01790853898'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Nagad Personal: <strong className="text-white font-mono">{config.nagadNumber || '01790853898'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <Phone className="w-4 h-4 text-teal-400" />
                <span>Treasurer: <strong className="text-white">{config.managerName || 'Md. Ahosan Habib'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 font-semibold">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>রেফারেন্সে (Roll + Name) দিবে</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="shrink-0 flex flex-col gap-2">
              <button
                onClick={onOpenPaymentModal}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm shadow-lg hover:shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Collect Money
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Collection vs Expense Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Monthly Fund Flow (Collection vs Expenses)</h3>
              <p className="text-xs text-slate-500">Historical view of money collected vs spent (in BDT)</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
              Last 8 Months
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [`৳ ${value}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="collection" name="Collection (৳)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense (৳)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No monthly transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Expense Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">Total spent categorized by department activities</p>

            <div className="h-48 w-full">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`৳ ${value}`, 'Spent']}
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No expenses logged yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            {pieChartData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-semibold text-slate-900">৳{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Ledger Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Payment Receipts */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Recent Payment Receipts</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Verified Money In</span>
          </div>

          <div className="divide-y divide-slate-100">
            {receipts.slice(0, 5).map((r) => (
              <div
                key={r.id}
                onClick={() => onSelectReceipt(r)}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{r.studentName}</span>
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      Roll: {r.studentRoll}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{r.paymentDate}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">{r.monthsPaid?.length} Months ({r.monthsPaid?.slice(0, 2).join(', ')}{r.monthsPaid?.length > 2 ? '...' : ''})</span>
                    <span>•</span>
                    <span className="text-slate-400 font-mono">{r.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-emerald-600 text-sm">+ ৳{r.amount}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{r.receiptNo}</div>
                </div>
              </div>
            ))}

            {receipts.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                No payment receipts found.
              </div>
            )}
          </div>
        </div>

        {/* Recent Expense Vouchers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Recent Expense Vouchers</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Batch Expenditures</span>
          </div>

          <div className="divide-y divide-slate-100">
            {expenses.slice(0, 5).map((e) => (
              <div
                key={e.id}
                onClick={() => onSelectExpense(e)}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
              >
                <div className="max-w-[70%]">
                  <div className="font-bold text-slate-900 text-sm line-clamp-1">{e.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="bg-rose-50 text-rose-700 font-medium px-1.5 py-0.5 rounded text-[11px]">
                      {e.category}
                    </span>
                    <span>•</span>
                    <span>{e.date}</span>
                    <span>•</span>
                    <span className="text-slate-400 truncate">By {e.spentBy}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-rose-600 text-sm">- ৳{e.amount}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{e.voucherNo}</div>
                </div>
              </div>
            ))}

            {expenses.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                No expenses logged yet.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
