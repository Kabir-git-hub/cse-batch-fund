import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Download, ExternalLink, Calendar, Phone, CreditCard, Trash2 } from 'lucide-react';
import { PaymentReceipt, Expense, BatchConfig } from '../../types';

interface ReceiptModalProps {
  config: BatchConfig;
  receipt?: PaymentReceipt | null;
  expense?: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onDeleteExpense?: (id: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  config,
  receipt,
  expense,
  isOpen,
  onClose,
  isAdmin,
  onDeleteExpense,
}) => {
  if (!isOpen || (!receipt && !expense)) return null;

  const handlePrint = () => {
    const printElement = document.getElementById('printable-area');
    if (!printElement) {
      window.print();
      return;
    }

    const docTitle = receipt ? `Receipt_${receipt.receiptNo}` : `Voucher_${expense?.voucherNo || 'Doc'}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 12px; background: white; color: black; }
              .print-container { border: none !important; box-shadow: none !important; padding: 0 !important; max-width: 100% !important; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; padding: 24px; display: flex; justify-content: center; }
            .print-container { background: white; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 600px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    // Try popup window first
    try {
      const printWin = window.open('', '_blank', 'width=750,height=850');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        return;
      }
    } catch (e) {
      console.warn('Window open blocked, falling back to hidden print iframe', e);
    }

    // Fallback to hidden iframe printing
    try {
      let printFrame = document.getElementById('print-hidden-frame') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'print-hidden-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0px';
        printFrame.style.height = '0px';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);
      }

      const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        }, 500);
      } else {
        window.print();
      }
    } catch (e) {
      window.print();
    }
  };

  const handleDownload = () => {
    const printElement = document.getElementById('printable-area');
    if (!printElement) return;

    const docTitle = receipt ? `Receipt_${receipt.receiptNo}` : `Voucher_${expense?.voucherNo || 'Doc'}`;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${docTitle}</title>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; padding: 24px; display: flex; justify-content: center; }
    .container { background: white; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 600px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="container">
    ${printElement.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Top bar controls - Sticky top so Close (X) button is always visible */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0 z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm hidden sm:inline">
              {receipt ? 'Official Money Receipt' : 'Official Expense Voucher'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {expense && isAdmin && onDeleteExpense && (
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(expense.id);
                  onClose();
                }}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                title="Delete Expense Voucher"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Print directly or save as PDF"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Download Receipt Copy"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-900 font-sans flex-1 overflow-y-auto print:p-0 print:overflow-visible" id="printable-area">
          
          {/* SEC CSE Header */}
          <div className="text-center border-b border-slate-200 pb-4 space-y-1">
            <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-xl font-black text-xl flex items-center justify-center mx-auto mb-2">
              SEC
            </div>
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
              {config.institution || 'Sylhet Engineering College'}
            </h2>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Department of Computer Science & Engineering
            </p>
            <p className="text-xs text-slate-500">
              {config.batchName || 'CSE Batch-17'} Fund Management
            </p>
          </div>

          {/* Receipt Meta Details */}
          {receipt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">RECEIPT NO:</span>
                  <span className="font-bold text-slate-900 text-sm">{receipt.receiptNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">DATE:</span>
                  <span className="font-bold text-slate-900">{receipt.paymentDate}</span>
                </div>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">STUDENT ROLL:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{receipt.studentRoll}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">STUDENT NAME:</span>
                  <span className="font-bold text-slate-900 text-sm">{receipt.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">PAYMENT METHOD:</span>
                  <span className="font-medium text-slate-800">{receipt.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TRANSACTION REF:</span>
                  <span className="font-mono font-bold text-emerald-700">{receipt.transactionRef}</span>
                </div>
              </div>

              {/* Cleared Months Breakdown Table */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-2">Cleared Monthly Dues:</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 p-2 font-bold text-slate-700 flex justify-between border-b border-slate-200">
                    <span>Month Description</span>
                    <span>Fee Amount</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                    {receipt.monthsPaid.map((m) => (
                      <div key={m} className="p-2 flex justify-between font-mono">
                        <span className="text-slate-700">{m} Monthly Batch Fund</span>
                        <span className="font-bold text-slate-900">৳ 50.00</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-900 text-white p-3 flex justify-between font-bold text-sm">
                    <span>TOTAL AMOUNT PAID:</span>
                    <span className="text-emerald-400">৳ {receipt.amount}.00 BDT</span>
                  </div>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Payment Verified
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Collector / Treasurer:</span>
                  <span className="font-bold text-slate-900">{receipt.collectorName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Expense Voucher View */}
          {expense && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs font-mono">
                <div>
                  <span className="text-rose-700 block">VOUCHER NO:</span>
                  <span className="font-bold text-slate-900 text-sm">{expense.voucherNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-rose-700 block">EXPENSE DATE:</span>
                  <span className="font-bold text-slate-900">{expense.date}</span>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">PURPOSE / TITLE:</span>
                  <span className="font-bold text-slate-900 text-base">{expense.title}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 block">CATEGORY:</span>
                    <span className="font-bold text-rose-700">{expense.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">AUTHORIZED SPENT BY:</span>
                    <span className="font-bold text-slate-900">{expense.spentBy}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between font-bold">
                <span>TOTAL EXPENDITURE:</span>
                <span className="text-rose-400 text-lg">৳ {expense.amount}.00 BDT</span>
              </div>

              {expense.referenceDocUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <span className="font-bold text-slate-700">Voucher Memo Attachment / Image Proof:</span>
                  <img
                    src={expense.referenceDocUrl}
                    alt="Proof memo"
                    className="w-full max-h-48 object-cover rounded-lg border border-slate-300"
                  />
                  <a
                    href={expense.referenceDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Full Attachment Link
                  </a>
                </div>
              )}

              {expense.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <strong className="text-slate-800">Memo Remarks:</strong> {expense.notes}
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            Developer by Sylhet Engineering College, Department of CSE
          </div>

        </div>

      </div>
    </div>
  );
};
