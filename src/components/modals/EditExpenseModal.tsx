import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Receipt, Camera, Trash2, Upload } from 'lucide-react';
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
  const [referenceDocUrl, setReferenceDocUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expense && isOpen) {
      setTitle(expense.title || '');
      setAmount(String(expense.amount || ''));
      setCategory(expense.category || 'Event');
      const rawDate = expense.date || expense.expenseDate || expense.createdAt || new Date().toISOString().split('T')[0];
      setDate(rawDate.includes(' ') ? rawDate.split(' ')[0] : rawDate);
      setSpentBy(expense.spentBy || '');
      setReferenceDocUrl(expense.referenceDocUrl || '');
      setNotes(expense.notes || '');
      setIsProcessingImage(false);
    }
  }, [expense, isOpen]);

  if (!isOpen || !expense) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    setIsProcessingImage(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new window.Image();
          img.onload = () => {
            const MAX_DIM = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(event.target?.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressed);
          };
          img.onerror = () => {
            resolve(event.target?.result as string);
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      setReferenceDocUrl(base64Data);
    } catch (err) {
      console.error('Error processing memo photo in edit:', err);
    } finally {
      setIsProcessingImage(false);
    }
  };

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

          {/* Memo Proof Photo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-rose-600" />
              Receipt / Proof Image (Camera / Gallery)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageFileChange}
              className="hidden"
              id="edit-memo-camera-input"
            />

            {referenceDocUrl ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center max-h-40">
                  <img
                    src={referenceDocUrl}
                    alt="Memo Preview"
                    className="w-full max-h-40 object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium truncate max-w-[60%]">
                    ✓ Proof memo attached
                  </span>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="edit-memo-camera-input"
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer transition text-[11px]"
                    >
                      Change Photo
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceDocUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                htmlFor="edit-memo-camera-input"
                className="w-full flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50 rounded-xl cursor-pointer transition group"
              >
                <div className="flex items-center gap-2 text-rose-600 mb-1">
                  <Camera className="w-4 h-4" />
                  <Upload className="w-4 h-4 text-slate-500" />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {isProcessingImage ? 'Processing memo image...' : 'Snap Memo Photo or Upload from Gallery'}
                </span>
              </label>
            )}
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
