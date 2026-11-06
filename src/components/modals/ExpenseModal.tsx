import React, { useState, useRef } from 'react';
import { X, Plus, Receipt, DollarSign, Calendar, Tag, Camera, Image, Trash2, Upload, AlertCircle } from 'lucide-react';
import { BatchConfig } from '../../types';
import { auth } from '../../firebase';

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
  const getAdminName = () => {
    const user = auth.currentUser;
    return user?.displayName || user?.email || localStorage.getItem('sec_admin_email') || config?.managerName || 'Md. Rajib Hossain Sunny (CR)';
  };

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'Event' | 'Academic' | 'Sports' | 'Lab' | 'Welfare' | 'Contingency' | 'Farewell' | 'Other'>('Event');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [spentBy, setSpentBy] = useState(() => getAdminName());
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpen = useRef(false);

  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setTitle('');
      setAmount('');
      setCategory('Event');
      setDate(new Date().toISOString().split('T')[0]);
      setSpentBy(getAdminName());
      setImagePreview('');
      setImageFileName('');
      setShowUrlFallback(false);
      setManualUrl('');
      setNotes('');
      setError('');
      setIsSubmitting(false);
      setIsProcessingImage(false);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, config]);

  if (!isOpen) return null;

  // Process & compress uploaded image file into a lightweight base64 string
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if image
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP, etc.).');
      return;
    }

    setIsProcessingImage(true);
    setError('');

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new window.Image();
          img.onload = () => {
            // Scale down high-res phone camera shots (e.g. 12MP-48MP) to max 1200px
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
            // Export crisp JPEG compressed to ~100-200KB
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

      setImagePreview(base64Data);
      setImageFileName(file.name || 'memo_photo.jpg');
    } catch (err) {
      console.error('Error processing memo image:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setImageFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const numAmount = Number(amount);
    if (isSubmitting || !cleanTitle || isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid title and positive expense amount.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timePart = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const cleanDateOnly = (date || '').trim().split(' ')[0] || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const finalExpenseDate = `${cleanDateOnly} ${timePart}`;

      // Choose base64 image or manual URL
      const finalProofDoc = imagePreview || manualUrl.trim();

      await onSubmit({
        title: cleanTitle,
        amount: numAmount,
        category,
        date: finalExpenseDate,
        expenseDate: finalExpenseDate,
        createdAt: finalExpenseDate,
        spentBy,
        referenceDocUrl: finalProofDoc,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('Expense submission error:', err);
      setError(err?.message || 'Failed to save expense voucher. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Add Expense Voucher</h3>
              <p className="text-xs text-slate-400">Log batch expenditure with camera/gallery memo proof</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          
          {/* Title */}
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

          {/* Amount & Category */}
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

          {/* Date & Spent By */}
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
                Spent By / Authorized Person (CR)
              </label>
              <input
                type="text"
                value={spentBy}
                onChange={(e) => setSpentBy(e.target.value)}
                disabled
                readOnly
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Direct Image/Camera Upload in Expense Modal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-rose-600" />
                Receipt / Proof Image (Camera / Gallery)
              </label>
              <button
                type="button"
                onClick={() => setShowUrlFallback(!showUrlFallback)}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {showUrlFallback ? 'Use Camera/File Upload' : 'Or paste URL'}
              </button>
            </div>

            {/* Native HTML File & Camera Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageFileChange}
              className="hidden"
              id="memo-camera-file-input"
            />

            {!showUrlFallback ? (
              imagePreview ? (
                /* Captured / Selected Image Preview Box */
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="relative rounded-lg overflow-hidden bg-slate-900/5 border border-slate-200 flex items-center justify-center max-h-48">
                    <img
                      src={imagePreview}
                      alt="Captured Memo Preview"
                      className="w-full max-h-48 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium truncate max-w-[65%]">
                      ✓ {imageFileName || 'Memo photo attached'}
                    </span>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="memo-camera-file-input"
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer transition text-[11px]"
                      >
                        Retake / Change
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Inviting Native Upload & Camera Trigger Box */
                <label
                  htmlFor="memo-camera-file-input"
                  className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50/80 hover:bg-rose-50/30 rounded-xl cursor-pointer transition group"
                >
                  <div className="flex items-center gap-2 text-rose-600 group-hover:scale-105 transition-transform mb-1">
                    <div className="p-2 bg-rose-100 rounded-full">
                      <Camera className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="p-2 bg-slate-100 rounded-full">
                      <Upload className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {isProcessingImage ? 'Processing memo photo...' : 'Snap Memo Photo with Camera or Choose from Gallery'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Supports instant camera snap on mobile or image file upload
                  </span>
                </label>
              )
            ) : (
              /* Fallback Manual URL Input */
              <input
                type="text"
                placeholder="e.g. https://i.postimg.cc/... or Google Drive URL"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            )}
          </div>

          {/* Description */}
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

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2">
              <span className="font-bold text-rose-800">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isProcessingImage || !title.trim() || !amount || Number(amount) <= 0}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Voucher...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Save Expense Voucher
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
