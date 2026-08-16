import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { DashboardView } from './components/DashboardView';
import { StudentRosterView } from './components/StudentRosterView';
import { MonthMatrixView } from './components/MonthMatrixView';
import { ExpenseTrackerView } from './components/ExpenseTrackerView';
import { FloatingAiAuditor } from './components/FloatingAiAuditor';

import { PaymentModal } from './components/modals/PaymentModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { StudentModal } from './components/modals/StudentModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { AdminPinModal } from './components/modals/AdminPinModal';
import { GoogleSheetSyncModal } from './components/modals/GoogleSheetSyncModal';

import { BatchConfig, Student, PaymentReceipt, Expense, FundStats, StudentFundStatus } from './types';
import { Loader2, AlertCircle, Sparkles, Building2, RefreshCw } from 'lucide-react';
import { SecLogo } from './components/SecLogo';
import { calculateFundDetails } from './utils/fundCalculator';
import { db, doc, collection, onSnapshot, getDoc, setDoc, deleteDoc } from './firebase';

const defaultEmptyConfig: BatchConfig = {
  batchName: 'CSE Batch-17',
  institution: 'Sylhet Engineering College',
  monthlyFee: 50,
  startMonth: '2026-08',
  managerName: 'Md. Rajib Hossain Sunny (CR)',
  contactPhone: '01790853898',
  bkashNumber: '01790853898',
  nagadNumber: '01790853898',
  adminPin: '',
  allowedAdminEmails: [],
  googleSheetPaymentsUrl: 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/edit?gid=0#gid=0',
  googleSheetExpensesUrl: 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/edit?gid=503096906#gid=503096906',
  googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbwEU4y1bjEKtLk25MW-nYrJWoKdJ79HbrD-N6pqAUCKXv_vGf97qveSMR19M1GF0TTX/exec',
  lastSyncTime: new Date().toISOString()
};

const defaultStats: FundStats = {
  totalCollected: 0,
  totalSpent: 0,
  netBalance: 0,
  totalStudents: 0,
  paidUpStudentsCount: 0,
  overdueStudentsCount: 0,
  collectionRate: 0,
  currentMonth: new Date().toISOString().slice(0, 7),
  thisMonthCollected: 0,
  thisMonthSpent: 0,
};

export default function App() {
  const [config, setConfig] = useState<BatchConfig>(defaultEmptyConfig);
  const [students, setStudents] = useState<Student[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<StudentFundStatus[]>([]);
  const [stats, setStats] = useState<FundStats>(defaultStats);
  const [allTargetMonths, setAllTargetMonths] = useState<string[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [liveDateStr, setLiveDateStr] = useState<string>('');
  const [liveTimeStr, setLiveTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
      setLiveTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Admin / Manager State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>(() => localStorage.getItem('sec_admin_email') || '');

  // Verify Admin Email Handler - Strict check against Firestore config/batch
  const handleVerifyEmail = async (emailToVerify: string, pinToVerify?: string, verifiedByGoogle?: boolean): Promise<boolean> => {
    try {
      const cleanEmail = emailToVerify.trim().toLowerCase();

      // Strict Config Query: Check doc(db, 'config', 'batch')
      const configSnap = await getDoc(doc(db, 'config', 'batch'));
      if (configSnap.exists()) {
        const configData = configSnap.data();
        const allowedList = Array.isArray(configData?.allowedAdminEmails)
          ? configData.allowedAdminEmails.map((e: any) => String(e || '').trim().toLowerCase())
          : [];
        if (!allowedList.includes(cleanEmail)) {
          throw new Error(`Access Denied! '${emailToVerify}' is not in the authorized admin list in Firestore config.`);
        }
      }

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
      setAdminEmail(data.email || emailToVerify);
      localStorage.setItem('sec_admin_email', data.email || emailToVerify);
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
      const webhookUrl = config?.googleSheetWebhookUrl || 'https://script.google.com/macros/s/AKfycbwEU4y1bjEKtLk25MW-nYrJWoKdJ79HbrD-N6pqAUCKXv_vGf97qveSMR19M1GF0TTX/exec';
      const sheetUrl = config?.googleSheetUrl || config?.googleSheetPaymentsUrl || 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/edit?gid=0#gid=0';

      let directData: { students?: any[]; expenses?: any[] } | undefined = undefined;

      // Attempt client-side GET request to webhook if available
      try {
        if (webhookUrl && webhookUrl.includes('script.google.com')) {
          const directRes = await fetch(webhookUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          if (directRes.ok) {
            const json = await directRes.json();
            if (json && (Array.isArray(json.students) || Array.isArray(json.expenses) || (json.data && (Array.isArray(json.data.students) || Array.isArray(json.data.expenses))))) {
              directData = {
                students: Array.isArray(json.students) ? json.students : json.data?.students,
                expenses: Array.isArray(json.expenses) ? json.expenses : json.data?.expenses,
              };
            }
          }
        }
      } catch (clientGetErr) {
        // Direct client fetch might hit CORS; backend handles server-side GET
        console.log('Client direct GET bypass, switching to server sync handler:', clientGetErr);
      }

      const res = await fetch('/api/fund/sync-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl || sheetUrl,
          type: 'all',
          students: directData?.students,
          expenses: directData?.expenses,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with Google Sheet');

      // Immediately refresh local state / UI
      await fetchFundData();
      setSyncToast({
        message: data.message || 'Google Sheet database synced successfully! All test data overwritten.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Sheet Sync error:', err);
      setSyncToast({ message: err.message || 'Sheet sync failed. Please check webhook URL.', type: 'error' });
    } finally {
      setIsSyncingSheet(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Real-time calculation whenever core collections update
  useEffect(() => {
    if (students.length > 0 || receipts.length > 0 || expenses.length > 0) {
      const { studentStatuses: calculatedStatuses, stats: calculatedStats, allTargetMonths: calculatedMonths } = calculateFundDetails(
        config,
        students,
        receipts,
        expenses
      );
      setStudentStatuses(calculatedStatuses);
      setStats(calculatedStats);
      setAllTargetMonths(calculatedMonths);
    }
  }, [config, students, receipts, expenses]);

  // Load Data with Real-Time Firebase Firestore Listeners
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    try {
      // 1. Real-time Config listener
      const unsubConfig = onSnapshot(
        doc(db, 'config', 'batch'),
        (snap) => {
          if (snap.exists()) {
            const newConfig = snap.data() as BatchConfig;
            setConfig(newConfig);

            // Instant Revocation: If currently verified admin email was removed from allowedAdminEmails in Firestore, immediately revoke access
            const currentStoredEmail = localStorage.getItem('sec_admin_email') || '';
            if (currentStoredEmail) {
              const allowedList = Array.isArray(newConfig?.allowedAdminEmails)
                ? newConfig.allowedAdminEmails.map((e) => String(e || '').trim().toLowerCase())
                : [];
              if (!allowedList.includes(currentStoredEmail.trim().toLowerCase())) {
                setIsAdmin(false);
                setAdminEmail('');
                setAdminPinInput('');
                localStorage.removeItem('sec_admin_email');
              }
            }
          }
        },
        (err) => console.warn('Firestore config onSnapshot error:', err)
      );
      unsubs.push(unsubConfig);

      // 2. Real-time Students listener
      const unsubStudents = onSnapshot(
        collection(db, 'students'),
        (snap) => {
          const stds = snap.docs.map((d) => d.data() as Student);
          if (stds.length > 0) {
            setStudents(stds);
          }
          setLoading(false);
        },
        (err) => console.warn('Firestore students onSnapshot error:', err)
      );
      unsubs.push(unsubStudents);

      // 3. Real-time Receipts listener
      const unsubReceipts = onSnapshot(
        collection(db, 'receipts'),
        (snap) => {
          const recs = snap.docs.map((d) => d.data() as PaymentReceipt);
          setReceipts(recs);
        },
        (err) => console.warn('Firestore receipts onSnapshot error:', err)
      );
      unsubs.push(unsubReceipts);

      // 4. Real-time Expenses listener
      const unsubExpenses = onSnapshot(
        collection(db, 'expenses'),
        (snap) => {
          const exps = snap.docs.map((d) => d.data() as Expense);
          setExpenses(exps);
        },
        (err) => console.warn('Firestore expenses onSnapshot error:', err)
      );
      unsubs.push(unsubExpenses);
    } catch (listenerErr) {
      console.warn('Realtime onSnapshot setup failed, falling back to server endpoints:', listenerErr);
    }

    // Also fetch initial data from backend API
    fetchFundData();

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {}
      });
    };
  }, []);

  // Fetch from Server API fallback
  const fetchFundData = async (retryCount = 0) => {
    try {
      const res = await fetch('/api/fund/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch fund data`);
      const data = await res.json();

      if (data) {
        if (data.config) {
          setConfig(data.config);
          // Instant Revocation check on API fetch too
          const currentStoredEmail = localStorage.getItem('sec_admin_email') || '';
          if (currentStoredEmail) {
            const allowedList = Array.isArray(data.config?.allowedAdminEmails)
              ? data.config.allowedAdminEmails.map((e: any) => String(e || '').trim().toLowerCase())
              : [];
            if (!allowedList.includes(currentStoredEmail.trim().toLowerCase())) {
              setIsAdmin(false);
              setAdminEmail('');
              setAdminPinInput('');
              localStorage.removeItem('sec_admin_email');
            }
          }
        }
        if (data.students) setStudents(data.students);
        if (data.receipts) setReceipts(data.receipts);
        if (data.expenses) setExpenses(data.expenses);
        if (data.studentStatuses) setStudentStatuses(data.studentStatuses);
        if (data.stats) setStats(data.stats);
        if (data.allTargetMonths) setAllTargetMonths(data.allTargetMonths);
        setError(null);
      }
      setLoading(false);
    } catch (err: any) {
      console.warn('fetchFundData error (attempt ' + retryCount + '):', err);
      if (retryCount < 4) {
        const delay = Math.min(1000 * Math.pow(1.5, retryCount), 4000);
        setTimeout(() => fetchFundData(retryCount + 1), delay);
      } else {
        setLoading(false);
      }
    }
  };

  // Strict PIN check against Firestore config (No hardcoded fallback)
  const handleVerifyPin = (pin: string): boolean => {
    const enteredPin = (pin || '').trim();
    if (config && config.adminPin && enteredPin && enteredPin === config.adminPin.trim()) {
      setIsAdmin(true);
      setAdminPinInput(enteredPin);
      return true;
    }
    return false;
  };

  // Submit Payment Receipt: App -> Firebase -> Sheet
  const handleAddPayment = async (paymentData: any) => {
    try {
      const receiptId = 'r_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const student = students.find((s) => s.roll === paymentData.studentRoll || s.id === paymentData.studentId);
      const studentName = paymentData.studentName || student?.name || 'Student ' + paymentData.studentRoll;
      const receiptObj: PaymentReceipt = {
        id: receiptId,
        receiptNo: paymentData.receiptNo || ('SEC17-PAY-' + Math.floor(1000 + Math.random() * 9000)),
        studentId: student?.id || ('s_' + (paymentData.studentRoll || '').trim().replace(/[^0-9a-zA-Z]/g, '')),
        studentRoll: paymentData.studentRoll,
        studentName,
        amount: Number(paymentData.amount) || 0,
        monthsPaid: Array.isArray(paymentData.monthsPaid) ? paymentData.monthsPaid : (paymentData.monthsPaid ? [paymentData.monthsPaid] : []),
        paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentData.paymentMethod || 'bKash',
        transactionRef: paymentData.transactionRef || '',
        collectorName: paymentData.collectorName || 'Batch Admin',
        notes: paymentData.notes || '',
        verified: true,
      };

      // 1. Direct write to Firebase Firestore
      try {
        await setDoc(doc(db, 'receipts', receiptId), receiptObj);
      } catch (firestoreErr) {
        console.warn('Direct Firestore receipt write warning:', firestoreErr);
      }

      // 2. Write to backend API (ensures server memory & Firestore consistency)
      const res = await fetch('/api/fund/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, payment: receiptObj }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      // 3. Keep sheet updated via direct Webhook doPost if configured
      const webhookUrl = config?.googleSheetWebhookUrl;
      if (webhookUrl && webhookUrl.includes('script.google.com')) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'payment', ...receiptObj }),
          mode: 'no-cors',
        }).catch((e) => console.warn('Direct Apps Script doPost notice:', e));
      }

      await fetchFundData();
      if (data.receipt || receiptObj) {
        setSelectedReceipt(data.receipt || receiptObj);
        setSelectedExpense(null);
        setIsReceiptModalOpen(true);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Submit Expense: App -> Firebase -> Sheet
  const handleAddExpense = async (expenseData: any) => {
    try {
      const expenseId = expenseData.id || ('e_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
      const expenseObj: Expense = {
        id: expenseId,
        voucherNo: expenseData.voucherNo || ('SEC17-EXP-' + Math.floor(100 + Math.random() * 900)),
        title: expenseData.title,
        amount: Number(expenseData.amount) || 0,
        category: expenseData.category || 'Other',
        date: expenseData.date || new Date().toISOString().split('T')[0],
        spentBy: expenseData.spentBy || 'Batch Admin',
        referenceDocUrl: expenseData.referenceDocUrl || '',
        notes: expenseData.notes || '',
      };

      // 1. Direct write to Firebase Firestore
      try {
        await setDoc(doc(db, 'expenses', expenseId), expenseObj);
      } catch (firestoreErr) {
        console.warn('Direct Firestore expense write warning:', firestoreErr);
      }

      // 2. Write to backend API
      const res = await fetch('/api/fund/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, expense: expenseObj }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add expense');

      // 3. Keep sheet updated via direct Webhook doPost if configured
      const webhookUrl = config?.googleSheetWebhookUrl;
      if (webhookUrl && webhookUrl.includes('script.google.com')) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'expense', ...expenseObj }),
          mode: 'no-cors',
        }).catch((e) => console.warn('Direct Apps Script doPost notice:', e));
      }

      await fetchFundData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Add / Edit Student: App -> Firebase -> Sheet
  const handleAddStudent = async (studentData: any) => {
    try {
      const cleanRollVal = String(studentData.roll || '').trim().replace(/[^0-9a-zA-Z]/g, '');
      const studentId = studentData.id || ('s_' + cleanRollVal);
      const studentObj: Student = {
        id: studentId,
        roll: studentData.roll,
        name: studentData.name,
        phone: studentData.phone || '',
        status: studentData.status || 'active',
        joinedMonth: studentData.joinedMonth || config?.startMonth || '2026-08',
      };

      // 1. Direct write to Firebase Firestore
      try {
        await setDoc(doc(db, 'students', studentId), studentObj);
      } catch (firestoreErr) {
        console.warn('Direct Firestore student write warning:', firestoreErr);
      }

      // 2. Write to backend API
      const res = await fetch('/api/fund/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, student: studentObj }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save student');

      // 3. Keep sheet updated via direct Webhook doPost if configured
      const webhookUrl = config?.googleSheetWebhookUrl;
      if (webhookUrl && webhookUrl.includes('script.google.com')) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'add_student',
            type: 'add_student',
            studentRoll: studentObj.roll,
            name: studentObj.name,
            phone: studentObj.phone,
          }),
          mode: 'no-cors',
        }).catch((e) => console.warn('Direct Apps Script doPost notice:', e));
      }

      await fetchFundData();
      setSyncToast({ message: `Student ${studentData.name} saved successfully!`, type: 'success' });
    } catch (err: any) {
      alert('Error saving student: ' + err.message);
    }
  };

  // Delete Student: App -> Firebase -> Sheet
  const handleDeleteStudent = async (student: Student) => {
    try {
      // 1. Direct delete from Firebase Firestore
      try {
        if (student.id) {
          await deleteDoc(doc(db, 'students', student.id));
        }
      } catch (firestoreErr) {
        console.warn('Direct Firestore student delete warning:', firestoreErr);
      }

      // 2. Delete on backend API
      const res = await fetch(`/api/fund/students/${encodeURIComponent(student.id || student.roll)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: adminPinInput,
          adminEmail,
          studentRoll: student.roll,
          studentId: student.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete student');

      // 3. Keep sheet updated via direct Webhook doPost if configured
      const webhookUrl = config?.googleSheetWebhookUrl;
      if (webhookUrl && webhookUrl.includes('script.google.com')) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'delete_student',
            type: 'delete_student',
            studentRoll: student.roll,
          }),
          mode: 'no-cors',
        }).catch((e) => console.warn('Direct Apps Script doPost notice:', e));
      }

      await fetchFundData();
      setSyncToast({ message: `Student ${student.name} (${student.roll}) deleted successfully!`, type: 'success' });
    } catch (err: any) {
      alert('Error deleting student: ' + err.message);
      await fetchFundData();
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

  if (loading && students.length === 0 && receipts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center max-w-md bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Connecting to SEC CSE-17 Fund...</h2>
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
            <h2 className="text-lg font-bold">Loading SEC CSE-17 Fund Dashboard...</h2>
            <p className="text-xs text-slate-400 mt-1">Developed by: Al Amin Kabir (CSE-17)</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9f6] text-slate-900 flex flex-col font-sans">
      
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
        liveDateStr={liveDateStr}
        liveTimeStr={liveTimeStr}
      />

      {syncToast && (
        <div className={`fixed bottom-20 right-5 sm:bottom-24 sm:right-6 z-50 px-4 py-3 rounded-xl text-white font-bold text-xs shadow-2xl flex items-center gap-2 transition-all ${syncToast.type === 'success' ? 'bg-emerald-600 border border-emerald-400/30' : 'bg-rose-600 border border-rose-400/30'}`}>
          <span>{syncToast.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-28">
        
        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <>
            <StatsCards stats={stats} monthlyFee={config.monthlyFee} />
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
          </>
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
            onDeleteStudent={handleDeleteStudent}
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
          />
        )}

      </main>

      {/* Global Floating AI Auditor Chatbot (FAB) */}
      <FloatingAiAuditor />

      {/* Footer with right padding clearance for the FAB */}
      <footer className="bg-white text-slate-600 border-t border-slate-200/80 py-6 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pr-20 sm:pr-24 lg:pr-28 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-slate-50 p-1 rounded-full shrink-0 flex items-center justify-center overflow-hidden border border-slate-200/80 shadow-2xs">
              <SecLogo className="w-7 h-7" />
            </div>
            <div className="flex flex-col min-w-0">
              <strong className="text-slate-900 font-bold break-words">Sylhet Engineering College</strong>
              <span className="text-slate-500 font-medium break-words whitespace-normal">Department of Computer Science & Engineering.</span>
            </div>
          </div>

          <div className="text-slate-500 text-center sm:text-right font-medium min-w-0 break-words whitespace-normal">
            <span>Developed by: <strong className="text-slate-800">Al Amin Kabir (CSE-17)</strong></span>
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
        config={config}
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
