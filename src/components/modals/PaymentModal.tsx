import React, { useState } from 'react';
import { X, Check, CreditCard, Calendar, User, FileText, Plus, Search, CheckSquare, Square, Users } from 'lucide-react';
import { Student, BatchConfig } from '../../types';
import { compareStudents } from '../../utils/studentSorter';
import { auth } from '../../firebase';

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
  const sortedStudents = React.useMemo(() => [...students].sort(compareStudents), [students]);
  
  // Multi-select student rolls
  const [selectedRolls, setSelectedRolls] = useState<string[]>(() => {
    if (preselectedStudent?.roll) return [preselectedStudent.roll];
    return [];
  });
  const [studentSearch, setStudentSearch] = useState('');

  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank'>('bKash');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const getAdminName = () => {
    const user = auth.currentUser;
    return user?.displayName || user?.email || localStorage.getItem('sec_admin_email') || config?.managerName || 'Md. Rajib Hossain Sunny (CR)';
  };

  const [collectorName, setCollectorName] = useState(() => getAdminName());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const prevIsOpen = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      if (preselectedStudent?.roll) {
        setSelectedRolls([preselectedStudent.roll]);
      } else {
        setSelectedRolls([]);
      }
      setStudentSearch('');
      setSelectedMonths([]);
      setTransactionRef('');
      setNotes('');
      setError('');
      setIsSubmitting(false);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setCollectorName(getAdminName());
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, preselectedStudent, sortedStudents, config]);

  if (!isOpen) return null;

  // Filter months to start strictly from August 2026 (2026-08) onwards or provided target months
  const validMonths = allTargetMonths.filter((m) => m >= '2026-08').sort();

  // Filter students by search term
  const filteredStudents = sortedStudents.filter((s) => {
    if (!studentSearch.trim()) return true;
    const query = studentSearch.toLowerCase().trim();
    return (
      s.roll.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query) ||
      (s.slNo !== undefined && String(s.slNo).includes(query))
    );
  });

  const isAllFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedRolls.includes(s.roll));

  const handleSelectAll = () => {
    const allFilteredRolls = filteredStudents.map((s) => s.roll);
    const combined = Array.from(new Set([...selectedRolls, ...allFilteredRolls]));
    setSelectedRolls(combined);
  };

  const handleDeselectAll = () => {
    if (studentSearch.trim()) {
      // Deselect only the currently filtered ones
      const filteredRollSet = new Set(filteredStudents.map((s) => s.roll));
      setSelectedRolls(selectedRolls.filter((r) => !filteredRollSet.has(r)));
    } else {
      setSelectedRolls([]);
    }
  };

  const toggleStudent = (roll: string) => {
    if (selectedRolls.includes(roll)) {
      setSelectedRolls(selectedRolls.filter((r) => r !== roll));
    } else {
      setSelectedRolls([...selectedRolls, roll]);
    }
  };

  const toggleMonth = (m: string) => {
    if (selectedMonths.includes(m)) {
      setSelectedMonths(selectedMonths.filter((item) => item !== m));
    } else {
      setSelectedMonths([...selectedMonths, m].sort());
    }
  };

  const handleSelectPresets = (count: number) => {
    const toSelect = validMonths.slice(0, count);
    setSelectedMonths(toSelect);
  };

  const monthlyFee = config.monthlyFee || 50;
  const perStudentAmount = selectedMonths.length * monthlyFee;
  const grandTotal = selectedRolls.length * perStudentAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || selectedRolls.length === 0 || selectedMonths.length === 0) return;

    setIsSubmitting(true);
    setError('');
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timePart = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const finalPaymentDate = paymentDate && paymentDate.includes(' ')
        ? paymentDate
        : `${paymentDate || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`} ${timePart}`;

      // Loop through selected students and generate individual payment receipts/records
      const paymentsToSubmit = selectedRolls.map((roll, idx) => {
        const student = students.find((s) => s.roll === roll);
        const refNo = transactionRef
          ? (selectedRolls.length > 1 ? `${transactionRef}-${roll}` : transactionRef)
          : `TRX-${Math.floor(Math.random() * 900000 + 100000)}`;

        return {
          studentRoll: roll,
          studentId: student?.id,
          studentName: student?.name,
          amount: perStudentAmount,
          monthsPaid: selectedMonths,
          paymentDate: finalPaymentDate,
          paymentMethod,
          transactionRef: refNo,
          collectorName,
          notes,
        };
      });

      await onSubmit(paymentsToSubmit);
      onClose();
    } catch (err: any) {
      console.error('Payment submission error:', err);
      setError(err?.message || 'Payment submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Record Payment Receipt</h3>
              <p className="text-xs text-slate-400">Collect monthly fund from SEC CSE Batch-17 student(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          
          {/* Multi-Select Students Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Select Students
                <span className="ml-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {selectedRolls.length} / {students.length} Selected
                </span>
              </label>

              {/* Select All / Deselect All Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3" /> Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={selectedRolls.length === 0}
                  className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Square className="w-3 h-3" /> Deselect All
                </button>
              </div>
            </div>

            {/* Quick Search Student */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students by roll, name, or #..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 focus:bg-white transition-all"
              />
            </div>

            {/* Multi-Select Student Checkbox List */}
            <div className="max-h-48 overflow-y-auto p-1.5 bg-slate-50/80 border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-inner">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No students match "{studentSearch}"
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isChecked = selectedRolls.includes(s.roll);
                  return (
                    <div
                      key={s.id || s.roll}
                      onClick={() => toggleStudent(s.roll)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-emerald-50 text-emerald-950 font-semibold'
                          : 'hover:bg-slate-100/90 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by row onClick
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {s.slNo !== undefined && s.slNo !== null ? `#${s.slNo} ` : ''}{s.roll}
                        </span>
                        <span className="text-xs truncate">
                          {s.name}
                        </span>
                      </div>
                      {isChecked && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Select Months Grid */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Select Months to Clear (৳{monthlyFee}/month)
              </label>
              {validMonths.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectPresets(1)}
                    className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                  >
                    +1 Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresets(3)}
                    className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                  >
                    +3 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresets(6)}
                    className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                  >
                    +6 Months
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Month Selection Container */}
            <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-inner scroll-smooth">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {validMonths.map((m) => {
                  const isSelected = selectedMonths.includes(m);
                  const formatted = formatMonthYear(m);

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium text-left transition flex items-center justify-between border cursor-pointer ${
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
            </div>

            {/* Total Auto Calculated Amount Breakdown */}
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-emerald-800 font-medium block">
                  <strong>{selectedRolls.length}</strong> Student{selectedRolls.length !== 1 ? 's' : ''} × <strong>{selectedMonths.length}</strong> Month{selectedMonths.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold block">
                  Per Student: ৳ {perStudentAmount} BDT
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Grand Total</span>
                <span className="text-base font-extrabold text-emerald-700">
                  ৳ {grandTotal.toLocaleString('en-US')} BDT
                </span>
              </div>
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
                placeholder="e.g. BK82910472 (Optional)"
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
                disabled
                readOnly
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 cursor-not-allowed"
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
              placeholder="e.g. Paid during lab session"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2">
              <span className="font-bold text-rose-800">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
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
              disabled={isSubmitting || selectedRolls.length === 0 || selectedMonths.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Issuing {selectedRolls.length} Receipt{selectedRolls.length !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Issue {selectedRolls.length > 1 ? `${selectedRolls.length} Official Receipts` : 'Official Receipt'}
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
