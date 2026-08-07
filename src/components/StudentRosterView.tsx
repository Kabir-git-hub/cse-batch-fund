import React, { useState } from 'react';
import { Search, Filter, CheckCircle2, AlertTriangle, AlertCircle, Receipt, Plus, UserPlus, Phone } from 'lucide-react';
import { StudentFundStatus, Student, PaymentReceipt } from '../types';

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
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student roll no, name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          />
        </div>

        {/* Filter buttons & Admin Add Student */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({studentStatuses.length})
            </button>
            <button
              onClick={() => setStatusFilter('paid_up')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                statusFilter === 'paid_up'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Up-to-Date
            </button>
            <button
              onClick={() => setStatusFilter('due_1_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                statusFilter === 'due_1_month'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> 1 Mo Due
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" /> Overdue
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={onOpenAddStudentModal}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" /> Add Student
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Roll No</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Total Paid</th>
                <th className="py-3.5 px-4">Dues Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((item) => (
                <tr
                  key={item.student.id}
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                  onClick={() => onSelectStudent(item)}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {item.student.roll}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{item.student.name}</div>
                    <div className="text-[11px] text-slate-400">
                      Paid: {item.monthsPaidList.length} Months
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">
                    ৳ {item.totalPaid}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'paid_up' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Up-to-Date (৳0 Due)
                      </span>
                    )}

                    {item.status === 'due_1_month' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5" /> 1 Month Due (৳50)
                      </span>
                    )}

                    {item.status === 'overdue' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" /> {item.totalMonthsDue} Months Due (৳{item.dueAmount})
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
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
