import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard } from 'lucide-react';
import { PaymentReceipt } from '../../types';

interface EditReceiptModalProps {
  receipt: PaymentReceipt | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updatedReceipt: PaymentReceipt) => Promise<void>;
}

export const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank'>('bKash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (receipt && isOpen) {
      setAmount(String(receipt.amount || ''));
      setPaymentDate(receipt.paymentDate || new Date().toISOString().split('T')[0]);
      setPaymentMethod(receipt.paymentMethod || 'bKash');
      setNotes(receipt.notes || '');
    }
  }, [receipt, isOpen]);

  if (!isOpen || !receipt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...receipt,
        amount: Number(amount),
        paymentDate,
        paymentMethod,
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
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Edit Payment Receipt</h3>
              <p className="text-xs text-slate-400">Receipt No: {receipt.receiptNo} ({receipt.studentName})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (৳ BDT) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e: any) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </select>
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
              disabled={isSubmitting || !amount}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
