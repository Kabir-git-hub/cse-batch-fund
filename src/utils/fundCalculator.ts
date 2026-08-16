import { BatchConfig, Student, PaymentReceipt, Expense, FundStats, StudentFundStatus } from '../types';

export function getMonthsRange(startYYYYMM: string, endYYYYMM: string): string[] {
  const months: string[] = [];
  const [startYear, startMonth] = (startYYYYMM || '2026-08').split('-').map(Number);
  const [endYear, endMonth] = (endYYYYMM || '2028-01').split('-').map(Number);

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

export function getCurrentMonthYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function calculateFundDetails(
  config: BatchConfig,
  students: Student[],
  receipts: PaymentReceipt[],
  expenses: Expense[]
): {
  studentStatuses: StudentFundStatus[];
  stats: FundStats;
  allTargetMonths: string[];
} {
  const currentMonth = getCurrentMonthYYYYMM();
  const startMonth = config?.startMonth || '2026-08';
  const endMonth = '2028-01'; // Target range: August 2026 to January 2028
  const allTargetMonths = getMonthsRange(startMonth, endMonth);

  // Evaluate dues only for elapsed/current months (up to current real-time month)
  const evaluationEndMonth = currentMonth >= startMonth ? currentMonth : startMonth;
  const elapsedMonths = getMonthsRange(startMonth, evaluationEndMonth);

  // Calculate per-student payment status
  const studentStatuses: StudentFundStatus[] = (students || []).map((student) => {
    // Gather all receipts for student
    const studentReceipts = (receipts || []).filter(
      (r) => r.studentId === student.id || r.studentRoll === student.roll
    );

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
    const dueAmount = totalMonthsDue * (config?.monthlyFee || 50);

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
  const totalCollected = (receipts || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalSpent = (expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const netBalance = totalCollected - totalSpent;

  const totalStudents = (students || []).filter((s) => s.status === 'active').length;
  const paidUpStudentsCount = studentStatuses.filter((s) => s.status === 'paid_up').length;
  const overdueStudentsCount = studentStatuses.filter((s) => s.status === 'overdue').length;

  const totalExpectedTarget = totalStudents * allTargetMonths.length * (config?.monthlyFee || 50);
  const collectionRate = totalExpectedTarget > 0 ? Math.round((totalCollected / totalExpectedTarget) * 100) : 0;

  const thisMonthReceipts = (receipts || []).filter((r) => r.paymentDate && r.paymentDate.startsWith(currentMonth));
  const thisMonthCollected = thisMonthReceipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const thisMonthExpensesList = (expenses || []).filter((e) => e.date && e.date.startsWith(currentMonth));
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
