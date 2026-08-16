export interface Student {
  id: string;
  roll: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive';
  joinedMonth: string; // e.g. "2025-01"
  totalPaid?: number;
  dueAmount?: number;
}

export interface PaymentReceipt {
  id: string;
  receiptNo: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  amount: number;
  monthsPaid: string[]; // Array of YYYY-MM strings, e.g., ["2025-01", "2025-02"]
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank';
  transactionRef: string;
  collectorName: string;
  notes?: string;
  verified: boolean;
}

export interface Expense {
  id: string;
  voucherNo: string;
  title: string;
  amount: number;
  category: 'Event' | 'Academic' | 'Sports' | 'Lab' | 'Welfare' | 'Contingency' | 'Farewell' | 'Other';
  date: string; // YYYY-MM-DD
  spentBy: string;
  referenceDocUrl?: string;
  notes?: string;
}

export interface BatchConfig {
  batchName: string; // "CSE Batch-17"
  institution: string; // "Sylhet Engineering College"
  monthlyFee: number; // 50 BDT
  startMonth: string; // "2025-01"
  managerName: string; // "Fund Collector / Treasurer"
  contactPhone: string;
  bkashNumber: string;
  nagadNumber: string;
  adminPin: string;
  allowedAdminEmails?: string[]; // Allowed admin Gmail addresses from Firestore config/batch
  googleSheetUrl?: string; // Main Google Sheet link
  googleSheetPaymentsUrl?: string; // Published CSV link
  googleSheetExpensesUrl?: string; // Published CSV link
  googleSheetWebhookUrl?: string; // Google Apps Script Web App URL for live 2-way sync
  deletedExpenseVouchers?: string[]; // Deleted vouchers list
  lastSyncTime?: string;
}

export interface StudentFundStatus {
  student: Student;
  totalPaid: number;
  monthsPaidList: string[];
  totalMonthsDue: number;
  dueAmount: number;
  status: 'paid_up' | 'due_1_month' | 'overdue';
  dueMonthsList: string[];
}

export interface FundStats {
  totalCollected: number;
  totalSpent: number;
  netBalance: number;
  totalStudents: number;
  paidUpStudentsCount: number;
  overdueStudentsCount: number;
  collectionRate: number; // percentage
  currentMonth: string; // YYYY-MM
  thisMonthCollected: number;
  thisMonthSpent: number;
}

export interface FundDataResponse {
  config: BatchConfig;
  students: Student[];
  receipts: PaymentReceipt[];
  expenses: Expense[];
  stats: FundStats;
}
