import React, { useState, useEffect } from 'react';
import { X, Save, Receipt } from 'lucide-react';
import { Expense } from '../../types';

interface EditExpenseModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updatedExpense: Expense) => Promise<void>;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'Event' | 'Academic' | 'Sports' | 'Lab' | 'Welfare' | 'Contingency' | 'Farewell' | 'Other'>('Event');
  const [date, setDate] = useState('');
  const [spentBy, setSpentBy] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense && isOpen) {
      setTitle(expense.title || '');
      setAmount(String(expense.amount || ''));
      setCategory(expense.category || 'Event');
      const rawDate = expense.date || expense.expenseDate || expense.createdAt || new Date().toISOString().split('T')[0];
      setDate(rawDate.includes(' ') ? rawDate.split(' ')[0] : rawDate);
      setSpentBy(expense.spentBy || '');
      setNotes(expense.notes || '');
    }
  }, [expense, isOpen]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !title || !amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const existingDate = expense.date || expense.expenseDate || '';
      const originalTime = existingDate.includes(' ') ? existingDate.split(' ')[1] : '';
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timePart = originalTime || `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const finalDate = date.includes(' ') ? date : `${date} ${timePart}`;

      await onSubmit({
        ...expense,
        title,
        amount: Number(amount),
        category,
        date: finalDate,
        expenseDate: finalDate,
        createdAt: expense.createdAt || finalDate,
        spentBy,
        notes,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Edit Expense Voucher</h3>
              <p className="text-xs text-slate-400">Voucher No: {expense.voucherNo}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Purpose / Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (৳ BDT) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="Event">Event / Picnic</option>
                <option value="Academic">Academic / Prints</option>
                <option value="Sports">Sports / Tournament</option>
                <option value="Lab">Lab / Hardware</option>
                <option value="Welfare">Welfare / Aid</option>
                <option value="Contingency">Contingency</option>
                <option value="Farewell">Farewell / Reception</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Spent By (Authorized Person)
              </label>
              <input
                type="text"
                placeholder="e.g. Al Amin Kabir"
                value={spentBy}
                onChange={(e) => setSpentBy(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !title || !amount}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
