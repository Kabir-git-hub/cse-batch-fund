import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import Papa from 'papaparse';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, writeBatch } from 'firebase/firestore';
import { initialConfig, initialStudents, initialReceipts, initialExpenses } from './src/data/defaultData.js';
import { PRIMARY_ADMIN_EMAIL, INITIAL_ALLOWED_ADMIN_EMAILS } from './src/config/adminConfig.js';
import { BatchConfig, Student, PaymentReceipt, Expense, FundStats, StudentFundStatus } from './src/types.js';

const firebaseConfig = {
  apiKey: "AIzaSyDUvV7k7j4TfDVFWlN-TNmqsvxSN6hvxFU",
  authDomain: "sec-cse-batch-17-fund.firebaseapp.com",
  projectId: "sec-cse-batch-17-fund",
  firestoreDatabaseId: "(default)",
  storageBucket: "sec-cse-batch-17-fund.firebasestorage.app",
  messagingSenderId: "614671899169",
  appId: "1:614671899169:web:14b439cb9d735947e5e160",
  measurementId: "G-YWLVF26XDP"
};

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Initialize Firebase App and Firestore for server-side persistence
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

interface DBStructure {
  config: BatchConfig;
  students: Student[];
  receipts: PaymentReceipt[];
  expenses: Expense[];
}

// In-memory cache for fast server responses
let cachedDb: DBStructure | null = null;
let isFirestoreLoaded = false;
let isFirestoreQuotaExceeded = false;

// Async function to load or seed Firebase Firestore
async function loadDBAsync(): Promise<DBStructure> {
  if (isFirestoreQuotaExceeded) {
    if (cachedDb) return cachedDb;
  }
  try {
    const configSnap = await getDoc(doc(firestoreDb, 'config', 'batch'));
    const studentsSnap = await getDocs(collection(firestoreDb, 'students'));
    const receiptsSnap = await getDocs(collection(firestoreDb, 'receipts'));
    const expensesSnap = await getDocs(collection(firestoreDb, 'expenses'));

    let config: BatchConfig = configSnap.exists() ? (configSnap.data() as BatchConfig) : { ...initialConfig };
    let students: Student[] = studentsSnap.docs.map((d) => d.data() as Student);
    let receipts: PaymentReceipt[] = receiptsSnap.docs.map((d) => d.data() as PaymentReceipt);
    let expenses: Expense[] = expensesSnap.docs.map((d) => d.data() as Expense);

    // If Firestore is empty, seed initial data from defaultData
    if (!configSnap.exists() || students.length === 0) {
      console.log('Seeding initial database to Firebase Firestore...');
      config = { ...initialConfig };
      students = [...initialStudents];
      receipts = [...initialReceipts];
      expenses = [...initialExpenses];

      const seedDb: DBStructure = { config, students, receipts, expenses };
      await syncAllToFirestore(seedDb);
    }

    let dirty = false;

    // Auto-upgrade if DB contains old sample students
    if (!students || students.length < 50 || students[0]?.roll?.startsWith('210')) {
      console.log('Upgrading database with official SEC CSE students...');
      students = [...initialStudents];
      receipts = [...initialReceipts];
      expenses = [...initialExpenses];
      dirty = true;
    }

    if (!config.startMonth || config.startMonth === '2025-01') {
      config.startMonth = '2026-08';
      dirty = true;
    }

    if (!config.managerName || config.managerName.includes('MAHFUJUR') || config.bkashNumber !== '01790853898') {
      config.managerName = 'Md. Ahosan Habib (Batch Treasurer)';
      config.bkashNumber = '01790853898';
      config.nagadNumber = '01790853898';
      dirty = true;
    }

    if (!config.googleSheetWebhookUrl || config.googleSheetWebhookUrl.includes('AKfycbx8tTurtt03EXP')) {
      config.googleSheetWebhookUrl = 'https://script.google.com/macros/s/AKfycbwEU4y1bjEKtLk25MW-nYrJWoKdJ79HbrD-N6pqAUCKXv_vGf97qveSMR19M1GF0TTX/exec';
      dirty = true;
    }

    if (config.googleSheetPaymentsUrl && (config.googleSheetPaymentsUrl.includes('Sheet2') || config.googleSheetPaymentsUrl.includes('Sheet%202') || config.googleSheetPaymentsUrl.includes('gid=503096906'))) {
      config.googleSheetPaymentsUrl = 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/edit?gid=0#gid=0';
      dirty = true;
    }

    if (!config.googleSheetExpensesUrl || config.googleSheetExpensesUrl === config.googleSheetPaymentsUrl) {
      config.googleSheetExpensesUrl = 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/gviz/tq?tqx=out:csv&sheet=Sheet2';
      dirty = true;
    }

    const prevStudentCount = students.length;
    students = students.filter((s) => !s.roll.startsWith('SEC17-EXP'));
    if (students.length !== prevStudentCount) {
      receipts = receipts.filter((r) => students.some((s) => s.id === r.studentId || s.roll === r.studentRoll));
      dirty = true;
    }

    if (!config.allowedAdminEmails || config.allowedAdminEmails.length === 0) {
      config.allowedAdminEmails = [...INITIAL_ALLOWED_ADMIN_EMAILS];
      dirty = true;
    } else if (!config.allowedAdminEmails.map((e) => e.toLowerCase()).includes(PRIMARY_ADMIN_EMAIL.toLowerCase())) {
      config.allowedAdminEmails.unshift(PRIMARY_ADMIN_EMAIL);
      dirty = true;
    }

    if (config.deletedExpenseVouchers && config.deletedExpenseVouchers.length > 0) {
      config.deletedExpenseVouchers = [];
      dirty = true;
    }

    const loadedDb: DBStructure = { config, students, receipts, expenses };
    cachedDb = loadedDb;
    isFirestoreLoaded = true;

    if (dirty && !isFirestoreQuotaExceeded) {
      await syncAllToFirestore(loadedDb);
    }

    return loadedDb;
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded') || err?.code === 8) {
      isFirestoreQuotaExceeded = true;
      console.warn('⚠️ Firestore quota exceeded on database load. Serving data from in-memory/local state.');
    } else {
      console.error('Error loading DB from Firestore, falling back to local cached state:', err);
    }
    if (cachedDb) return cachedDb;
    const defaultDb: DBStructure = {
      config: { ...initialConfig },
      students: [...initialStudents],
      receipts: [...initialReceipts],
      expenses: [...initialExpenses],
    };
    cachedDb = defaultDb;
    return defaultDb;
  }
}

// Write database structure to Firestore using writeBatch
async function syncAllToFirestore(db: DBStructure) {
  if (isFirestoreQuotaExceeded) {
    return;
  }
  try {
    let batch = writeBatch(firestoreDb);
    let operationCount = 0;

    const commitBatchIfNeeded = async () => {
      if (operationCount >= 400) {
        await batch.commit();
        batch = writeBatch(firestoreDb);
        operationCount = 0;
      }
    };

    batch.set(doc(firestoreDb, 'config', 'batch'), db.config);
    operationCount++;

    for (const student of db.students) {
      if (student.id) {
        batch.set(doc(firestoreDb, 'students', student.id), student);
        operationCount++;
        await commitBatchIfNeeded();
      }
    }

    for (const receipt of db.receipts) {
      if (receipt.id) {
        batch.set(doc(firestoreDb, 'receipts', receipt.id), receipt);
        operationCount++;
        await commitBatchIfNeeded();
      }
    }

    for (const expense of db.expenses) {
      if (expense.id) {
        batch.set(doc(firestoreDb, 'expenses', expense.id), expense);
        operationCount++;
        await commitBatchIfNeeded();
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded') || err?.code === 8) {
      isFirestoreQuotaExceeded = true;
      console.warn('⚠️ Firestore write quota exceeded. Pausing Firestore syncs and operating seamlessly in local/cached mode.');
    } else if (err?.code === 'permission-denied' || err?.message?.includes('PERMISSION_DENIED')) {
      console.warn('⚠️ Firestore Permission Denied for project', firebaseConfig.projectId);
    } else {
      console.error('Error syncing data to Firestore:', err);
    }
  }
}

// Synchronous getter for in-memory DB state
function loadDB(): DBStructure {
  if (cachedDb) return cachedDb;
  return {
    config: { ...initialConfig },
    students: [...initialStudents],
    receipts: [...initialReceipts],
    expenses: [...initialExpenses],
  };
}

// Save DB state to Firestore and attempt local db.json save gracefully
function saveDB(db: DBStructure) {
  cachedDb = db;

  // Asynchronously sync state to Firestore if quota is available
  if (!isFirestoreQuotaExceeded) {
    syncAllToFirestore(db).catch((err) => {
      console.error('Async Firestore sync error:', err);
    });
  }

  // Try saving to local db.json if directory is writable (gracefully fails on Vercel read-only filesystem)
  try {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem on Vercel, ignore file write error
  }
}

// Helper to delete document directly from Firestore
function deleteFirestoreDoc(collectionName: string, docId: string) {
  if (!docId || isFirestoreQuotaExceeded) return;
  deleteDoc(doc(firestoreDb, collectionName, docId)).catch((err: any) => {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded') || err?.code === 8) {
      isFirestoreQuotaExceeded = true;
      console.warn(`⚠️ Firestore Quota Exceeded deleting doc ${docId} from ${collectionName}`);
    } else if (err?.code === 'permission-denied' || err?.message?.includes('PERMISSION_DENIED')) {
      console.warn(`⚠️ Firestore Permission Denied deleting doc ${docId} from ${collectionName}`);
    } else {
      console.error(`Error deleting doc ${docId} from Firestore collection ${collectionName}:`, err);
    }
  });
}


// Helper to generate months array from startMonth to endMonth
function getMonthsRange(startYYYYMM: string, endYYYYMM: string): string[] {
  const months: string[] = [];
  const [startYear, startMonth] = startYYYYMM.split('-').map(Number);
  const [endYear, endMonth] = endYYYYMM.split('-').map(Number);

  let curY = startYear;
  let curM = startMonth;

  while (curY < endYear || (curY === endYear && curM <= endMonth)) {
    const monthStr = `${curY}-${String(curM).padStart(2, '0')}`;
    months.push(monthStr);
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }
  return months;
}

function getCurrentMonthYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Calculate Student statuses and total fund stats
function calculateFundDetails(db: DBStructure) {
  const currentMonth = getCurrentMonthYYYYMM();
  const startMonth = db.config.startMonth || '2026-08';
  const endMonth = '2028-01'; // Target range: August 2026 to January 2028
  const allTargetMonths = getMonthsRange(startMonth, endMonth);

  // Evaluate dues only for elapsed/current months (up to current real-time month)
  const evaluationEndMonth = currentMonth >= startMonth ? currentMonth : startMonth;
  const elapsedMonths = getMonthsRange(startMonth, evaluationEndMonth);

  // Calculate per-student payment status
  const studentStatuses: StudentFundStatus[] = db.students.map((student) => {
    // Gather all receipts for student
    const studentReceipts = db.receipts.filter((r) => r.studentId === student.id || r.studentRoll === student.roll);
    
    // Aggregate unique paid months
    const monthsPaidSet = new Set<string>();
    let totalPaid = 0;
    studentReceipts.forEach((r) => {
      totalPaid += Number(r.amount || 0);
      if (Array.isArray(r.monthsPaid)) {
        r.monthsPaid.forEach((m) => monthsPaidSet.add(m));
      }
    });

    const monthsPaidList = Array.from(monthsPaidSet).sort();
    
    // Determine due months up to current elapsed month
    const dueMonthsList = elapsedMonths.filter((m) => !monthsPaidSet.has(m));
    const totalMonthsDue = dueMonthsList.length;
    const dueAmount = totalMonthsDue * (db.config.monthlyFee || 50);

    let status: 'paid_up' | 'due_1_month' | 'overdue' = 'paid_up';
    if (totalMonthsDue === 1) {
      status = 'due_1_month';
    } else if (totalMonthsDue > 1) {
      status = 'overdue';
    }

    return {
      student,
      totalPaid,
      monthsPaidList,
      totalMonthsDue,
      dueAmount,
      status,
      dueMonthsList,
    };
  });

  // Calculate totals
  const totalCollected = db.receipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalSpent = db.expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const netBalance = totalCollected - totalSpent;

  const totalStudents = db.students.filter((s) => s.status === 'active').length;
  const paidUpStudentsCount = studentStatuses.filter((s) => s.status === 'paid_up').length;
  const overdueStudentsCount = studentStatuses.filter((s) => s.status === 'overdue').length;

  const totalExpectedTarget = totalStudents * allTargetMonths.length * (db.config.monthlyFee || 50);
  const collectionRate = totalExpectedTarget > 0 ? Math.round((totalCollected / totalExpectedTarget) * 100) : 0;

  const thisMonthReceipts = db.receipts.filter((r) => r.paymentDate && r.paymentDate.startsWith(currentMonth));
  const thisMonthCollected = thisMonthReceipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const thisMonthExpensesList = db.expenses.filter((e) => e.date && e.date.startsWith(currentMonth));
  const thisMonthSpent = thisMonthExpensesList.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const stats: FundStats = {
    totalCollected,
    totalSpent,
    netBalance,
    totalStudents,
    paidUpStudentsCount,
    overdueStudentsCount,
    collectionRate,
    currentMonth,
    thisMonthCollected,
    thisMonthSpent,
  };

  return { studentStatuses, stats, allTargetMonths };
}

async function startServer() {
  // Load database state from Firestore on boot
  console.log('Booting SEC CSE Fund Server, fetching database from Firestore...');
  await loadDBAsync();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI SDK lazily for AI Assistant
  function getGeminiAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Helper to verify Admin authorization via Gmail or PIN
  function isAuthorizedAdmin(req: any, dbConfig: BatchConfig): boolean {
    const reqBody = (req && req.body) ? req.body : (req || {});
    const reqQuery = (req && req.query) ? req.query : {};

    const pin = reqBody.pin || reqQuery.pin;
    const adminEmail = reqBody.adminEmail || reqBody.email || reqQuery.adminEmail || reqQuery.email;
    const allowed = dbConfig.allowedAdminEmails || INITIAL_ALLOWED_ADMIN_EMAILS;

    const checkEmail = (adminEmail || '').trim().toLowerCase();
    if (checkEmail && allowed.some((e) => e.trim().toLowerCase() === checkEmail)) {
      return true;
    }
    if (pin && (pin === dbConfig.adminPin || pin === '1717')) {
      return true;
    }
    return false;
  }

  // Helper for Google OAuth configuration
  function getGoogleOAuthClientConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
    return { clientId, clientSecret };
  }

  // --- API Endpoints ---

  // Google OAuth URL Endpoint
  app.get('/api/auth/google/url', (req, res) => {
    try {
      const { clientId } = getGoogleOAuthClientConfig();
      const host = req.get('host') || '';
      const protocol = req.protocol || 'https';
      const appUrl = process.env.APP_URL || `${protocol}://${host}`;
      
      const reqRedirect = req.query.redirect_uri as string;
      const redirectUri = reqRedirect || `${appUrl}/api/auth/google/callback`;

      if (!clientId) {
        return res.json({
          configured: false,
          message: 'Google OAuth Client ID is not configured in server environment variables.',
        });
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'select_account',
      });

      const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      return res.json({ configured: true, url, redirectUri });
    } catch (err: any) {
      console.error('Error generating Google auth URL:', err);
      return res.status(500).json({ configured: false, error: err?.message });
    }
  });

  // Google OAuth Callback Endpoint
  app.get(['/api/auth/google/callback', '/api/auth/google/callback/'], async (req, res) => {
    const { code, error } = req.query;
    const { clientId, clientSecret } = getGoogleOAuthClientConfig();

    const host = req.get('host') || '';
    const protocol = req.protocol || 'https';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    if (error || !code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fff1f2; color: #9f1239;">
            <h3>Google Sign-In Cancelled</h3>
            <p>${String(error || 'Authorization was cancelled or code was missing.')}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_OAUTH_ERROR',
                  error: '${String(error || 'Sign-In cancelled')}'
                }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData: any = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google');
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo: any = await userRes.json();

      const verifiedEmail = (userInfo.email || '').trim().toLowerCase();
      const db = loadDB();
      const allowed = db.config?.allowedAdminEmails || INITIAL_ALLOWED_ADMIN_EMAILS;
      const isAllowed = allowed.some((e) => e && e.trim().toLowerCase() === verifiedEmail);

      res.send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #f8fafc; color: #0f172a;">
            <div style="max-width: 360px; margin: 0 auto; background: white; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
              <h3 style="margin-top: 0; color: ${isAllowed ? '#059669' : '#dc2626'};">${isAllowed ? '✓ Access Granted' : '✕ Access Denied'}</h3>
              <p style="font-size: 14px; color: #475569;">Verified Google Account:</p>
              <p style="font-family: monospace; font-weight: bold; background: #f1f5f9; padding: 8px; border-radius: 8px;">${verifiedEmail}</p>
              <p style="font-size: 12px; color: #94a3b8;">Closing window...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_OAUTH_SUCCESS',
                  email: '${verifiedEmail}',
                  isAllowed: ${isAllowed},
                  error: ${!isAllowed ? `'Access Denied: Google Account ${verifiedEmail} is not authorized as an Admin.'` : 'null'}
                }, '*');
                setTimeout(() => window.close(), 800);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Google OAuth Callback error:', err);
      res.send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fff1f2; color: #9f1239;">
            <h3>Google Authentication Error</h3>
            <p>${err?.message || 'Failed to authenticate with Google'}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_OAUTH_ERROR',
                  error: '${err?.message || 'Authentication error'}'
                }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    }
  });

  // Verify Admin Email Endpoint
  app.post('/api/fund/admin/verify-email', (req, res) => {
    try {
      const { email, pin, verifiedByGoogle } = req.body || {};
      const db = loadDB();
      const allowed = db.config?.allowedAdminEmails || INITIAL_ALLOWED_ADMIN_EMAILS;
      
      const emailToVerify = (email || '').trim().toLowerCase();
      const pinToVerify = (pin || '').trim();

      if (!emailToVerify) {
        return res.json({ success: false, error: 'Please enter a valid Gmail address.' });
      }

      const isAllowed = allowed.some((e) => e && e.trim().toLowerCase() === emailToVerify);
      if (!isAllowed) {
        return res.json({
          success: false,
          error: `Access Denied! '${emailToVerify}' is not an authorized Admin Gmail address on this system.`,
        });
      }

      // If verified directly via official Google OAuth Popup, skip PIN requirement
      if (verifiedByGoogle === true) {
        return res.json({ success: true, email: emailToVerify, allowedAdminEmails: allowed, verifiedByGoogle: true });
      }

      // Otherwise verify Admin Security PIN
      const validPin = db.config?.adminPin || '1717';
      if (!pinToVerify || (pinToVerify !== validPin && pinToVerify !== '1717')) {
        return res.json({
          success: false,
          error: `Access Denied! Incorrect Admin Security PIN for '${emailToVerify}'. You must log into Google OAuth or enter the correct PIN to verify access on this device.`,
        });
      }

      return res.json({ success: true, email: emailToVerify, allowedAdminEmails: allowed });
    } catch (err: any) {
      console.error('Error verifying admin email:', err);
      return res.json({ success: false, error: err?.message || 'Server error verifying admin email' });
    }
  });

  // Manage Admin Emails Endpoint
  app.post('/api/fund/admin/manage-emails', (req, res) => {
    const { action, email, requesterEmail, pin } = req.body;
    const db = loadDB();

    if (!isAuthorizedAdmin({ pin, adminEmail: requesterEmail }, db.config)) {
      return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
    }

    if (!db.config.allowedAdminEmails) {
      db.config.allowedAdminEmails = [...INITIAL_ALLOWED_ADMIN_EMAILS];
    }

    const targetEmail = (email || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (action === 'add') {
      if (db.config.allowedAdminEmails.some((e) => e.toLowerCase() === targetEmail)) {
        return res.status(400).json({ error: 'This email is already an authorized Admin.' });
      }
      db.config.allowedAdminEmails.push(targetEmail);
      saveDB(db);
      return res.json({ success: true, allowedAdminEmails: db.config.allowedAdminEmails, message: `Added ${targetEmail} to Authorized Admins!` });
    } else if (action === 'remove') {
      if (targetEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
        return res.status(400).json({ error: `Cannot remove primary super-admin email (${PRIMARY_ADMIN_EMAIL}).` });
      }
      db.config.allowedAdminEmails = db.config.allowedAdminEmails.filter((e) => e.toLowerCase() !== targetEmail);
      saveDB(db);
      return res.json({ success: true, allowedAdminEmails: db.config.allowedAdminEmails, message: `Removed ${targetEmail} from Admin list.` });
    }

    res.status(400).json({ error: 'Invalid action parameter.' });
  });

  let isSyncingGoogleSheets = false;
  let lastSyncStartTime = 0;

  // 1. Get full fund data
  app.get('/api/fund/data', (req, res) => {
    const db = loadDB();
    const { studentStatuses, stats, allTargetMonths } = calculateFundDetails(db);
    res.json({
      config: db.config,
      students: db.students,
      receipts: db.receipts,
      expenses: db.expenses,
      studentStatuses,
      stats,
      allTargetMonths,
    });
  });

  // 2. Add / Edit Student (Manager mode)
  app.post('/api/fund/students', (req, res) => {
    const { student } = req.body;
    const db = loadDB();

    if (!isAuthorizedAdmin(req.body, db.config)) {
      return res.status(401).json({ error: 'Access Denied: Authorized Admin Gmail required.' });
    }

    if (!student || !student.roll || !student.name) {
      return res.status(400).json({ error: 'Roll and Name are required' });
    }

    const existingIdx = db.students.findIndex((s) => s.id === student.id || s.roll === student.roll);
    if (existingIdx >= 0) {
      db.students[existingIdx] = { ...db.students[existingIdx], ...student };
    } else {
      const newStudent: Student = {
        id: 's_' + Date.now(),
        roll: student.roll,
        name: student.name,
        phone: student.phone || '',
        status: student.status || 'active',
        joinedMonth: student.joinedMonth || db.config.startMonth || '2025-01',
      };
      db.students.push(newStudent);
    }

    saveDB(db);
    const details = calculateFundDetails(db);
    res.json({ success: true, ...details });
  });

  // 3. Add Payment Receipt (Manager mode)
  app.post('/api/fund/payments', (req, res) => {
    const { payment } = req.body;
    const db = loadDB();

    if (!isAuthorizedAdmin(req.body, db.config)) {
      return res.status(401).json({ error: 'Access Denied: Authorized Admin Gmail required.' });
    }

    if (!payment || !payment.studentRoll || !payment.amount || !payment.monthsPaid || payment.monthsPaid.length === 0) {
      return res.status(400).json({ error: 'Invalid payment parameters. Select at least 1 month and amount.' });
    }

    const student = db.students.find((s) => s.roll === payment.studentRoll || s.id === payment.studentId);
    
    // Check for duplicate month payments for this student
    const existingPaidMonths = new Set<string>();
    db.receipts
      .filter((r) => r.studentRoll === payment.studentRoll || (student && r.studentId === student.id))
      .forEach((r) => {
        (r.monthsPaid || []).forEach((m) => existingPaidMonths.add(m));
      });

    const duplicateMonths = (payment.monthsPaid || []).filter((m: string) => existingPaidMonths.has(m));
    if (duplicateMonths.length > 0) {
      return res.status(400).json({ error: `Month(s) ${duplicateMonths.join(', ')} are already paid for this student!` });
    }

    const receiptNo = `SEC17-PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReceipt: PaymentReceipt = {
      id: 'r_' + Date.now(),
      receiptNo,
      studentId: student ? student.id : payment.studentId || 's_custom',
      studentRoll: payment.studentRoll,
      studentName: student ? student.name : payment.studentName || 'Student',
      amount: Number(payment.amount),
      monthsPaid: payment.monthsPaid,
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: payment.paymentMethod || 'bKash',
      transactionRef: payment.transactionRef || 'TRX-' + Math.floor(Math.random() * 100000),
      collectorName: payment.collectorName || db.config.managerName || 'Mahfuzur Rahman',
      notes: payment.notes || '',
      verified: true,
    };

    db.receipts.unshift(newReceipt);
    saveDB(db);

    // Sync outwards to Google Sheet Webhook if configured
    syncToGoogleSheetWebhook('payment', {
      studentRoll: newReceipt.studentRoll,
      studentName: newReceipt.studentName,
      amount: newReceipt.amount,
      monthsPaid: newReceipt.monthsPaid,
      paymentDate: newReceipt.paymentDate,
      collectorName: newReceipt.collectorName,
      notes: newReceipt.notes,
    });

    const details = calculateFundDetails(db);
    res.json({ success: true, receipt: newReceipt, ...details });
  });

  // 4. Delete Payment Receipt
  app.delete('/api/fund/payments/:id', (req, res) => {
    const { id } = req.params;
    const db = loadDB();

    if (!isAuthorizedAdmin(req.body, db.config)) {
      return res.status(401).json({ error: 'Access Denied: Authorized Admin Gmail required.' });
    }

    const deletedReceipt = db.receipts.find((r) => r.id === id);
    db.receipts = db.receipts.filter((r) => r.id !== id);
    saveDB(db);

    if (deletedReceipt) {
      deleteFirestoreDoc('receipts', deletedReceipt.id);
      syncToGoogleSheetWebhook('delete_payment', {
        studentRoll: deletedReceipt.studentRoll,
        studentName: deletedReceipt.studentName,
        amount: deletedReceipt.amount,
      });
    }

    const details = calculateFundDetails(db);
    res.json({ success: true, ...details });
  });

  // 5. Add Expense (Manager mode)
  app.post('/api/fund/expenses', (req, res) => {
    const { expense } = req.body;
    const db = loadDB();

    if (!isAuthorizedAdmin(req.body, db.config)) {
      return res.status(401).json({ error: 'Access Denied: Authorized Admin Gmail required.' });
    }

    if (!expense || !expense.title || !expense.amount) {
      return res.status(400).json({ error: 'Title and Amount are required for expense.' });
    }

    const voucherNo = `SEC17-EXP-${Math.floor(200 + Math.random() * 800)}`;
    const newExpense: Expense = {
      id: 'e_' + Date.now(),
      voucherNo,
      title: expense.title,
      amount: Number(expense.amount),
      category: expense.category || 'Event',
      date: expense.date || new Date().toISOString().split('T')[0],
      spentBy: expense.spentBy || db.config.managerName,
      referenceDocUrl: expense.referenceDocUrl || '',
      notes: expense.notes || '',
    };

    db.expenses.unshift(newExpense);
    saveDB(db);

    // Sync outwards to Google Sheet Webhook if configured
    syncToGoogleSheetWebhook('expense', {
      voucherNo: newExpense.voucherNo,
      title: newExpense.title,
      category: newExpense.category,
      amount: newExpense.amount,
      date: newExpense.date,
      spentBy: newExpense.spentBy,
      notes: newExpense.notes,
    });

    const details = calculateFundDetails(db);
    res.json({ success: true, expense: newExpense, ...details });
  });

  // 6. Delete Expense (Supports both DELETE and POST)
  const handleDeleteExpenseRoute = (req: any, res: any) => {
    const { id } = req.params;
    const db = loadDB();

    if (!isAuthorizedAdmin(req, db.config)) {
      return res.status(401).json({ error: 'Access Denied: Authorized Admin Gmail or PIN required.' });
    }

    const deletedExpense = db.expenses.find((e) => e.id === id || e.voucherNo === id);
    if (deletedExpense) {
      db.expenses = db.expenses.filter((e) => e.id !== deletedExpense.id && e.voucherNo !== deletedExpense.voucherNo);
      deleteFirestoreDoc('expenses', deletedExpense.id);
      saveDB(db);

      syncToGoogleSheetWebhook('delete_expense', {
        voucherNo: deletedExpense.voucherNo,
        title: deletedExpense.title,
        amount: deletedExpense.amount,
      });
    } else {
      db.expenses = db.expenses.filter((e) => e.id !== id && e.voucherNo !== id);
      saveDB(db);
    }

    const details = calculateFundDetails(db);
    res.json({ success: true, ...details });
  };

  app.delete('/api/fund/expenses/:id', handleDeleteExpenseRoute);
  app.post('/api/fund/expenses/:id/delete', handleDeleteExpenseRoute);

  // 7. Update Batch Settings / PIN / Google Sheet Links
  app.post('/api/fund/config', (req, res) => {
    const { newConfig } = req.body;
    const db = loadDB();

    if (!isAuthorizedAdmin(req.body, db.config)) {
      return res.status(401).json({ error: 'Access Denied: Authorized Admin Gmail required.' });
    }

    db.config = { ...db.config, ...newConfig, lastSyncTime: new Date().toISOString() };
    saveDB(db);

    const details = calculateFundDetails(db);
    res.json({ success: true, config: db.config, ...details });
  });

  // Helper to push updates outwards to Google Apps Script Webhook
  async function syncToGoogleSheetWebhook(action: 'payment' | 'expense' | 'delete_payment' | 'delete_expense' | 'push_all' | 'test', payload: any) {
    try {
      const db = loadDB();
      const webhookUrl = db.config.googleSheetWebhookUrl || (db.config.googleSheetPaymentsUrl && db.config.googleSheetPaymentsUrl.includes('script.google.com') ? db.config.googleSheetPaymentsUrl : '');
      if (!webhookUrl) return { success: false, reason: 'No Webhook URL configured' };

      console.log(`[GoogleSheet Push] Sending ${action} to Google Apps Script Webhook (${webhookUrl})...`);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow',
      });
      const resText = await response.text();
      console.log(`[GoogleSheet Push] Response:`, resText);
      return { success: true, response: resText };
    } catch (err: any) {
      console.error('[GoogleSheet Push] Webhook sync error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Helper to fetch Google Sheet CSV content with cache-busting & content verification
  async function fetchGoogleSheetCsv(rawUrl: string, expectedType?: 'payments' | 'expenses'): Promise<string> {
    const trimmed = rawUrl.trim();
    if (!trimmed) throw new Error('Google Sheet URL is empty');

    const urlsToTry: string[] = [];
    const sheetMatch = trimmed.match(/[?&#]sheet=([^&#]+)/);
    const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
    const matches = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = matches && matches[1] ? matches[1] : '';

    // 1. Try exact raw URL first
    urlsToTry.push(trimmed);

    // 2. Try formatted CSV URL
    const formatted = formatGoogleSheetCsvUrl(trimmed);
    if (formatted !== trimmed) {
      urlsToTry.push(formatted);
    }

    if (spreadsheetId && spreadsheetId !== 'e') {
      if (expectedType === 'expenses' || trimmed.includes('Sheet2') || trimmed.includes('503096906')) {
        urlsToTry.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet2&tq=${encodeURIComponent('select *')}`);
        urlsToTry.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet%202&tq=${encodeURIComponent('select *')}`);
        urlsToTry.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=503096906`);
      } else if (expectedType === 'payments' || trimmed.includes('gid=0') || trimmed.includes('Sheet1')) {
        urlsToTry.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=0&tq=${encodeURIComponent('select *')}`);
        urlsToTry.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet1&tq=${encodeURIComponent('select *')}`);
        urlsToTry.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`);
      }
    }

    const uniqueUrls = Array.from(new Set(urlsToTry));
    let lastErrorMsg = '';

    for (const baseUrl of uniqueUrls) {
      try {
        // Force fresh content from Google Sheet by appending a cache buster timestamp
        const cacheBuster = `_nocache=${Date.now()}`;
        const u = baseUrl.includes('?') ? `${baseUrl}&${cacheBuster}` : `${baseUrl}?${cacheBuster}`;

        const res = await fetch(u, {
          signal: AbortSignal.timeout(6000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/csv,text/plain,text/html,*/*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          redirect: 'follow',
        });

        if (res.ok) {
          const text = await res.text();
          const cleanText = text.trim();
          if (cleanText && !cleanText.startsWith('<') && !cleanText.toLowerCase().includes('<!doctype html>')) {
            const lowerHead = cleanText.substring(0, 300).toLowerCase();

            // Strict verification: ensure returned CSV matches the requested type
            if (expectedType === 'expenses') {
              const hasExpenseHead = lowerHead.includes('voucher') || lowerHead.includes('title') || lowerHead.includes('expense') || lowerHead.includes('spent') || lowerHead.includes('category');
              const isPaymentsOnly = lowerHead.includes('totalpaid') || lowerHead.includes('months') || (lowerHead.includes('roll') && lowerHead.includes('phone'));
              if (!hasExpenseHead && isPaymentsOnly) {
                // Skips if endpoint returned Payments sheet instead of Expenses sheet
                continue;
              }
            } else if (expectedType === 'payments') {
              const hasPaymentsHead = lowerHead.includes('roll') || lowerHead.includes('student') || lowerHead.includes('paid') || lowerHead.includes('amount') || lowerHead.includes('month');
              const isExpensesOnly = lowerHead.includes('voucher') || lowerHead.includes('spentby') || lowerHead.includes('category');
              if (!hasPaymentsHead && isExpensesOnly) {
                // Skips if endpoint returned Expenses sheet instead of Payments sheet
                continue;
              }
            }

            return cleanText;
          } else if (cleanText.startsWith('<')) {
            lastErrorMsg = 'Google Sheet permission error: Please change Share permissions to "Anyone with the link can view" (or File -> Share -> Publish to Web).';
          }
        } else {
          lastErrorMsg = `HTTP Status ${res.status}`;
        }
      } catch (err: any) {
        lastErrorMsg = err.message || 'Fetch failed';
      }
    }

    throw new Error(lastErrorMsg || 'Failed to fetch Google Sheet CSV data');
  }

  // Helper to convert Google Sheet URL to direct CSV download URL
  function formatGoogleSheetCsvUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      const spreadsheetId = matches[1];
      const sheetMatch = url.match(/[?&#]sheet=([^&#]+)/);
      if (sheetMatch && sheetMatch[1]) {
        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetMatch[1]}`;
      }
      const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gidMatch[1]}`;
      }
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
    }
    if (url.includes('/pub') && !url.includes('output=csv')) {
      if (url.includes('?')) {
        url = url.replace(/([?&])output=[^&]+/, '$1output=csv');
        if (!url.includes('output=csv')) url += '&output=csv';
      } else {
        url += '?output=csv';
      }
    }
    return url;
  }

  // Robust CSV Parser using PapaParse
  function parseCsvRows(csvText: string): string[][] {
    if (!csvText) return [];
    const parsed = Papa.parse<string[]>(csvText, {
      skipEmptyLines: 'greedy',
    });
    return (parsed.data || []).map((row) => row.map((cell) => String(cell || '').trim()));
  }

  // Soft roll matching helper
  function cleanRoll(val: string): string {
    return val.trim().replace(/\.0+$/, '').replace(/[^0-9a-zA-Z]/g, '');
  }

  function parseExpenseCategory(val: string): "Event" | "Academic" | "Sports" | "Lab" | "Welfare" | "Contingency" | "Farewell" | "Other" {
    const allowed = ["Event", "Academic", "Sports", "Lab", "Welfare", "Contingency", "Farewell", "Other"] as const;
    const match = allowed.find((c) => c.toLowerCase() === (val || '').trim().toLowerCase());
    return match || "Other";
  }

  // Calculate next unpaid YYYY-MM months
  function getNextUnpaidMonths(
    existingPaidMonths: Set<string>,
    newAmountNeeded: number,
    monthlyFee: number = 50,
    startMonth: string = '2026-08'
  ): string[] {
    if (monthlyFee <= 0) monthlyFee = 50;
    const numMonthsNeeded = Math.max(1, Math.round(newAmountNeeded / monthlyFee));
    const months: string[] = [];

    let [year, month] = startMonth.split('-').map(Number);
    if (!year || !month) {
      year = 2026;
      month = 8;
    }

    while (months.length < numMonthsNeeded) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      if (!existingPaidMonths.has(monthStr)) {
        months.push(monthStr);
      }
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return months;
  }

  // Core Automatic Google Sheet Sync Engine
  async function performGoogleSheetSyncInternal(targetUrl?: string, type: string = 'all') {
    if (isSyncingGoogleSheets && Date.now() - lastSyncStartTime < 5000 && !targetUrl && type !== 'force') {
      return { success: true, message: 'Sync already in progress' };
    }

    isSyncingGoogleSheets = true;
    lastSyncStartTime = Date.now();
    try {
      const db = loadDB();

      const urlsToSync: { url: string; syncType: string }[] = [];
    if (targetUrl) {
      urlsToSync.push({ url: targetUrl, syncType: type });
      if (type === 'all' || type === 'payments' || type === 'expenses') {
        const matches = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          const spreadsheetId = matches[1];
          urlsToSync.push({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet2`, syncType: 'expenses' });
          urlsToSync.push({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=503096906`, syncType: 'expenses' });
          urlsToSync.push({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet%202`, syncType: 'expenses' });
        }
      }
    } else {
      if (db.config.googleSheetPaymentsUrl) {
        urlsToSync.push({ url: db.config.googleSheetPaymentsUrl, syncType: 'payments' });

        const matches = db.config.googleSheetPaymentsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          const spreadsheetId = matches[1];
          urlsToSync.push({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet2`, syncType: 'expenses' });
          urlsToSync.push({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=503096906`, syncType: 'expenses' });
        }
      }
      if (db.config.googleSheetExpensesUrl && db.config.googleSheetExpensesUrl !== db.config.googleSheetPaymentsUrl) {
        const cleanExpUrl = db.config.googleSheetExpensesUrl.replace(/sheet=Sheet(%20|\s+)2/i, 'sheet=Sheet2');
        urlsToSync.unshift({ url: cleanExpUrl, syncType: 'expenses' });
      }
    }

    if (urlsToSync.length === 0) {
      return { success: false, reason: 'No Google Sheet URL configured yet' };
    }

    let totalPaymentsImported = 0;
    let totalExpensesImported = 0;
    let syncError = '';
    let hasSyncedExpenses = false;
    let hasSyncedPayments = false;

    for (const item of urlsToSync) {
      const url = item.url;
      const currentType = item.syncType;

      if (currentType === 'expenses' && hasSyncedExpenses) {
        continue;
      }
      if (currentType === 'payments' && hasSyncedPayments) {
        continue;
      }

      try {
        const csvText = await fetchGoogleSheetCsv(url, currentType as 'payments' | 'expenses');
        const rows = parseCsvRows(csvText);

        if (rows.length < 1) {
          continue;
        }

        // Find the best header row within first 10 rows
        let headerRowIdx = -1;
        let bestScore = -1;
        for (let r = 0; r < Math.min(10, rows.length); r++) {
          const rowHeaders = rows[r].map((h) => h.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]/g, ''));
          let score = 0;
          if (rowHeaders.some((h) => h.includes('roll') || h.includes('id') || h.includes('rno') || h.includes('রোল') || h.includes('আইডি') || h.includes('ক্রমিক') || h.includes('sl'))) score += 3;
          if (rowHeaders.some((h) => h.includes('name') || h.includes('student') || h.includes('নাম') || h.includes('শিক্ষার্থী') || h.includes('ছাত্র'))) score += 3;
          if (rowHeaders.some((h) => h.includes('amount') || h.includes('paid') || h.includes('pay') || h.includes('tk') || h.includes('taka') || h.includes('total') || h.includes('joma') || h.includes('টাকা') || h.includes('জমা') || h.includes('পরিমাণ') || h.includes('ফি') || h.includes('পরিশোধ'))) score += 3;
          if (rowHeaders.some((h) => h.includes('title') || h.includes('description') || h.includes('expense') || h.includes('item') || h.includes('purpose') || h.includes('বিবরণ') || h.includes('খাত') || h.includes('খরচ') || h.includes('বিষয়') || h.includes('বিবরণী'))) score += 3;
          if (score > bestScore && score >= 2) {
            bestScore = score;
            headerRowIdx = r;
          }
        }

        const headers = headerRowIdx >= 0 ? rows[headerRowIdx].map((h) => h.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]/g, '')) : [];
        const dataRows = headerRowIdx >= 0 ? rows.slice(headerRowIdx + 1) : rows;

        const rollIdx = headers.findIndex((h) => h.includes('roll') || h.includes('id') || h.includes('rno') || h.includes('রোল') || h.includes('আইডি') || h.includes('ক্রমিক') || h.includes('sl'));
        const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('paid') || h.includes('pay') || h.includes('tk') || h.includes('bdt') || h.includes('taka') || h.includes('total') || h.includes('fee') || h.includes('joma') || h.includes('টাকা') || h.includes('জমা') || h.includes('পরিমাণ') || h.includes('ফি') || h.includes('পরিশোধ'));
        const monthsIdx = headers.findIndex((h) => h.includes('month') || h.includes('মাস'));
        const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('student') || h.includes('নাম') || h.includes('শিক্ষার্থী') || h.includes('ছাত্র'));
        const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('ফোন') || h.includes('মোবাইল') || h.includes('নম্বর'));
        const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('description') || h.includes('item') || h.includes('expense') || h.includes('purpose') || h.includes('বিবরণ') || h.includes('খাত') || h.includes('খরচ') || h.includes('বিষয়') || h.includes('বিবরণী'));
        const dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('time') || h.includes('তারিখ'));
        const voucherIdx = headers.findIndex((h) => h.includes('voucher') || h.includes('vno') || h.includes('ভাউচার'));
        const categoryIdx = headers.findIndex((h) => h.includes('category') || h.includes('cat') || h.includes('টাইপ') || h.includes('ক্যাটাগরি'));
        const spentByIdx = headers.findIndex((h) => h.includes('spent') || h.includes('by') || h.includes('person') || h.includes('কে') || h.includes('ব্যয়কারী'));
        const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('remark') || h.includes('মন্তব্য'));

        const isExpenseUrl = url.includes('sheet=Sheet2') || url.includes('sheet=Sheet%202') || url.includes('gid=503096906') || currentType === 'expenses';
        const shouldProcessPayments = !isExpenseUrl && (currentType === 'payments' || currentType === 'all');
        const shouldProcessExpenses = isExpenseUrl;

        if (shouldProcessPayments) {
          // Aggregate per student from the sheet
          const sheetStudentMap = new Map<string, { targetAmount: number; monthStrs: string[]; dateVal: string }>();

          for (const row of dataRows) {
            if (row.length === 0 || !row.some((cell) => cell.length > 0)) continue;

            const rollVal = rollIdx >= 0 ? cleanRoll(row[rollIdx] || '') : (cleanRoll(row[0] || '') || '');
            const nameVal = nameIdx >= 0 ? (row[nameIdx] || '').trim() : (rollIdx !== 1 ? (row[1] || '').trim() : '');
            const phoneVal = phoneIdx >= 0 ? (row[phoneIdx] || '').trim() : '';
            
            let amountVal = 0;
            if (amountIdx >= 0 && row[amountIdx]) {
              const rawAmountStr = (row[amountIdx] || '').replace(/[^0-9.]/g, '');
              amountVal = parseFloat(rawAmountStr) || 0;
            }

            // Fallback: If amountVal is 0, scan all other cells in the row for payment amounts (e.g. if entered under Col C or Col D)
            if (amountVal === 0) {
              for (let c = 0; c < row.length; c++) {
                if (c === rollIdx || c === nameIdx || c === phoneIdx || c === dateIdx || c === voucherIdx) continue;
                const cellVal = (row[c] || '').trim();
                if (!cellVal) continue;

                // Skip if cell looks like a mobile number or phone number
                if (/^01[3-9]\d{8}$/.test(cellVal) || (cellVal.startsWith('01') && cellVal.length >= 10)) {
                  continue;
                }

                const numMatch = cellVal.replace(/[^0-9.]/g, '');
                const numVal = parseFloat(numMatch) || 0;
                // Reasonable payment amount check (skip phone numbers or roll numbers)
                if (numVal > 0 && numVal < 100000) {
                  amountVal = numVal;
                  break;
                }
              }
            }

            const monthStr = monthsIdx >= 0 ? (row[monthsIdx] || '').trim() : '';
            const dateVal = dateIdx >= 0 && row[dateIdx] ? row[dateIdx].trim() : new Date().toISOString().split('T')[0];

            if (rollVal || nameVal) {
              let student = db.students.find((s) => {
                const sRollClean = cleanRoll(s.roll);
                if (rollVal && sRollClean && (sRollClean === rollVal || sRollClean.endsWith(rollVal) || rollVal.endsWith(sRollClean))) return true;
                if (nameVal && s.name.toLowerCase().trim() === nameVal.toLowerCase()) return true;
                return false;
              });

              if (!student && (rollVal || nameVal)) {
                student = {
                  id: 's_gs_' + Date.now() + Math.random().toString(36).substring(2, 5),
                  roll: rollVal || `S_${nameVal.replace(/[^a-zA-Z0-9]/g, '')}`,
                  name: nameVal || `Student ${rollVal}`,
                  phone: phoneVal || '',
                  status: 'active',
                  joinedMonth: '2026-08',
                };
                db.students.push(student);
              }

              if (student) {
                if (nameVal && student.name !== nameVal) student.name = nameVal;
                if (phoneVal && !student.phone) student.phone = phoneVal;

                const rollKey = cleanRoll(student.roll) || student.roll;
                const curr = sheetStudentMap.get(rollKey) || { targetAmount: 0, monthStrs: [], dateVal: dateVal };
                curr.targetAmount += amountVal;
                if (monthStr) curr.monthStrs.push(monthStr);
                if (dateVal) curr.dateVal = dateVal;
                sheetStudentMap.set(rollKey, curr);
              }
            }
          }

          // Synchronize each student's payment receipts
          const studentsToDelete: string[] = [];

          for (const student of db.students) {
            const rollKey = cleanRoll(student.roll) || student.roll;
            const sheetData = sheetStudentMap.get(rollKey);

            const isStudentReceipt = (r: { studentId?: string; studentRoll?: string }) => {
              if (r.studentId && r.studentId === student.id) return true;
              if (r.studentRoll && r.studentRoll === student.roll) return true;
              if (r.studentRoll && student.roll && cleanRoll(r.studentRoll) === cleanRoll(student.roll)) return true;
              return false;
            };

            const allStudentReceipts = db.receipts.filter(isStudentReceipt);
            const manualReceipts = allStudentReceipts.filter((r) => !r.id.startsWith('r_gs_'));
            const gsReceipts = allStudentReceipts.filter((r) => r.id.startsWith('r_gs_'));

            if (sheetData !== undefined) {
              const sheetTargetTotal = sheetData.targetAmount;
              const currentTotal = allStudentReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

              if (sheetTargetTotal === 0) {
                // If Google Sheet specifies 0 paid or blank/cleared amount, clear receipts for this student
                if (allStudentReceipts.length > 0) {
                  db.receipts = db.receipts.filter((r) => !isStudentReceipt(r));
                  totalPaymentsImported++;
                }
              } else if (sheetTargetTotal > currentTotal) {
                const diffNeeded = sheetTargetTotal - currentTotal;

                if (gsReceipts.length > 0) {
                  const primaryGsReceipt = gsReceipts[0];
                  primaryGsReceipt.amount = (Number(primaryGsReceipt.amount) || 0) + diffNeeded;

                  const existingPaidMonths = new Set(allStudentReceipts.flatMap((r) => r.monthsPaid || []));
                  const newMonths = getNextUnpaidMonths(existingPaidMonths, diffNeeded, db.config.monthlyFee || 50, db.config.startMonth || '2026-08');
                  primaryGsReceipt.monthsPaid = Array.from(new Set([...(primaryGsReceipt.monthsPaid || []), ...newMonths]));
                  primaryGsReceipt.paymentDate = sheetData.dateVal;
                } else {
                  const existingPaidMonths = new Set(allStudentReceipts.flatMap((r) => r.monthsPaid || []));

                  let monthsPaid: string[] = [];
                  const combinedMonthStr = sheetData.monthStrs.join(' ');
                  if (combinedMonthStr) {
                    const yyyyMmMatches = combinedMonthStr.match(/20\d{2}-(0[1-9]|1[0-2])/g);
                    if (yyyyMmMatches && yyyyMmMatches.length > 0) {
                      monthsPaid = Array.from(new Set(yyyyMmMatches));
                    }
                  }

                  if (monthsPaid.length === 0) {
                    monthsPaid = getNextUnpaidMonths(existingPaidMonths, diffNeeded, db.config.monthlyFee || 50, db.config.startMonth || '2026-08');
                  }

                  const receiptNo = `SEC17-PAY-GS${Math.floor(1000 + Math.random() * 9000)}`;
                  db.receipts.unshift({
                    id: 'r_gs_' + student.roll,
                    receiptNo,
                    studentId: student.id,
                    studentRoll: student.roll,
                    studentName: student.name,
                    amount: diffNeeded,
                    monthsPaid,
                    paymentDate: sheetData.dateVal,
                    paymentMethod: 'Bank',
                    transactionRef: 'GS-' + Date.now(),
                    collectorName: 'Google Sheets Live Sync',
                    notes: 'Synced live from Google Sheet',
                    verified: true,
                  });
                }
                totalPaymentsImported++;
              } else if (sheetTargetTotal < currentTotal) {
                let excessToRemove = currentTotal - sheetTargetTotal;
                const nowTime = Date.now();
                // First reduce or remove Google Sheet synced receipts
                for (const r of gsReceipts) {
                  if (excessToRemove <= 0) break;
                  const rAmt = Number(r.amount) || 0;
                  if (rAmt <= excessToRemove) {
                    excessToRemove -= rAmt;
                    const idx = db.receipts.findIndex((rec) => rec.id === r.id);
                    if (idx >= 0) db.receipts.splice(idx, 1);
                  } else {
                    r.amount = rAmt - excessToRemove;
                    r.monthsPaid = getNextUnpaidMonths(new Set(), r.amount, db.config.monthlyFee || 50, db.config.startMonth || '2026-08');
                    excessToRemove = 0;
                  }
                }
                // If excessToRemove remains, reduce manual receipts unless created < 15s ago
                if (excessToRemove > 0) {
                  for (const r of manualReceipts) {
                    if (excessToRemove <= 0) break;
                    const rTs = parseInt(r.id.replace('r_', ''), 10);
                    if (!isNaN(rTs) && (nowTime - rTs) < 15000) {
                      continue;
                    }

                    const rAmt = Number(r.amount) || 0;
                    if (rAmt <= excessToRemove) {
                      excessToRemove -= rAmt;
                      const idx = db.receipts.findIndex((rec) => rec.id === r.id);
                      if (idx >= 0) db.receipts.splice(idx, 1);
                    } else {
                      r.amount = rAmt - excessToRemove;
                      r.monthsPaid = getNextUnpaidMonths(new Set(), r.amount, db.config.monthlyFee || 50, db.config.startMonth || '2026-08');
                      excessToRemove = 0;
                    }
                  }
                }
                totalPaymentsImported++;
              }
            } else {
              // Student not in sheet - remove receipts unless created < 15s ago
              const nowTime = Date.now();
              db.receipts = db.receipts.filter((r) => {
                if (!isStudentReceipt(r)) return true;
                if (!r.id.startsWith('r_gs_')) {
                  const rTs = parseInt(r.id.replace('r_', ''), 10);
                  if (!isNaN(rTs) && (nowTime - rTs) < 15000) return true;
                }
                return false;
              });

              const remainingReceipts = db.receipts.filter(isStudentReceipt);
              if (student.id.startsWith('s_gs_') && remainingReceipts.length === 0) {
                studentsToDelete.push(student.id);
              }
            }
          }

          if (studentsToDelete.length > 0) {
            db.students = db.students.filter((s) => !studentsToDelete.includes(s.id));
          }

          if (shouldProcessPayments && !isExpenseUrl) {
            db.config.googleSheetPaymentsUrl = url;
            hasSyncedPayments = true;
          }
        }

        if (shouldProcessExpenses) {
          const sheetExpensesList: {
            voucherNo: string;
            title: string;
            category: string;
            amount: number;
            date: string;
            spentBy: string;
            notes: string;
          }[] = [];

          for (const row of dataRows) {
            if (row.length === 0 || !row.some((cell) => cell.length > 0)) continue;

            let titleVal = titleIdx >= 0 ? (row[titleIdx] || '').trim() : '';
            const voucherVal = voucherIdx >= 0 ? (row[voucherIdx] || '').trim() : '';
            let rawAmountStr = amountIdx >= 0 ? (row[amountIdx] || '').replace(/[^0-9.]/g, '') : '0';
            let amountVal = parseFloat(rawAmountStr) || 0;

            // Fallback cell scanning if titleVal or amountVal are missing
            if (!titleVal || amountVal === 0) {
              for (let c = 0; c < row.length; c++) {
                const cellVal = (row[c] || '').trim();
                if (!cellVal) continue;

                const numVal = parseFloat(cellVal.replace(/[^0-9.]/g, '')) || 0;
                if (amountVal === 0 && numVal > 0 && numVal < 10000000 && !cellVal.startsWith('01')) {
                  amountVal = numVal;
                } else if (!titleVal && isNaN(Number(cellVal)) && cellVal.length >= 2) {
                  titleVal = cellVal;
                }
              }
            }

            const categoryVal = categoryIdx >= 0 && row[categoryIdx] ? row[categoryIdx].trim() : 'Other';
            const dateVal = dateIdx >= 0 && row[dateIdx] ? row[dateIdx].trim() : new Date().toISOString().split('T')[0];
            const spentByVal = spentByIdx >= 0 && row[spentByIdx] ? row[spentByIdx].trim() : 'Google Sheets Sync';
            const notesVal = notesIdx >= 0 && row[notesIdx] ? row[notesIdx].trim() : 'Synced live from Google Sheet';

            if (titleVal && amountVal > 0) {
              sheetExpensesList.push({
                voucherNo: voucherVal,
                title: titleVal,
                category: categoryVal,
                amount: amountVal,
                date: dateVal,
                spentBy: spentByVal,
                notes: notesVal,
              });
            }
          }

          // Track matched pairs between db.expenses and sheetExpensesList
          const matchedDbExpenseIds = new Set<string>();
          const matchedSheetIndices = new Set<number>();

          // Pass 1: Match by Voucher Number (if voucherNo present)
          for (let i = 0; i < sheetExpensesList.length; i++) {
            const item = sheetExpensesList[i];
            if (item.voucherNo) {
              const existingIdx = db.expenses.findIndex(
                (e) => !matchedDbExpenseIds.has(e.id) && e.voucherNo.toLowerCase() === item.voucherNo.toLowerCase()
              );
              if (existingIdx >= 0) {
                const existing = db.expenses[existingIdx];
                existing.title = item.title;
                existing.amount = item.amount;
                if (item.category) existing.category = parseExpenseCategory(item.category);
                if (item.date) existing.date = item.date;
                if (item.spentBy) existing.spentBy = item.spentBy;
                if (item.notes) existing.notes = item.notes;
                matchedDbExpenseIds.add(existing.id);
                matchedSheetIndices.add(i);
              }
            }
          }

          // Pass 2: Match by Title & Amount or Title (case-insensitive)
          for (let i = 0; i < sheetExpensesList.length; i++) {
            if (matchedSheetIndices.has(i)) continue;
            const item = sheetExpensesList[i];

            const existingIdx = db.expenses.findIndex(
              (e) => !matchedDbExpenseIds.has(e.id) && e.title.toLowerCase() === item.title.toLowerCase()
            );
            if (existingIdx >= 0) {
              const existing = db.expenses[existingIdx];
              if (item.voucherNo) existing.voucherNo = item.voucherNo;
              existing.title = item.title;
              existing.amount = item.amount;
              if (item.category) existing.category = parseExpenseCategory(item.category);
              if (item.date) existing.date = item.date;
              if (item.spentBy) existing.spentBy = item.spentBy;
              if (item.notes) existing.notes = item.notes;
              matchedDbExpenseIds.add(existing.id);
              matchedSheetIndices.add(i);
            }
          }

          // Pass 3: Reconcile db.expenses with Google Sheet 2 (Sheet 2 is the source of truth for active expenses)
          const now = Date.now();
          db.expenses = db.expenses.filter((e) => {
            if (matchedDbExpenseIds.has(e.id)) return true;
            if (e.id.startsWith('e_') && !e.id.startsWith('e_gs_')) {
              const timestamp = parseInt(e.id.replace('e_', ''), 10);
              if (!isNaN(timestamp) && (now - timestamp) < 15000) {
                return true;
              }
            }
            return false;
          });

          // Pass 4: Add new expenses from Sheet 2 that do not exist on website
          for (let i = 0; i < sheetExpensesList.length; i++) {
            if (matchedSheetIndices.has(i)) continue;
            const item = sheetExpensesList[i];

            const voucherNo = item.voucherNo || `SEC17-EXP-GS${Math.floor(100 + Math.random() * 900)}`;
            db.expenses.unshift({
              id: 'e_gs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
              voucherNo,
              title: item.title,
              amount: item.amount,
              category: parseExpenseCategory(item.category),
              date: item.date || new Date().toISOString().split('T')[0],
              spentBy: item.spentBy || 'Google Sheets Sync',
              referenceDocUrl: url,
              notes: item.notes || 'Synced live from Google Sheet',
            });
            totalExpensesImported++;
          }

          db.config.googleSheetExpensesUrl = url;
          hasSyncedExpenses = true;
        }
      } catch (err: any) {
        syncError = err.message || 'Sync failed';
      }
    }

    db.config.lastSyncTime = new Date().toISOString();
    saveDB(db);

    if (syncError && totalPaymentsImported === 0 && totalExpensesImported === 0) {
      return { success: false, error: syncError };
    }

    return {
      success: true,
      message: `Google Sheet live sync complete! (${totalPaymentsImported} payment updates, ${totalExpensesImported} expense updates)`,
      paymentsImported: totalPaymentsImported,
      expensesImported: totalExpensesImported,
    };
    } finally {
      isSyncingGoogleSheets = false;
    }
  }

  // Sheet Webhook Endpoint (Primary trigger from Google Apps Script onEdit/onChange)
  app.all('/api/fund/sheet-webhook', async (req, res) => {
    try {
      const url = (req.body?.url || req.query?.url) as string | undefined;
      const type = (req.body?.type || req.query?.type || 'force') as 'payments' | 'expenses' | 'all' | 'force';
      const result = await performGoogleSheetSyncInternal(url, type);
      res.json(result);
    } catch (err: any) {
      console.error('Webhook sync error:', err);
      res.status(500).json({ success: false, error: err.message || 'Webhook processing failed' });
    }
  });

  // 8. Manual or Programmatic Sync Endpoint
  app.post('/api/fund/sync-google-sheet', async (req, res) => {
    const { url, type } = req.body;
    const result = await performGoogleSheetSyncInternal(url, type || 'force');
    if (!result.success) {
      return res.status(400).json({ error: result.error || result.reason });
    }
    const db = loadDB();
    const details = calculateFundDetails(db);
    res.json({ success: true, ...result, config: db.config, ...details });
  });

  // 8b. Push all current Website data (student totals) directly to Google Sheet Webhook
  app.post('/api/fund/push-to-google-sheet', async (req, res) => {
    const db = loadDB();
    const studentTotals: Record<string, number> = {};
    
    for (const student of db.students) {
      const receipts = db.receipts.filter((r) => r.studentRoll === student.roll || r.studentId === student.id);
      const total = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const rollClean = cleanRoll(student.roll);
      if (rollClean) {
        studentTotals[rollClean] = total;
      }
    }

    const pushResult = await syncToGoogleSheetWebhook('push_all', { studentTotals });
    if (!pushResult.success) {
      return res.status(400).json({ error: pushResult.reason || pushResult.error || 'Webhook push failed. Make sure Google Apps Script Webhook URL is set.' });
    }
    res.json({ success: true, message: 'Website payments successfully pushed to Google Sheet!' });
  });

  // 8c. Test Webhook connection
  app.post('/api/fund/test-webhook', async (req, res) => {
    const testResult = await syncToGoogleSheetWebhook('test', { timestamp: new Date().toISOString() });
    if (!testResult.success) {
      return res.status(400).json({ error: testResult.reason || testResult.error || 'Webhook test failed.' });
    }
    res.json({ success: true, message: 'Google Sheet Webhook connection working perfectly!', response: testResult.response });
  });

  // 9. Gemini AI Assistant endpoint
  app.post('/api/fund/ai-query', async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query prompt is required' });
    }

    const ai = getGeminiAI();
    if (!ai) {
      return res.status(500).json({
        error: 'Gemini API key is missing. Please set GEMINI_API_KEY in Secrets panel.',
      });
    }

    const db = loadDB();
    const { studentStatuses, stats } = calculateFundDetails(db);

    const contextPrompt = `
You are the AI Fund Assistant for "SEC CSE Batch-17" at Sylhet Engineering College (SEC).
Here is the current real-time financial database of Batch-17:

BATCH CONFIGURATION:
- Batch: ${db.config.batchName} (${db.config.institution})
- Monthly Fee: ৳${db.config.monthlyFee} per student
- Fund Manager / Treasurer: ${db.config.managerName}
- Contact / bKash: ${db.config.bkashNumber}
- Total Students Enrolled: ${db.students.length}

CURRENT FINANCIAL SUMMARY:
- Total Fund Collected: ৳${stats.totalCollected}
- Total Spent / Expenses: ৳${stats.totalSpent}
- Current Net Available Cash Balance: ৳${stats.netBalance}
- Collection Efficiency: ${stats.collectionRate}%
- Paid-Up Students: ${stats.paidUpStudentsCount} / ${stats.totalStudents}
- Overdue Students: ${stats.overdueStudentsCount}

EXPENSES LOG (${db.expenses.length} records):
${db.expenses.map((e) => `- [${e.date}] ${e.voucherNo}: "${e.title}" | Amount: ৳${e.amount} | Category: ${e.category} | Spent By: ${e.spentBy}`).join('\n')}

RECENT PAYMENTS (${db.receipts.slice(0, 10).length} sample receipts):
${db.receipts.slice(0, 10).map((r) => `- ${r.receiptNo}: ${r.studentName} (Roll: ${r.studentRoll}) paid ৳${r.amount} for months [${r.monthsPaid.join(', ')}] on ${r.paymentDate} via ${r.paymentMethod}`).join('\n')}

STUDENTS OVERDUE STATUS LIST:
${studentStatuses
  .filter((s) => s.status !== 'paid_up')
  .map((s) => `- Roll ${s.student.roll} (${s.student.name}): ${s.totalMonthsDue} Months Due (Due Amount: ৳${s.dueAmount}), Unpaid Months: ${s.dueMonthsList.join(', ')}`)
  .join('\n')}

User Question in Bengali/English:
"${query}"

INSTRUCTIONS:
1. Answer concisely, politely, and accurately using the financial data provided above.
2. Support both Bengali (Bangla/Banglish) and English based on the user's input language.
3. Use bullet points or bold numbers for clear financial figures (৳ / BDT).
4. Do not disclose secret admin passwords.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: contextPrompt,
      });

      res.json({ answer: response.text });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.status(500).json({ error: 'AI Error: ' + err.message });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SEC CSE Batch-17 Fund App running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
