import React, { useState } from 'react';
import { Receipt, Plus, ExternalLink, Calendar, Trash2, Tag, FileText } from 'lucide-react';
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
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" /> Batch Expenses & Vouchers
          </h2>
          <p className="text-xs text-slate-500">
            Total Logged Expenses: <strong className="text-slate-900">৳ {totalFilteredSpent.toLocaleString('bn-BD')} BDT</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {isAdmin && (
            <button
              onClick={onOpenExpenseModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Expense Voucher
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Voucher No</th>
                <th className="py-3.5 px-4">Title / Purpose</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Spent By</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => onSelectExpense(e)}
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900">
                    {e.voucherNo}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{e.title}</div>
                    {e.notes && <div className="text-xs text-slate-400 line-clamp-1">{e.notes}</div>}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <Tag className="w-3 h-3" /> {e.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                    {e.date}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-800 font-medium">
                    {e.spentBy}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-rose-600 text-base">
                    - ৳{e.amount}
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectExpense(e)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
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
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
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
