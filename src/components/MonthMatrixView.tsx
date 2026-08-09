import React, { useState, useRef } from 'react';
import { Check, X, Search, Calendar, ChevronLeft, ChevronRight, Download, FileSpreadsheet } from 'lucide-react';
import { StudentFundStatus } from '../types';

interface MonthMatrixViewProps {
  studentStatuses: StudentFundStatus[];
  allTargetMonths: string[];
}

export const MonthMatrixView: React.FC<MonthMatrixViewProps> = ({
  studentStatuses,
  allTargetMonths,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<'ALL' | '2026' | '2027' | '2028'>('ALL');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter months based on year filter
  const visibleMonths = allTargetMonths.filter((m) => {
    if (selectedYearFilter === '2026') return m.startsWith('2026');
    if (selectedYearFilter === '2027') return m.startsWith('2027');
    if (selectedYearFilter === '2028') return m.startsWith('2028');
    return true;
  });

  const filtered = studentStatuses.filter(
    (item) =>
      item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  // Export matrix data as CSV for Google Sheets
  const handleExportCSV = () => {
    const headers = ['Roll', 'Name', ...visibleMonths, 'Total Paid Months', 'Total Due Months'];
    const rows = filtered.map((item) => {
      const paidSet = new Set(item.monthsPaidList);
      const monthCols = visibleMonths.map((m) => (paidSet.has(m) ? 'PAID' : 'DUE'));
      return [
        `"${item.student.roll}"`,
        `"${item.student.name}"`,
        ...monthCols,
        item.monthsPaidList.length,
        item.totalMonthsDue,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SEC_CSE_Batch17_Fund_Matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter & Scroll Control Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> Month-by-Month Contribution Tracker
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              August 2026 – January 2028 batch payment matrix (৳50/mo fee). Use arrows or toggles to view up to Jan 2028.
            </p>
          </div>

          {/* Controls: Search, Export & Horizontal Scroll Toggles */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student roll or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Export CSV for Google Sheet */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-200"
              title="Export as CSV for Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            {/* Scroll Navigation Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={scrollLeft}
                className="p-1 hover:bg-white text-slate-700 rounded transition shadow-2xs"
                title="Scroll Left (Previous Months)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-600 px-1">Scroll Months</span>
              <button
                onClick={scrollRight}
                className="p-1 hover:bg-emerald-600 text-white bg-emerald-500 rounded transition shadow-2xs flex items-center gap-0.5 px-2"
                title="Scroll Right to Jan 2028"
              >
                <span className="text-[10px] font-extrabold uppercase">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Year Toggle Tabs & Status Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 px-2 hidden sm:inline">Year View:</span>
            <button
              onClick={() => setSelectedYearFilter('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                selectedYearFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              All (Aug 2026 - Jan 2028)
            </button>
            <button
              onClick={() => setSelectedYearFilter('2026')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                selectedYearFilter === '2026'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              2026 (Aug-Dec)
            </button>
            <button
              onClick={() => setSelectedYearFilter('2027')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                selectedYearFilter === '2027'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              2027 (Full Year)
            </button>
            <button
              onClick={() => setSelectedYearFilter('2028')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                selectedYearFilter === '2028'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              2028 (Jan)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Paid
            </span>
            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Due
            </span>
          </div>
        </div>
      </div>

      {/* Grid Table Container with Horizontal Scroll Ref */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
        {/* Table Right Arrow Indicator Overlay */}
        <div className="absolute right-2 top-3 z-30 pointer-events-none hidden sm:flex items-center gap-1 bg-slate-900/80 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-xs">
          <span>Scroll ▶</span>
        </div>

        <div ref={scrollContainerRef} className="overflow-x-auto scroll-smooth">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead className="bg-slate-900 text-white font-mono sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3 border-b border-slate-800 sticky left-0 z-20 bg-slate-900 font-bold min-w-[140px]">
                  Roll & Student
                </th>
                {visibleMonths.map((m) => (
                  <th key={m} className="py-3 px-2 text-center border-b border-slate-800 font-semibold min-w-[75px]">
                    <div className="text-[11px] text-emerald-400 font-bold">{m}</div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center border-b border-slate-800 font-bold min-w-[90px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {[...filtered]
                .sort((a, b) => Number(a.student.roll) - Number(b.student.roll))
                .map((item) => {
                const paidSet = new Set(item.monthsPaidList);
                return (
                  <tr key={item.student.id} className="hover:bg-slate-50/90 transition">
                    {/* Sticky Left Name Column */}
                    <td className="py-2.5 px-3 sticky left-0 bg-white hover:bg-slate-50 border-r border-slate-200 z-10 shadow-xs">
                      <div className="font-mono font-bold text-slate-900">{item.student.roll}</div>
                      <div className="text-[11px] text-slate-600 truncate max-w-[120px]">{item.student.name}</div>
                    </td>

                    {/* Month status cells */}
                    {visibleMonths.map((month) => {
                      const isPaid = paidSet.has(month);
                      return (
                        <td key={month} className="py-2 px-1 text-center border-r border-slate-100">
                          {isPaid ? (
                            <span
                              title={`Paid for ${month}`}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500 text-white font-bold shadow-xs mx-auto"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span
                              title={`Due for ${month}`}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-100 text-rose-600 font-bold mx-auto border border-rose-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </span>
                          ) /* paid check end */}
                        </td>
                      );
                    })}

                    {/* Total Paid / Total Due summary badge */}
                    <td className="py-2 px-2 text-center font-bold">
                      <span
                        className={`inline-block px-2 py-1 rounded text-[11px] ${
                          item.totalMonthsDue === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.monthsPaidList.length}/{allTargetMonths.length} Mo
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleMonths.length + 2} className="py-12 text-center text-slate-400 text-sm">
                    No student records found.
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
