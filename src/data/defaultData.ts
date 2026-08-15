import { BatchConfig, Student, PaymentReceipt, Expense } from '../types.js';
import { INITIAL_ALLOWED_ADMIN_EMAILS } from '../config/adminConfig.js';

export const initialConfig: BatchConfig = {
  batchName: 'CSE Batch-17',
  institution: 'Sylhet Engineering College',
  monthlyFee: 50,
  startMonth: '2026-08',
  managerName: 'Md. Rajib Hossain Sunny (CR)',
  contactPhone: '01790853898',
  bkashNumber: '01790853898',
  nagadNumber: '01790853898',
  adminPin: '1717',
  allowedAdminEmails: INITIAL_ALLOWED_ADMIN_EMAILS,
  googleSheetPaymentsUrl: 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/edit?gid=0#gid=0',
  googleSheetExpensesUrl: 'https://docs.google.com/spreadsheets/d/14LJMkiQi1CkZeCSJTF2BFw_bRCWyUYwlc46B18ySEfE/edit?gid=503096906#gid=503096906',
  googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbwrLnKtnsIUpapVSRlVGEYU9WYNWBpLLFchrq_hFtYhTIJp-ltUhyHVKYtL02QwhbR7/exec',
  lastSyncTime: new Date().toISOString()
};

export const initialStudents: Student[] = [];

export const initialReceipts: PaymentReceipt[] = [];

export const initialExpenses: Expense[] = [];

