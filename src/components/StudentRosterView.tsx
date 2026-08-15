import React, { useState } from 'react';
import { Search, CheckCircle2, AlertTriangle, AlertCircle, UserPlus } from 'lucide-react';
import { StudentFundStatus, Student } from '../types';

interface StudentRosterViewProps {
  studentStatuses: StudentFundStatus[];
  isAdmin: boolean;
  onSelectStudent: (status: StudentFundStatus) => void;
  onOpenPaymentModalForStudent: (student: Student) => void;
  onOpenAddStudentModal: () => void;
}

export const StudentRosterView: React.FC<StudentRosterViewProps> = ({
  studentStatuses,
  isAdmin,
  onSelectStudent,
  onOpenPaymentModalForStudent,
  onOpenAddStudentModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredStudents = studentStatuses.filter((item) => {
    const matchesSearch =
      item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.phone.includes(searchTerm);

    if (statusFilter === 'paid_up') return matchesSearch && item.status === 'paid_up';
    if (statusFilter === 'due_1_month') return matchesSearch && item.status === 'due_1_month';
    if (statusFilter === 'overdue') return matchesSearch && item.status === 'overdue';

    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student roll, name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter buttons & Admin Add Student */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({studentStatuses.length})
            </button>
            <button
              onClick={() => setStatusFilter('paid_up')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === 'paid_up'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Up-to-Date
            </button>
            <button
              onClick={() => setStatusFilter('due_1_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === 'due_1_month'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> 1 Mo Due
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-xs'
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
              <UserPlus className="w-4 h-4 text-emerald-400" /> Add Student
            </button>
          )}
        </div>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...filteredStudents]
                .sort((a, b) => Number(a.student.roll) - Number(b.student.roll))
                .map((item) => (
                <tr
                  key={item.student.id}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                  onClick={() => onSelectStudent(item)}
                >
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900">
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60 text-xs">
                      {item.student.roll}
                    </span>
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
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> {item.totalMonthsDue} Months Due (৳{item.dueAmount})
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-sm font-medium">
                    No students match your search criteria.
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

