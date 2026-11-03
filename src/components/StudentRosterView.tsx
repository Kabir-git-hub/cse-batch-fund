import React, { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle2, AlertTriangle, AlertCircle, UserPlus, Trash2, X, CreditCard, Users, Sparkles } from 'lucide-react';
import { StudentFundStatus, Student } from '../types';
import { compareStudentStatuses } from '../utils/studentSorter';

interface StudentRosterViewProps {
  studentStatuses: StudentFundStatus[];
  isAdmin: boolean;
  onSelectStudent: (status: StudentFundStatus) => void;
  onOpenPaymentModalForStudent: (student: Student) => void;
  onOpenAddStudentModal: () => void;
  onDeleteStudent?: (student: Student) => void;
}

export const StudentRosterView: React.FC<StudentRosterViewProps> = ({
  studentStatuses,
  isAdmin,
  onSelectStudent,
  onOpenPaymentModalForStudent,
  onOpenAddStudentModal,
  onDeleteStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to focus search: '/' or 'Ctrl+K' / 'Cmd+K', and Escape to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && document.activeElement !== searchInputRef.current) {
        // Only trigger if not already typing in another input/textarea
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchTerm('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredStudents = studentStatuses.filter((item) => {
    const nameMatch = item.student.name.toLowerCase().includes(normalizedSearch);
    const rollMatch = item.student.roll.toLowerCase().includes(normalizedSearch);
    const phoneMatch = item.student.phone ? item.student.phone.includes(normalizedSearch) : false;

    const matchesSearch = normalizedSearch === '' || nameMatch || rollMatch || phoneMatch;

    if (statusFilter === 'paid_up') return matchesSearch && item.status === 'paid_up';
    if (statusFilter === 'due_1_month') return matchesSearch && item.status === 'due_1_month';
    if (statusFilter === 'overdue') return matchesSearch && item.status === 'overdue';

    return matchesSearch;
  });

  const handleConfirmDelete = async () => {
    if (!studentToDelete || !onDeleteStudent) return;
    setIsDeleting(true);
    try {
      await onDeleteStudent(studentToDelete);
      setStudentToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar at the top of StudentRosterView */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* High-Accessibility Search Bar */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by student name or roll number (e.g. '2023331546' or 'Al Amin')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
              aria-label="Filter students by name or roll number"
            />

            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search"
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                  /
                </span>
              )}

              {searchTerm && (
                <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                  {filteredStudents.length} found
                </span>
              )}
            </div>
          </div>

          {/* Status Filters & Admin Add Button */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 justify-between lg:justify-end">
            <div className="inline-flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs overflow-x-auto max-w-full">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({studentStatuses.length})
              </button>
              <button
                onClick={() => setStatusFilter('paid_up')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  statusFilter === 'paid_up'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Up-to-Date
              </button>
              <button
                onClick={() => setStatusFilter('due_1_month')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  statusFilter === 'due_1_month'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> 1 Mo Due
              </button>
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" /> Overdue
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={onOpenAddStudentModal}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Add Student</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Filter Summary Bar */}
        {(searchTerm || statusFilter !== 'all') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of{' '}
                <span className="font-semibold">{studentStatuses.length}</span> students
              </span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                  Keyword: "{searchTerm}"
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold capitalize">
                  Status: {statusFilter.replace('_', ' ')}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer hover:no-underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-extrabold text-slate-500 border-b border-slate-200/80 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Roll No</th>
                <th className="py-3.5 px-4 sm:px-6">Student Name</th>
                <th className="py-3.5 px-4 sm:px-6">Total Paid</th>
                <th className="py-3.5 px-4 sm:px-6">Dues Status</th>
                {isAdmin && <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...filteredStudents]
                .sort(compareStudentStatuses)
                .map((item) => (
                <tr
                  key={item.student.id}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                  onClick={() => onSelectStudent(item)}
                >
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.student.slNo !== undefined && item.student.slNo !== null && (
                        <span className="text-[11px] font-bold text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/50">
                          #{item.student.slNo}
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60 text-xs">
                        {item.student.roll}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                      <span>{item.student.name}</span>
                      {(item.student.name.includes('Rajib') || item.student.roll === '2023331523') && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide border border-emerald-300">
                          CR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Paid: <span className="font-bold text-slate-600">{item.monthsPaidList.length}</span> Months
                    </div>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-emerald-600 font-mono text-base">
                    ৳ {item.totalPaid.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6">
                    {item.status === 'paid_up' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Up-to-Date (৳0 Due)
                      </span>
                    )}

                    {item.status === 'due_1_month' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> 1 Month Due (৳50)
                      </span>
                    )}

                    {item.status === 'overdue' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> {item.totalMonthsDue} Months Due ({item.dueAmount} TK)
                      </span>
                    )}
                  </td>

                  {isAdmin && (
                    <td className="py-3.5 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPaymentModalForStudent(item.student);
                          }}
                          title={`Record payment for ${item.student.name}`}
                          className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentToDelete(item.student);
                          }}
                          title={`Delete student ${item.student.name}`}
                          aria-label={`Delete student ${item.student.name}`}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-red-200"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">No students found</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchTerm
                            ? `No student name or roll matched "${searchTerm}".`
                            : 'No students match the current status filter.'}
                        </p>
                      </div>
                      {(searchTerm || statusFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            searchInputRef.current?.focus();
                          }}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Delete Student</h3>
              </div>
              <button
                onClick={() => setStudentToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">{studentToDelete.name}</strong> (Roll: <span className="font-mono font-bold text-slate-900">{studentToDelete.roll}</span>)?
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800">
              ⚠️ This will remove the student from Firestore and send a deletion sync event to the Google Sheet.
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

