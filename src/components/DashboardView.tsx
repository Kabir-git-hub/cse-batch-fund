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
} from 'recharts';
import { Receipt, ArrowDownRight, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
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
      
      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Collection vs Expense Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Monthly Cash Flow</h3>
                <p className="text-xs text-slate-500 font-medium">Collections vs Expenditures (BDT)</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200/60">
              Last 8 Months
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip
                    formatter={(value: any) => [`৳ ${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}
                  />
                  <Bar dataKey="collection" name="Collection (৳)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expense (৳)" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                No monthly transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Expense Breakdown</h3>
                <p className="text-xs text-slate-500 font-medium">Spendings by category</p>
              </div>
            </div>

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
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`৳ ${value.toLocaleString()}`, 'Spent']}
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                  No expenses logged yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            {pieChartData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900 font-mono">৳{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Ledger Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Payment Receipts */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Recent Payment Receipts</h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Verified Credit</span>
          </div>

          <div className="divide-y divide-slate-100">
            {receipts.slice(0, 5).map((r) => (
              <div
                key={r.id}
                onClick={() => onSelectReceipt(r)}
                className="py-3.5 px-2.5 flex items-center justify-between hover:bg-slate-50/90 rounded-xl cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{r.studentName}</span>
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                      Roll {r.studentRoll}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{r.paymentDate}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 font-semibold">{r.monthsPaid?.length} Months ({r.monthsPaid?.slice(0, 2).join(', ')}{r.monthsPaid?.length > 2 ? '...' : ''})</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-mono text-[11px]">{r.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-600 font-mono text-sm sm:text-base">+ ৳{r.amount}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.receiptNo}</div>
                </div>
              </div>
            ))}

            {receipts.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm font-medium">
                No payment receipts found.
              </div>
            )}
          </div>
        </div>

        {/* Recent Expense Vouchers */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Recent Expense Vouchers</h3>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">Batch Debit</span>
          </div>

          <div className="divide-y divide-slate-100">
            {expenses.slice(0, 5).map((e) => (
              <div
                key={e.id}
                onClick={() => onSelectExpense(e)}
                className="py-3.5 px-2.5 flex items-center justify-between hover:bg-slate-50/90 rounded-xl cursor-pointer transition-colors"
              >
                <div className="max-w-[70%]">
                  <div className="font-bold text-slate-900 text-sm line-clamp-1">{e.title}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-md text-[11px] border border-rose-100">
                      {e.category}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{e.date}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 truncate">By {e.spentBy}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-extrabold text-rose-600 font-mono text-sm sm:text-base">- ৳{e.amount}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{e.voucherNo}</div>
                </div>
              </div>
            ))}

            {expenses.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm font-medium">
                No expenses logged yet.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

