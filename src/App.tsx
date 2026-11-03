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
import { EditReceiptModal } from './components/modals/EditReceiptModal';
import { EditExpenseModal } from './components/modals/EditExpenseModal';
import { BatchConfig, Student, PaymentReceipt, Expense, FundStats, StudentFundStatus } from './types';
import { Loader2, AlertCircle, Sparkles, Building2, RefreshCw } from 'lucide-react';
import { SecLogo } from './components/SecLogo';
import { calculateFundDetails } from './utils/fundCalculator';
import { compareStudents } from './utils/studentSorter';
import { db, doc, collection, onSnapshot, getDoc, setDoc, updateDoc, deleteDoc, handleFirestoreError, OperationType } from './firebase';

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
  googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbz3LZfvJSVokHI5BNv1mSXtBX2EtsP_mIVb1Mp-01sVm1kLHbcEt1VMIt4-7tvifYq3/exec',
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
  const [sheetSummary, setSheetSummary] = useState<{
    netBalance: number;
    totalFund: number;
    totalExpense: number;
  } | null>(null);
  
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
      let configSnap;
      try {
        configSnap = await getDoc(doc(db, 'config', 'batch'));
      } catch (docErr: any) {
        if (docErr?.code === 'permission-denied' || docErr?.message?.includes('Missing or insufficient permissions')) {
          handleFirestoreError(docErr, OperationType.GET, 'config/batch');
        }
        throw docErr;
      }
      if (configSnap.exists()) {
        const configData = configSnap.data();
        const allowedList = Array.isArray(configData?.allowedAdminEmails)
          ? configData.allowedAdminEmails.map((e: any) => String(e || '').trim().toLowerCase())
          : [];
        if (!allowedList.includes(cleanEmail)) {
          throw new Error(`Access Denied! '${emailToVerify}' is not in the authorized admin list in Firestore config.`);
        }
      }

      const res = await fetch(`/api/fund/admin/verify-email?t=${new Date().getTime()}`, {
        method: 'POST',
        cache: 'no-store',
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
  const [isEditReceiptModalOpen, setIsEditReceiptModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<PaymentReceipt | null>(null);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Quick Sheet Sync State & Handler
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleQuickSheetSync = async () => {
    if (isSyncingSheet) return;
    setIsSyncingSheet(true);
    try {
      const webhookUrl = config?.googleSheetWebhookUrl || 'https://script.google.com/macros/s/AKfycbz3LZfvJSVokHI5BNv1mSXtBX2EtsP_mIVb1Mp-01sVm1kLHbcEt1VMIt4-7tvifYq3/exec';
      const sheetUrl = config?.googleSheetUrl || config?.googleSheetPaymentsUrl || 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/edit?gid=0#gid=0';

      let directData: { students?: any[]; expenses?: any[] } | undefined = undefined;

      // Attempt client-side GET request to webhook if available
      try {
        if (webhookUrl && webhookUrl.includes('script.google.com')) {
          const directRes = await fetch(`${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`, {
            method: 'GET',
            cache: 'no-store',
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

      const res = await fetch(`/api/fund/sync-google-sheet?t=${new Date().getTime()}`, {
        method: 'POST',
        cache: 'no-store',
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

  // Rule 4: Real-time calculation with Sheet-Driven Summary for Net Balance, Total Expense, Total Fund
  useEffect(() => {
    const { studentStatuses: calculatedStatuses, stats: calculatedStats, allTargetMonths: calculatedMonths } = calculateFundDetails(
      config,
      students,
      receipts,
      expenses
    );

    // Rule 4: UI Dashboard (Net Balance, Total Expense, Total Fund) does NOT calculate from Firebase;
    // It fetches directly from the Google Sheet permanent ledger (doGet endpoint)
    if (sheetSummary) {
      calculatedStats.netBalance = sheetSummary.netBalance;
      calculatedStats.totalCollected = sheetSummary.totalFund;
      calculatedStats.totalSpent = sheetSummary.totalExpense;
    }

    setStudentStatuses(calculatedStatuses);
    setStats(calculatedStats);
    setAllTargetMonths(calculatedMonths);
  }, [config, students, receipts, expenses, sheetSummary]);

  // Load Data: Firebase Real-Time Listeners (UI Lists) + Google Sheet Permanent Summary (Dashboard)
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    try {
      // 1. Real-time Config listener on `config/batch` for instant Admin Auth & Dynamic Config
      const unsubConfig = onSnapshot(
        doc(db, 'config', 'batch'),
        (snap) => {
          if (snap.exists()) {
            const newConfig = snap.data() as BatchConfig;
            setConfig(newConfig);

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
        (err) => {
          console.warn('Firestore config onSnapshot error:', err);
          handleFirestoreError(err, OperationType.GET, 'config/batch');
        }
      );
      unsubs.push(unsubConfig);

      // 2. Real-time Students listener on `students` collection
      const unsubStudents = onSnapshot(
        collection(db, 'students'),
        (snap) => {
          const map = new Map<string, Student>();
          snap.forEach((docSnap) => {
            const data = docSnap.data() as Student;
            if (data && (data.roll || data.name)) {
              map.set(docSnap.id, { ...data, id: docSnap.id });
            }
          });
          const list = Array.from(map.values());
          list.sort(compareStudents);
          if (list.length > 0 || !snap.empty) {
            setStudents(list);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Firestore students onSnapshot error:', err);
          handleFirestoreError(err, OperationType.LIST, 'students');
        }
      );
      unsubs.push(unsubStudents);

      // 3. Real-time Receipts listener on `receipts` collection
      const unsubReceipts = onSnapshot(
        collection(db, 'receipts'),
        (snap) => {
          const map = new Map<string, PaymentReceipt>();
          snap.forEach((docSnap) => {
            const data = docSnap.data() as PaymentReceipt;
            if (data && (data.receiptNo || data.amount !== undefined)) {
              map.set(docSnap.id, { ...data, id: docSnap.id });
            }
          });
          const list = Array.from(map.values());
          list.sort((a, b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
          setReceipts(list);
        },
        (err) => {
          console.warn('Firestore receipts onSnapshot error:', err);
          handleFirestoreError(err, OperationType.LIST, 'receipts');
        }
      );
      unsubs.push(unsubReceipts);

      // 4. Real-time Expenses listener on `expenses` collection
      const unsubExpenses = onSnapshot(
        collection(db, 'expenses'),
        (snap) => {
          const map = new Map<string, Expense>();
          snap.forEach((docSnap) => {
            const data = docSnap.data() as Expense;
            if (data && (data.voucherNo || data.title || data.amount !== undefined)) {
              map.set(docSnap.id, { ...data, id: docSnap.id });
            }
          });
          const list = Array.from(map.values());
          list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setExpenses(list);
        },
        (err) => {
          console.warn('Firestore expenses onSnapshot error:', err);
          handleFirestoreError(err, OperationType.LIST, 'expenses');
        }
      );
      unsubs.push(unsubExpenses);
    } catch (listenerErr) {
      console.warn('Realtime onSnapshot setup failed:', listenerErr);
    }

    // Initial fetch of full data and permanent sheet summary
    fetchFundData();
    fetchSheetSummary();

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {}
      });
    };
  }, []);

  // Rule 4: Fetch summary calculations directly from Google Sheet (doGet endpoint) with Cache-Control: no-store
  const fetchSheetSummary = async () => {
    const timestamp = new Date().getTime();
    const webhookUrl = config?.googleSheetWebhookUrl;

    // Direct browser doGet fetch if webhook URL is configured
    if (webhookUrl && webhookUrl.includes('script.google.com')) {
      try {
        const u = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
        const directRes = await fetch(u, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-store',
            'Accept': 'application/json, text/plain, */*',
          },
        });
        if (directRes.ok) {
          const directJson = await directRes.json();
          if (directJson && (directJson.totalFund !== undefined || directJson.totalCollected !== undefined || directJson.netBalance !== undefined)) {
            const tf = Number(directJson.totalFund ?? directJson.totalCollected ?? 0);
            const te = Number(directJson.totalExpense ?? directJson.totalSpent ?? 0);
            const nb = Number(directJson.netBalance ?? (tf - te));
            setSheetSummary({ netBalance: nb, totalFund: tf, totalExpense: te });
            return;
          }
        }
      } catch (directErr) {
        // Direct browser GET hit CORS or doGet is not returning JSON, falling back to server proxy
      }
    }

    // Server-side proxy with strict Cache-Control: no-store
    try {
      const res = await fetch(`/api/fund/sheet-summary?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const tf = Number(data.totalFund ?? data.totalCollected ?? 0);
          const te = Number(data.totalExpense ?? data.totalSpent ?? 0);
          const nb = Number(data.netBalance ?? (tf - te));
          setSheetSummary({ netBalance: nb, totalFund: tf, totalExpense: te });
        }
      }
    } catch (err) {
      console.warn('fetchSheetSummary server notice:', err);
    }
  };

  // Fetch from Server API (Source of Truth: Google Sheet Mirror) - Strict anti-caching & timestamp cache buster
  const fetchFundData = async (retryCount = 0) => {
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/fund/data?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
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
        setStudents(Array.isArray(data.students) ? [...data.students].sort(compareStudents) : []);
        setReceipts(Array.isArray(data.receipts) ? data.receipts : []);
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
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

  // 1. Submit Payment Receipt: Firebase FIRST -> Google Sheet SECOND -> Backend
  const handleAddPayment = async (paymentData: any) => {
    try {
      const receiptId = 'r_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const student = students.find((s) => s.roll === paymentData.studentRoll || s.id === paymentData.studentId);
      const studentRoll = paymentData.studentRoll || student?.roll || '';
      const studentName = paymentData.studentName || student?.name || 'Student ' + studentRoll;
      const paymentAmount = Number(paymentData.amount) || 0;
      const newStatus = (student?.status || 'active') as 'active' | 'inactive';

      // Calculate Payment Accumulation: Combine prior total with new payment
      const studentStatus = studentStatuses.find((st) => st.student.roll === studentRoll || st.student.id === (student?.id || ''));
      const receiptsTotal = receipts
        .filter((r) => r.studentRoll === studentRoll || (student && r.studentId === student.id))
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const currentPaid = Math.max(
        Number(student?.totalPaid || 0),
        Number(studentStatus?.totalPaid || 0),
        receiptsTotal
      );
      const updatedTotalPaid = currentPaid + paymentAmount;

      const receiptObj: PaymentReceipt = {
        id: receiptId,
        receiptNo: paymentData.receiptNo || ('SEC17-PAY-' + Math.floor(1000 + Math.random() * 9000)),
        studentId: student?.id || ('s_' + studentRoll.trim().replace(/[^0-9a-zA-Z]/g, '')),
        studentRoll,
        studentName,
        amount: paymentAmount,
        monthsPaid: Array.isArray(paymentData.monthsPaid) ? paymentData.monthsPaid : (paymentData.monthsPaid ? [paymentData.monthsPaid] : []),
        paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentData.paymentMethod || 'bKash',
        transactionRef: paymentData.transactionRef || '',
        collectorName: paymentData.collectorName || 'Batch Admin',
        notes: paymentData.notes || '',
        verified: true,
      };

      // STEP 1: Write FIRST to Firebase Firestore (using setDoc)
      try {
        await setDoc(doc(db, 'receipts', receiptId), receiptObj, { merge: true });
      } catch (err: any) {
        if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
          handleFirestoreError(err, OperationType.WRITE, `receipts/${receiptId}`);
        }
        console.warn('Firestore setDoc receipts notice:', err);
      }

      // Update student record in Firestore `students` collection (totalPaid & status)
      const studentDocId = student?.id || ('s_' + studentRoll.trim().replace(/[^0-9a-zA-Z]/g, ''));
      try {
        await setDoc(doc(db, 'students', studentDocId), {
          id: studentDocId,
          roll: studentRoll,
          name: studentName,
          phone: student?.phone || '',
          status: newStatus,
          joinedMonth: student?.joinedMonth || config?.startMonth || '2026-08',
          totalPaid: updatedTotalPaid,
        }, { merge: true });
      } catch (studentErr: any) {
        if (studentErr?.code === 'permission-denied' || studentErr?.message?.includes('Missing or insufficient permissions')) {
          handleFirestoreError(studentErr, OperationType.WRITE, `students/${studentDocId}`);
        }
        console.warn('Firestore student totalPaid update notice:', studentErr);
      }

      // STEP 2: IMMEDIATELY after successful Firebase write, trigger POST request to Google Apps Script Webhook
      // Rule 3: For Payments, send: { type: 'payment', receiptNo, studentName, studentRoll, amount, date, collectedBy, notes }
      const webhookUrl = config?.googleSheetWebhookUrl;
      if (webhookUrl && webhookUrl.includes('script.google.com')) {
        try {
          await fetch(`${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-store',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              type: 'payment',
              receiptNo: receiptObj.receiptNo,
              studentName: receiptObj.studentName,
              studentRoll: receiptObj.studentRoll,
              amount: receiptObj.amount,
              date: receiptObj.paymentDate,
              collectedBy: receiptObj.collectorName || 'Batch Admin',
              notes: receiptObj.notes || '',
              roll: receiptObj.studentRoll,
              totalPaid: updatedTotalPaid,
              status: newStatus,
              monthsPaid: receiptObj.monthsPaid,
            }),
          });
        } catch (e) {
          console.warn('Apps Script doPost payment notice:', e);
        }
      }

      // STEP 3: Sync to backend API
      const res = await fetch(`/api/fund/payments?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, payment: receiptObj }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      // STEP 4: Fetch Sheet permanent summary after giving Sheet write time
      setTimeout(() => fetchSheetSummary(), 1500);

      if (data.receipt || receiptObj) {
        setSelectedReceipt(data.receipt || receiptObj);
        setSelectedExpense(null);
        setIsReceiptModalOpen(true);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // 2. Submit Expense: Firebase FIRST -> Google Sheet SECOND -> Backend
  const handleAddExpense = async (expenseData: any) => {
    try {
      const expenseId = expenseData.id || ('e_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
      const voucherNo = expenseData.voucherNo || ('SEC17-EXP-' + Math.floor(100 + Math.random() * 900));
      const title = expenseData.title || '';
      const category = expenseData.category || 'Other';
      const amount = Number(expenseData.amount) || 0;
      const date = expenseData.date || new Date().toISOString().split('T')[0];
      const spentBy = expenseData.spentBy || 'Batch Admin';

      const expenseObj: Expense = {
        id: expenseId,
        voucherNo,
        title,
        amount,
        category,
        date,
        spentBy,
        referenceDocUrl: expenseData.referenceDocUrl || '',
        notes: expenseData.notes || '',
      };

      // STEP 1: Write FIRST to Firebase Firestore (using setDoc)
      try {
        await setDoc(doc(db, 'expenses', expenseId), expenseObj, { merge: true });
      } catch (err: any) {
        if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
          handleFirestoreError(err, OperationType.WRITE, `expenses/${expenseId}`);
        }
        console.warn('Firestore setDoc expenses notice:', err);
      }

      // STEP 2: IMMEDIATELY after successful Firebase write, trigger POST request to Google Apps Script Webhook
      // Rule 3: For Expenses, send: { type: 'expense', voucherNo, title, amount, date, spentBy, category }
      const webhookUrl = config?.googleSheetWebhookUrl;
      if (webhookUrl && webhookUrl.includes('script.google.com')) {
        try {
          await fetch(`${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-store',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              type: 'expense',
              voucherNo: expenseObj.voucherNo,
              title: expenseObj.title,
              amount: expenseObj.amount,
              date: expenseObj.date,
              spentBy: expenseObj.spentBy,
              category: expenseObj.category,
              notes: expenseObj.notes || '',
            }),
          });
        } catch (e) {
          console.warn('Apps Script doPost expense notice:', e);
        }
      }

      // STEP 3: Sync to backend API
      const res = await fetch(`/api/fund/expenses?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, expense: expenseObj }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add expense');

      // STEP 4: Fetch Sheet permanent summary
      setTimeout(() => fetchSheetSummary(), 1500);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // 3. Add / Edit Student: Firebase FIRST -> Google Sheet SECOND -> Backend
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

      // STEP 1: Write FIRST to Firebase Firestore (using setDoc)
      try {
        await setDoc(doc(db, 'students', studentId), studentObj, { merge: true });
      } catch (err: any) {
        if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
          handleFirestoreError(err, OperationType.WRITE, `students/${studentId}`);
        }
        console.warn('Firestore setDoc students notice:', err);
      }

      // STEP 2: IMMEDIATELY after successful Firebase write, trigger POST request to Google Apps Script Webhook
      const webhookUrl = config?.googleSheetWebhookUrl;
      if (webhookUrl && webhookUrl.includes('script.google.com')) {
        try {
          await fetch(`${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-store',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              type: 'add_student',
              action: 'add_student',
              studentRoll: studentObj.roll,
              roll: studentObj.roll,
              name: studentObj.name,
              studentName: studentObj.name,
              phone: studentObj.phone,
              status: studentObj.status,
              joinedMonth: studentObj.joinedMonth,
            }),
          });
        } catch (e) {
          console.warn('Apps Script doPost add_student notice:', e);
        }
      }

      // STEP 3: Write to backend API
      const res = await fetch(`/api/fund/students?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput, adminEmail, student: studentObj }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save student');

      setSyncToast({ message: `Student ${studentData.name} saved successfully!`, type: 'success' });
      setTimeout(() => fetchSheetSummary(), 1500);
    } catch (err: any) {
      alert('Error saving student: ' + err.message);
    }
  };

  // 4. Delete Student: Firebase ONLY (Rule 2: DO NOT delete from Google Sheet; Sheet remains permanent append-only ledger)
  const handleDeleteStudent = async (student: Student) => {
    try {
      // STEP 1: Execute deleteDoc in Firebase Firestore
      try {
        await deleteDoc(doc(db, 'students', student.id));
        if (student.roll && student.roll !== student.id) {
          try { await deleteDoc(doc(db, 'students', student.roll)); } catch (e) {}
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
          handleFirestoreError(err, OperationType.DELETE, `students/${student.id}`);
        }
        console.warn('Firestore deleteDoc students notice:', err);
      }

      // Clean up receipts for this student from Firebase Firestore
      const studentReceipts = receipts.filter(
        (r) => r.studentId === student.id || r.studentRoll === student.roll
      );
      for (const r of studentReceipts) {
        try { await deleteDoc(doc(db, 'receipts', r.id)); } catch (e) {}
      }

      // STEP 2: DO NOT send delete request to Google Sheet Webhook!
      // The Google Sheet remains a permanent, indestructible append-only ledger.

      // STEP 3: Delete on backend API (removes from active server memory and Firestore)
      const res = await fetch(`/api/fund/students/${encodeURIComponent(student.id || student.roll)}?t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
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

      setSyncToast({ message: `Student ${student.name} (${student.roll}) removed from Firebase! Sheet ledger preserved.`, type: 'success' });
    } catch (err: any) {
      alert('Error deleting student: ' + err.message);
    }
  };

  // 5. Delete Receipt (Firestore 'receipts' collection & recalculate student totalPaid)
  const handleDeleteReceipt = async (receipt: PaymentReceipt) => {
    if (!window.confirm(`Are you sure you want to delete receipt #${receipt.receiptNo} (${receipt.studentName} - ৳${receipt.amount})?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'receipts', receipt.id));
      const student = students.find((s) => s.roll === receipt.studentRoll || s.id === receipt.studentId);
      if (student) {
        const studentDocId = student.id || ('s_' + student.roll.trim().replace(/[^0-9a-zA-Z]/g, ''));
        const remainingReceipts = receipts.filter((r) => r.id !== receipt.id && (r.studentRoll === student.roll || r.studentId === student.id));
        const newTotalPaid = remainingReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        await setDoc(doc(db, 'students', studentDocId), { totalPaid: newTotalPaid }, { merge: true });
      }

      setSyncToast({ message: `Receipt #${receipt.receiptNo} deleted from Firestore!`, type: 'success' });
      setTimeout(() => fetchSheetSummary(), 1500);
    } catch (err: any) {
      alert('Error deleting receipt: ' + err.message);
    }
  };

  // 6. Update Receipt (Firestore 'receipts' collection & recalculate student totalPaid)
  const handleUpdateReceipt = async (updatedReceipt: PaymentReceipt) => {
    try {
      await setDoc(doc(db, 'receipts', updatedReceipt.id), updatedReceipt, { merge: true });
      const student = students.find((s) => s.roll === updatedReceipt.studentRoll || s.id === updatedReceipt.studentId);
      if (student) {
        const studentDocId = student.id || ('s_' + student.roll.trim().replace(/[^0-9a-zA-Z]/g, ''));
        const otherReceipts = receipts.filter((r) => r.id !== updatedReceipt.id && (r.studentRoll === student.roll || r.studentId === student.id));
        const newTotalPaid = otherReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) + Number(updatedReceipt.amount || 0);
        await setDoc(doc(db, 'students', studentDocId), { totalPaid: newTotalPaid }, { merge: true });
      }

      setSyncToast({ message: `Receipt #${updatedReceipt.receiptNo} updated in Firestore!`, type: 'success' });
      setIsEditReceiptModalOpen(false);
      setEditingReceipt(null);
      setTimeout(() => fetchSheetSummary(), 1500);
    } catch (err: any) {
      alert('Error updating receipt: ' + err.message);
    }
  };

  // 7. Delete Expense (Firestore 'expenses' collection)
  const handleDeleteExpense = async (expense: Expense) => {
    if (!window.confirm(`Are you sure you want to delete expense voucher #${expense.voucherNo} ("${expense.title}")?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'expenses', expense.id));
      setSyncToast({ message: `Expense voucher #${expense.voucherNo} deleted from Firestore!`, type: 'success' });
      setTimeout(() => fetchSheetSummary(), 1500);
    } catch (err: any) {
      alert('Error deleting expense: ' + err.message);
    }
  };

  // 8. Update Expense (Firestore 'expenses' collection)
  const handleUpdateExpense = async (updatedExpense: Expense) => {
    try {
      await setDoc(doc(db, 'expenses', updatedExpense.id), updatedExpense, { merge: true });
      setSyncToast({ message: `Expense voucher #${updatedExpense.voucherNo} updated in Firestore!`, type: 'success' });
      setIsEditExpenseModalOpen(false);
      setEditingExpense(null);
      setTimeout(() => fetchSheetSummary(), 1500);
    } catch (err: any) {
      alert('Error updating expense: ' + err.message);
    }
  };

  // Sync Google Sheet URL
  const handleSyncGoogleSheet = async (url: string, type: 'payments' | 'expenses' | 'all') => {
    const res = await fetch(`/api/fund/sync-google-sheet?t=${new Date().getTime()}`, {
      method: 'POST',
      cache: 'no-store',
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
    const res = await fetch(`/api/fund/config?t=${new Date().getTime()}`, {
      method: 'POST',
      cache: 'no-store',
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
            <StatsCards stats={stats} monthlyFee={config.monthlyFee} receipts={receipts} students={students} />
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
              onEditReceipt={(receipt) => {
                setEditingReceipt(receipt);
                setIsEditReceiptModalOpen(true);
              }}
              onDeleteReceipt={handleDeleteReceipt}
              onEditExpense={(expense) => {
                setEditingExpense(expense);
                setIsEditExpenseModalOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
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
            onEditExpense={(expense) => {
              setEditingExpense(expense);
              setIsEditExpenseModalOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
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

      <EditReceiptModal
        receipt={editingReceipt}
        isOpen={isEditReceiptModalOpen}
        onClose={() => {
          setIsEditReceiptModalOpen(false);
          setEditingReceipt(null);
        }}
        onSubmit={handleUpdateReceipt}
      />

      <EditExpenseModal
        expense={editingExpense}
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleUpdateExpense}
      />

    </div>
  );
}
