import React, { useState } from 'react';
import { X, Check, CreditCard, Calendar, User, FileText, Plus } from 'lucide-react';
import { Student, BatchConfig } from '../../types';

interface PaymentModalProps {
  students: Student[];
  config: BatchConfig;
  preselectedStudent?: Student | null;
  allTargetMonths: string[];
  studentStatuses?: any[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payment: any) => Promise<void>;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

const formatMonthYear = (m: string) => {
  const [year, month] = m.split('-');
  return `${MONTH_NAMES[month] || month} ${year}`;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  students,
  config,
  preselectedStudent,
  allTargetMonths,
  studentStatuses = [],
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedRoll, setSelectedRoll] = useState(preselectedStudent ? preselectedStudent.roll : students[0]?.roll || '');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank'>('bKash');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectorName, setCollectorName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prevIsOpen = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setSelectedRoll(preselectedStudent ? preselectedStudent.roll : students[0]?.roll || '');
      setSelectedMonths([]);
      setTransactionRef('');
      setNotes('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setCollectorName('');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, preselectedStudent, students, config]);

  if (!isOpen) return null;

  // Filter months to start strictly from August 2026 (2026-08) onwards
  const validMonths = allTargetMonths.filter((m) => m >= '2026-08').sort();

  // Find paid months for currently selected student
  const currentStudentStatus = studentStatuses.find((s) => s.student.roll === selectedRoll);
  const studentPaidMonths = new Set<string>(currentStudentStatus?.monthsPaidList || []);

  // Filter out months that are ALREADY PAID by this student
  const availableMonths = validMonths.filter((m) => !studentPaidMonths.has(m));

  const calculatedAmount = selectedMonths.length * (config.monthlyFee || 50);

  // Whenever selectedRoll changes, reset selectedMonths to avoid invalid months carried over
  const handleStudentChange = (roll: string) => {
    setSelectedRoll(roll);
    setSelectedMonths([]);
  };

  const toggleMonth = (m: string) => {
    // Strictly block already paid months
    if (studentPaidMonths.has(m)) return;

    if (selectedMonths.includes(m)) {
      setSelectedMonths(selectedMonths.filter((item) => item !== m));
    } else {
      setSelectedMonths([...selectedMonths, m].sort());
    }
  };

  const handleSelectPresets = (count: number) => {
    // Select first N unpaid months starting from 2026-08
    const toSelect = availableMonths.slice(0, count);
    setSelectedMonths(toSelect);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoll || selectedMonths.length === 0) return;

    setIsSubmitting(true);
    try {
      const student = students.find((s) => s.roll === selectedRoll);
      await onSubmit({
        studentRoll: selectedRoll,
        studentId: student?.id,
        studentName: student?.name,
        amount: calculatedAmount,
        monthsPaid: selectedMonths,
        paymentDate,
        paymentMethod,
        transactionRef: transactionRef || `TRX-${Math.floor(Math.random() * 900000 + 100000)}`,
        collectorName,
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
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Record Payment Receipt</h3>
              <p className="text-xs text-slate-400">Collect monthly fund from SEC CSE Batch-17 student</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          
          {/* Select Student */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Student (Roll & Name)
            </label>
            <select
              value={selectedRoll}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/30"
            >
              {[...students].sort((a, b) => Number(a.roll) - Number(b.roll)).map((s) => (
              <option key={s.id} value={s.roll}>
                {s.roll} — {s.name}
                </option>
                ))}
            </select>
          </div>

          {/* Select Months Grid */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Select Months to Clear (৳{config.monthlyFee || 50}/month)
              </label>
              {availableMonths.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectPresets(1)}
                    className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                  >
                    +1 Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresets(3)}
                    className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                  >
                    +3 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresets(6)}
                    className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                  >
                    +6 Months
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Month Selection Container */}
            <div className="max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-inner scroll-smooth">
              {availableMonths.length === 0 ? (
                <div className="p-4 text-center bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                  <p className="text-xs font-bold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> All Payment Months Cleared!
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    This student has no pending dues for current active months.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableMonths.map((m) => {
                    const isSelected = selectedMonths.includes(m);
                    const formatted = formatMonthYear(m);

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMonth(m)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-medium text-left transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-mono text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {m}
                          </span>
                          <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                            {formatted}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total Auto Calculated Amount */}
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-medium">
                Total Selected: <strong className="font-bold">{selectedMonths.length} Months</strong>
              </span>
              <span className="text-base font-extrabold text-emerald-700">
                Total: ৳ {calculatedAmount} BDT
              </span>
            </div>
          </div>

          {/* Payment Method & Trx Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="bKash">bKash Personal</option>
                <option value="Nagad">Nagad Personal</option>
                <option value="Rocket">Rocket</option>
                <option value="Cash">Cash Hand-over</option>
                <option value="Bank">Bank Deposit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trx ID / Ref No
              </label>
              <input
                type="text"
                placeholder="e.g. BK82910472"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          {/* Date & Collector Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Received By (CR)
              </label>
              <input
                type="text"
                placeholder="e.g. Md. Rajib Hossain Sunny (CR)"
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid during lab exam session"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Submit Action */}
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
              disabled={isSubmitting || selectedMonths.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Issue Official Receipt
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
