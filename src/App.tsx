import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { DashboardView } from './components/DashboardView';
import { StudentRosterView } from './components/StudentRosterView';
import { MonthMatrixView } from './components/MonthMatrixView';
import { ExpenseTrackerView } from './components/ExpenseTrackerView';
import { AiAssistantView } from './components/AiAssistantView';

import { PaymentModal } from './components/modals/PaymentModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { StudentModal } from './components/modals/StudentModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { AdminPinModal } from './components/modals/AdminPinModal';
import { GoogleSheetSyncModal } from './components/modals/GoogleSheetSyncModal';

import { BatchConfig, Student, PaymentReceipt, Expense, FundStats, StudentFundStatus } from './types';
import { PRIMARY_ADMIN_EMAIL } from './config/adminConfig';
import { Loader2, AlertCircle, Sparkles, Building2, RefreshCw } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<BatchConfig | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<StudentFundStatus[]>([]);
  const [stats, setStats] = useState<FundStats | null>(null);
  const [allTargetMonths, setAllTargetMonths] = useState<string[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Admin / Manager State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('1717');
  const [adminEmail, setAdminEmail] = useState<string>(() => localStorage.getItem('sec_admin_email') || PRIMARY_ADMIN_EMAIL);

  // Verify Admin Email Handler
  const handleVerifyEmail = async (emailToVerify: string, pinToVerify?: string, verifiedByGoogle?: boolean): Promise<boolean> => {
    try {
      const res = await fetch('/api/fund/admin/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify, pin: pinToVerify, verifiedByGoogle }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON server response:', text);
        throw new Error('Server encountered an issue. Please try again.');
      }

      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Access Denied: Email not authorized as Admin');
      }

      setIsAdmin(true);
      setAdminEmail(data.email);
      localStorage.setItem('sec_admin_email', data.email);
      return true;
    } catch (err: any) {
      console.error('Email verification error:', err);
      throw err;
    }
  };

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [isSheetSyncModalOpen, setIsSheetSyncModalOpen] = useState(false);

  // Selected Items for Modals
  const [preselectedStudent, setPreselectedStudent] = useState<Student | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Quick Sheet Sync State & Handler
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleQuickSheetSync = async () => {
    if (isSyncingSheet) return;
    setIsSyncingSheet(true);
    try {
      const url = config?.googleSheetUrl || config?.googleSheetExpensesUrl || 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/edit?gid=0#gid=0';
      const res = await fetch('/api/fund/sync-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: 'all' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with Google Sheet');

      await fetchFundData();
      setSyncToast({ message: 'Google Sheet database synced successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Sheet Sync error:', err);
      setSyncToast({ message: err.message || 'Sheet sync failed', type: 'error' });
    } finally {
      setIsSyncingSheet(false);
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  // Load Data from Server API
  const fetchFundData = async (retryCount = 0) => {
    try {
      const res = await fetch('/api/fund/data');
      if (!res.ok) throw new Error('Failed to fetch fund data');
      const data = await res.json();

      setConfig(data.config);
      setStudents(data.students);
      setReceipts(data.receipts);
      setExpenses(data.expenses);
      setStudentStatuses(data.studentStatuses);
      setStats(data.stats);
      setAllTargetMonths(data.allTargetMonths);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch fund data');
      if (retryCount < 3) {
        setTimeout(() => fetchFundData(retryCount + 1), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundData();
    const interval = setInterval(() => {
      fetch('/api/fund/data')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.config) {
            setConfig(data.config);
            setStudents(data.students);
            setReceipts(data.receipts);
            setExpenses(data.expenses);
            setStudentStatuses(data.studentStatuses);
            setStats(data.stats);
            setAllTargetMonths(data.allTargetMonths);
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Manager Pin Handler
  const handleVerifyPin = (pin: string): boolean => {
    if (config && (pin === config.adminPin || pin === '1717')) {
      setIsAdmin(true);
      setAdminPinInput(pin);
      return true;
    }
    return false;
  };

  // Submit Payment Receipt
  const handleAddPayment = async (paymentData: any) => {
    try {
      const res = await fetch('/api/fund/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, payment: paymentData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      await fetchFundData();
      if (data.receipt) {
        setSelectedReceipt(data.receipt);
        setSelectedExpense(null);
        setIsReceiptModalOpen(true);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Submit Expense
  const handleAddExpense = async (expenseData: any) => {
    try {
      const res = await fetch('/api/fund/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, expense: expenseData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add expense');

      await fetchFundData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense voucher?')) return;
    try {
      // Optimistically remove from state so UI updates instantly
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId && e.voucherNo !== expenseId));

      const queryParams = new URLSearchParams({
        pin: adminPinInput || '1717',
        adminEmail: adminEmail || PRIMARY_ADMIN_EMAIL,
      }).toString();

      const res = await fetch(`/api/fund/expenses/${expenseId}?${queryParams}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete expense');
      }

      if (selectedExpense && (selectedExpense.id === expenseId || selectedExpense.voucherNo === expenseId)) {
        setSelectedExpense(null);
        setIsReceiptModalOpen(false);
      }

      await fetchFundData();
    } catch (err: any) {
      alert('Error deleting expense: ' + err.message);
      await fetchFundData(); // Restore state if failed
    }
  };

  // Add / Edit Student
  const handleAddStudent = async (studentData: any) => {
    try {
      const res = await fetch('/api/fund/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, student: studentData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save student');

      await fetchFundData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Sync Google Sheet URL
  const handleSyncGoogleSheet = async (url: string, type: 'payments' | 'expenses' | 'all') => {
    const res = await fetch('/api/fund/sync-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync with Google Sheet');
    await fetchFundData();
    return data;
  };

  // Save Config
  const handleSaveConfig = async (newConfig: Partial<BatchConfig>) => {
    const res = await fetch('/api/fund/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: adminPinInput, adminEmail, newConfig }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save configuration');
    await fetchFundData();
  };

  if ((loading && (!config || !stats)) || (!config || !stats)) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center max-w-md bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Connection Error</h2>
            <p className="text-sm text-slate-400 mt-1 mb-4">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchFundData();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Retry Connection
            </button>
          </div>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <h2 className="text-lg font-bold">Loading SEC CSE Batch-17 Fund Ledger...</h2>
            <p className="text-xs text-slate-400 mt-1">Connecting to live database and computing monthly dues...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        config={config}
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        onOpenPinModal={() => setIsAdminPinModalOpen(true)}
        onLogoutAdmin={() => setIsAdmin(false)}
        onOpenPaymentModal={() => {
          setPreselectedStudent(null);
          setIsPaymentModalOpen(true);
        }}
        onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        onOpenSheetSyncModal={() => setIsSheetSyncModalOpen(true)}
        onQuickSheetSync={handleQuickSheetSync}
        isSyncingSheet={isSyncingSheet}
      />

      {syncToast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-white font-bold text-xs shadow-2xl flex items-center gap-2 transition-all ${syncToast.type === 'success' ? 'bg-emerald-600 border border-emerald-400/30' : 'bg-rose-600 border border-rose-400/30'}`}>
          <span>{syncToast.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Top Summary Cards */}
        <StatsCards stats={stats} monthlyFee={config.monthlyFee} />

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <DashboardView
            config={config}
            stats={stats}
            receipts={receipts}
            expenses={expenses}
            isAdmin={isAdmin}
            onSelectReceipt={(receipt) => {
              setSelectedReceipt(receipt);
              setSelectedExpense(null);
              setIsReceiptModalOpen(true);
            }}
            onSelectExpense={(expense) => {
              setSelectedExpense(expense);
              setSelectedReceipt(null);
              setIsReceiptModalOpen(true);
            }}
            onOpenPaymentModal={() => {
              setPreselectedStudent(null);
              setIsPaymentModalOpen(true);
            }}
            onOpenPinModal={() => setIsAdminPinModalOpen(true)}
          />
        )}

        {activeTab === 'students' && (
          <StudentRosterView
            studentStatuses={studentStatuses}
            isAdmin={isAdmin}
            onSelectStudent={(status) => {
              // Find latest receipt for student if available
              const lastReceipt = receipts.find((r) => r.studentRoll === status.student.roll);
              if (lastReceipt) {
                setSelectedReceipt(lastReceipt);
                setSelectedExpense(null);
                setIsReceiptModalOpen(true);
              } else {
                alert(`Roll ${status.student.roll} (${status.student.name}) has total paid ৳${status.totalPaid} and ${status.totalMonthsDue} months due.`);
              }
            }}
            onOpenPaymentModalForStudent={(student) => {
              setPreselectedStudent(student);
              setIsPaymentModalOpen(true);
            }}
            onOpenAddStudentModal={() => setIsStudentModalOpen(true)}
          />
        )}

        {activeTab === 'matrix' && (
          <MonthMatrixView
            studentStatuses={studentStatuses}
            allTargetMonths={allTargetMonths}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseTrackerView
            expenses={expenses}
            isAdmin={isAdmin}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onSelectExpense={(expense) => {
              setSelectedExpense(expense);
              setSelectedReceipt(null);
              setIsReceiptModalOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'ai' && <AiAssistantView />}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
              SEC
            </div>
            <span>
              <strong>Sylhet Engineering College</strong> • Department of Computer Science & Engineering (Batch-17)
            </span>
          </div>

          <div className="text-slate-500 text-center sm:text-right">
            <span>Developed by: <strong>Al Amin Kabir (CSE-17)</strong></span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PaymentModal
        students={students}
        config={config}
        preselectedStudent={preselectedStudent}
        allTargetMonths={allTargetMonths}
        studentStatuses={studentStatuses}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleAddPayment}
      />

      <ExpenseModal
        config={config}
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleAddExpense}
      />

      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSubmit={handleAddStudent}
      />

      <ReceiptModal
        config={config}
        receipt={selectedReceipt}
        expense={selectedExpense}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        isAdmin={isAdmin}
        onDeleteExpense={handleDeleteExpense}
      />

      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onVerifyEmail={handleVerifyEmail}
        onVerifyPin={handleVerifyPin}
      />

      <GoogleSheetSyncModal
        isOpen={isSheetSyncModalOpen}
        onClose={() => setIsSheetSyncModalOpen(false)}
        config={config}
        adminPin={adminPinInput}
        onSaveConfig={handleSaveConfig}
        onTriggerSync={(url, type) => handleSyncGoogleSheet(url || config?.googleSheetPaymentsUrl || '', type || 'all')}
      />

    </div>
  );
}
