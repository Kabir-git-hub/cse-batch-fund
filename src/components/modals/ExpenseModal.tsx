import React, { useState } from 'react';
import { X, Plus, Receipt, DollarSign, Calendar, Tag, Link as LinkIcon } from 'lucide-react';
import { BatchConfig } from '../../types';

interface ExpenseModalProps {
  config: BatchConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: any) => Promise<void>;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  config,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'Event' | 'Academic' | 'Sports' | 'Lab' | 'Welfare' | 'Contingency' | 'Farewell' | 'Other'>('Event');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [spentBy, setSpentBy] = useState(config?.managerName || 'Mahfuzur Rahman');
  const [referenceDocUrl, setReferenceDocUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prevIsOpen = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setTitle('');
      setAmount('');
      setCategory('Event');
      setDate(new Date().toISOString().split('T')[0]);
      setSpentBy(config?.managerName || 'Mahfuzur Rahman');
      setReferenceDocUrl('');
      setNotes('');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        amount: Number(amount),
        category,
        date,
        spentBy,
        referenceDocUrl,
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
        
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Add Expense Voucher</h3>
              <p className="text-xs text-slate-400">Log department batch expenditure with reference</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Purpose / Event Title *
            </label>
            <input
              type="text"
              placeholder="e.g. CSE Batch-17 Iftar Party Decoration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (৳ BDT) *
              </label>
              <input
                type="number"
                placeholder="e.g. 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-600"
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
                Expense Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Spent By / Authorized Person
              </label>
              <input
                type="text"
                value={spentBy}
                onChange={(e) => setSpentBy(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt / Proof Image Link (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Google Drive / Imgur memo photo URL"
              value={referenceDocUrl}
              onChange={(e) => setReferenceDocUrl(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Memo Breakdown
            </label>
            <textarea
              placeholder="e.g. Memo details: 10 Posters (৳300), Banner (৳700)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !title || !amount}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Save Expense Voucher
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
