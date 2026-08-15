import React, { useState } from 'react';
import { Receipt, Plus, Trash2, Tag, FileText, Search } from 'lucide-react';
import { Expense } from '../types';

interface ExpenseTrackerViewProps {
  expenses: Expense[];
  isAdmin: boolean;
  onOpenExpenseModal: () => void;
  onSelectExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpenseTrackerView: React.FC<ExpenseTrackerViewProps> = ({
  expenses,
  isAdmin,
  onOpenExpenseModal,
  onSelectExpense,
  onDeleteExpense,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'Event', 'Academic', 'Sports', 'Lab', 'Welfare', 'Contingency', 'Farewell', 'Other'];

  const filtered = expenses.filter((e) => {
    const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.spentBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalFilteredSpent = filtered.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Category Pills & Add Expense Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" /> Batch Expenses & Voucher Audit
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Total Logged Expenditures: <strong className="text-slate-900 font-mono text-sm">৳ {totalFilteredSpent.toLocaleString('en-US')} BDT</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search voucher, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {isAdmin && (
            <button
              onClick={onOpenExpenseModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Voucher
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-extrabold text-slate-500 border-b border-slate-200/80 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Voucher No</th>
                <th className="py-3.5 px-4 sm:px-6">Title / Purpose</th>
                <th className="py-3.5 px-4 sm:px-6">Category</th>
                <th className="py-3.5 px-4 sm:px-6">Date</th>
                <th className="py-3.5 px-4 sm:px-6">Spent By</th>
                <th className="py-3.5 px-4 sm:px-6">Amount</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => onSelectExpense(e)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-bold text-slate-900">
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60">
                      {e.voucherNo}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="font-bold text-slate-900">{e.title}</div>
                    {e.notes && <div className="text-xs text-slate-400 font-medium line-clamp-1">{e.notes}</div>}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                      <Tag className="w-3 h-3 text-rose-600" /> {e.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-600 font-mono font-medium">
                    {e.date}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-800 font-semibold">
                    {e.spentBy}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-rose-600 font-mono text-base">
                    - ৳{e.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectExpense(e)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="View Voucher Proof & Notes"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            onDeleteExpense(e.id);
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-medium">
                    No expense vouchers found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

