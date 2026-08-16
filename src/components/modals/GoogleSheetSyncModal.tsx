import React, { useState } from 'react';
import { FileSpreadsheet, X, RefreshCw, CheckCircle2, Copy, ExternalLink, ShieldCheck, Zap, AlertCircle, UserPlus, Trash2, Shield, Mail } from 'lucide-react';
import { BatchConfig } from '../../types';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BatchConfig | null;
  adminPin: string;
  onSaveConfig: (newConfig: Partial<BatchConfig>) => Promise<void>;
  onTriggerSync: (url?: string, type?: 'payments' | 'expenses' | 'all') => Promise<any>;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  adminPin,
  onSaveConfig,
  onTriggerSync,
}) => {
  const [sheetUrl, setSheetUrl] = useState(config?.googleSheetPaymentsUrl || '');
  const [webhookUrl, setWebhookUrl] = useState(config?.googleSheetWebhookUrl || '');
  const [allowedEmails, setAllowedEmails] = useState<string[]>(config?.allowedAdminEmails || []);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const prevIsOpen = React.useRef(false);

  React.useEffect(() => {
    if (config && isOpen && !prevIsOpen.current) {
      setSheetUrl(config.googleSheetPaymentsUrl || '');
      setWebhookUrl(config.googleSheetWebhookUrl || '');
      setAllowedEmails(config.allowedAdminEmails || []);
    }
    prevIsOpen.current = isOpen;
  }, [config, isOpen]);

  if (!isOpen || !config) return null;

  const handleAddAdminEmail = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) return;
    setAddingEmail(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/fund/admin/manage-emails?t=${new Date().getTime()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          email: newAdminEmail.trim(),
          pin: adminPin,
          requesterEmail: localStorage.getItem('sec_admin_email') || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add admin email');
      setAllowedEmails(data.allowedAdminEmails || []);
      setNewAdminEmail('');
      setMessage({ type: 'success', text: data.message || 'Admin Gmail added successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRemoveAdminEmail = async (emailToRemove: string) => {
    if (!confirm(`Are you sure you want to remove ${emailToRemove} from Admin access?`)) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/fund/admin/manage-emails?t=${new Date().getTime()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          email: emailToRemove,
          pin: adminPin,
          requesterEmail: localStorage.getItem('sec_admin_email') || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove admin email');
      setAllowedEmails(data.allowedAdminEmails || []);
      setMessage({ type: 'success', text: data.message || 'Admin Gmail removed.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const appScriptCode = `// Google Apps Script for SEC 17 Batch Fund Realtime 2-Way Sync
var WEBHOOK_URL = "${window.location.origin}/api/fund/sheet-webhook";

// Triggers mapping - all points lead to notifyWebApp()
function onChange(e) {
  notifyWebApp();
}

function handleSheetChange(e) {
  notifyWebApp();
}

function onSheetChange(e) {
  notifyWebApp();
}

function onEdit(e) {
  notifyWebApp();
}

function notifyWebApp() {
  try {
    if (!WEBHOOK_URL || WEBHOOK_URL.indexOf('http') !== 0) return;
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ event: 'sheet_modified', timestamp: new Date().getTime() }),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (err) {
    Logger.log("Webhook sync error: " + err.message);
  }
}

function doPost(e) {
  try {
    var rawContent = e.postData ? e.postData.contents : (e.parameter ? JSON.stringify(e.parameter) : '{}');
    var data = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.action === 'test') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Apps Script Webhook is active!' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'push_all') {
      var sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
      var values = sheet.getDataRange().getValues();
      var headers = values[0].map(function(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); });
      var rollCol = headers.findIndex(function(h) { return h.indexOf('roll') >= 0 || h.indexOf('id') >= 0; });
      if (rollCol < 0) rollCol = 0;
      var totalPaidCol = headers.findIndex(function(h) { return h.indexOf('paid') >= 0 || h.indexOf('amount') >= 0 || h.indexOf('total') >= 0; });
      if (totalPaidCol < 0) totalPaidCol = 3;

      var totals = data.studentTotals || {};
      for (var i = 1; i < values.length; i++) {
        var rowRoll = String(values[i][rollCol]).replace(/\\.0+$/, '').replace(/[^0-9a-zA-Z]/g, '');
        if (rowRoll && totals[rowRoll] !== undefined) {
          sheet.getRange(i + 1, totalPaidCol + 1).setValue(totals[rowRoll]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'All website payments pushed to Google Sheet!' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'payment') {
      var sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
      var values = sheet.getDataRange().getValues();
      var headers = values[0].map(function(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); });
      
      var rollCol = headers.findIndex(function(h) { return h.indexOf('roll') >= 0 || h.indexOf('id') >= 0; });
      if (rollCol < 0) rollCol = 0;
      
      var totalPaidCol = headers.findIndex(function(h) { return h.indexOf('paid') >= 0 || h.indexOf('amount') >= 0 || h.indexOf('total') >= 0; });
      if (totalPaidCol < 0) totalPaidCol = 3; // Default Column D
      
      var found = false;
      for (var i = 1; i < values.length; i++) {
        var rowRoll = String(values[i][rollCol]).replace(/\\.0+$/, '').replace(/[^0-9a-zA-Z]/g, '');
        var targetRoll = String(data.studentRoll).replace(/\\.0+$/, '').replace(/[^0-9a-zA-Z]/g, '');
        
        if (rowRoll && targetRoll && (rowRoll === targetRoll || rowRoll.indexOf(targetRoll) >= 0 || targetRoll.indexOf(rowRoll) >= 0)) {
          var currentPaid = Number(values[i][totalPaidCol]) || 0;
          sheet.getRange(i + 1, totalPaidCol + 1).setValue(currentPaid + Number(data.amount));
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([data.studentRoll, data.studentName, '', data.amount, 'Paid']);
      }
    } else if (data.action === 'delete_payment') {
      var sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
      var values = sheet.getDataRange().getValues();
      var headers = values[0].map(function(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); });
      var rollCol = headers.findIndex(function(h) { return h.indexOf('roll') >= 0 || h.indexOf('id') >= 0; });
      if (rollCol < 0) rollCol = 0;
      var totalPaidCol = headers.findIndex(function(h) { return h.indexOf('paid') >= 0 || h.indexOf('amount') >= 0 || h.indexOf('total') >= 0; });
      if (totalPaidCol < 0) totalPaidCol = 3;
      
      for (var i = 1; i < values.length; i++) {
        var rowRoll = String(values[i][rollCol]).replace(/\\.0+$/, '').replace(/[^0-9a-zA-Z]/g, '');
        var targetRoll = String(data.studentRoll).replace(/\\.0+$/, '').replace(/[^0-9a-zA-Z]/g, '');
        if (rowRoll && targetRoll && (rowRoll === targetRoll || rowRoll.indexOf(targetRoll) >= 0 || targetRoll.indexOf(rowRoll) >= 0)) {
          var currentPaid = Number(values[i][totalPaidCol]) || 0;
          var newPaid = Math.max(0, currentPaid - Number(data.amount));
          sheet.getRange(i + 1, totalPaidCol + 1).setValue(newPaid);
          break;
        }
      }
    } else if (data.action === 'expense') {
      var sheet2 = ss.getSheetByName('Sheet2') || ss.getSheets()[1];
      if (!sheet2) {
        sheet2 = ss.insertSheet('Sheet2');
        sheet2.appendRow(['VoucherNo', 'Title', 'Category', 'Amount', 'Date', 'SpentBy', 'Notes']);
      }
      sheet2.appendRow([data.voucherNo, data.title, data.category, data.amount, data.date, data.spentBy, data.notes]);
    } else if (data.action === 'delete_expense' || data.type === 'delete_expense') {
      var sheet2 = ss.getSheetByName('Sheet2') || ss.getSheets()[1];
      if (sheet2) {
        var values = sheet2.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][0]) === String(data.voucherNo) || (data.title && String(values[i][1]).toLowerCase() === String(data.title).toLowerCase())) {
            sheet2.deleteRow(i + 1);
            break;
          }
        }
      }
    } else if (data.type === 'add_student' || data.action === 'add_student') {
      var sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
      var values = sheet.getDataRange().getValues();
      var headers = values[0].map(function(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); });
      var rollCol = headers.findIndex(function(h) { return h.indexOf('roll') >= 0 || h.indexOf('id') >= 0; });
      if (rollCol < 0) rollCol = 0;
      
      var targetRoll = String(data.studentRoll || '').trim();
      var foundIndex = -1;
      for (var i = 1; i < values.length; i++) {
        var rowRoll = String(values[i][rollCol]).replace(/\\.0+$/, '').replace(/[^0-9a-zA-Z]/g, '');
        if (rowRoll === targetRoll) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex < 0) {
        sheet.appendRow([data.studentRoll, data.name || '', data.phone || '', 0, 'Active']);
      }
    } else if (data.type === 'delete_student' || data.action === 'delete_student') {
      var sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
      var values = sheet.getDataRange().getValues();
      var headers = values[0].map(function(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); });
      var rollCol = headers.findIndex(function(h) { return h.indexOf('roll') >= 0 || h.indexOf('id') >= 0; });
      if (rollCol < 0) rollCol = 0;
      
      var targetRoll = String(data.studentRoll || '').trim();
      for (var i = 1; i < values.length; i++) {
        var rowRoll = String(values[i][rollCol]).replace(/\\.0+$/, '').replace(/[^0-9a-zA-Z]/g, '');
        if (rowRoll === targetRoll) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSaveConfig({
        googleSheetPaymentsUrl: sheetUrl.trim(),
        googleSheetWebhookUrl: webhookUrl.trim(),
      });
      setMessage({ type: 'success', text: 'Google Sheet URLs updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await onTriggerSync(sheetUrl.trim(), 'all');
      if (result && result.message) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'success', text: 'Live Google Sheet sync complete!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    setMessage(null);
    try {
      // First save configuration if modified
      await onSaveConfig({
        googleSheetPaymentsUrl: sheetUrl.trim(),
        googleSheetWebhookUrl: webhookUrl.trim(),
      });
      const res = await fetch(`/api/fund/test-webhook?t=${new Date().getTime()}`, {
        method: 'POST',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Webhook test failed');
      }
      setMessage({ type: 'success', text: '✅ Webhook connection successful! Google Apps Script is working.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Webhook test failed. Make sure you pasted the deployed Apps Script URL.' });
    } finally {
      setTesting(false);
    }
  };

  const handlePushAllData = async () => {
    setPushing(true);
    setMessage(null);
    try {
      // First save configuration
      await onSaveConfig({
        googleSheetPaymentsUrl: sheetUrl.trim(),
        googleSheetWebhookUrl: webhookUrl.trim(),
      });
      const res = await fetch(`/api/fund/push-to-google-sheet?t=${new Date().getTime()}`, {
        method: 'POST',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Push failed');
      }
      setMessage({ type: 'success', text: '🚀 All website payments & student totals pushed to Google Sheet!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to push website data to Google Sheet' });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Google Sheets 2-Way Live Sync
              </h3>
              <p className="text-xs text-slate-400">
                Seamless real-time synchronization between Google Sheets & Website
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {message.text}
            </div>
          )}

          {/* Section 1: Sheet -> Website URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. Google Sheet Edit/View URL (Sheet ➔ Website)
            </label>
            <p className="text-xs text-slate-400 leading-relaxed">
              When data is entered in Google Sheet (e.g., TotalPaid), the website automatically reads it every few seconds.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Pull Now
              </button>
            </div>
          </div>

          {/* Section 2: Website -> Sheet Apps Script Webhook URL */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>2. Google Apps Script Webhook URL (Website ➔ Sheet)</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono uppercase">
                Instant Push
              </span>
            </label>
            <p className="text-xs text-slate-400 leading-relaxed">
              ওয়েবসাইট থেকে টাকা সংগ্রহ করলে বা খরচ যুক্ত করলে তা সরাসরি গুগল শিটে অটোমেটিক আপডেট করার জন্য আপনার Google Apps Script Web App URL-টি নিচে পেস্ট করুন:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleTestWebhook}
                disabled={testing || !webhookUrl}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition disabled:opacity-50"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                Test Webhook
              </button>
            </div>

            {/* Manual Push All Button */}
            <div className="pt-2 flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="text-xs">
                <span className="font-bold text-slate-200 block">ওয়েবসাইটের সকল কালেকশন গুগল শিটে পাঠান</span>
                <span className="text-[11px] text-slate-400">ওয়েবসাইটের বর্তমান সকল পেমেন্ট এক ক্লিকে গুগল শিটের Col D (TotalPaid)-এ আপডেট করুন</span>
              </div>
              <button
                onClick={handlePushAllData}
                disabled={pushing || !webhookUrl}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                {pushing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Push Data ➔ Sheet
              </button>
            </div>
          </div>

          {/* Section 3: Authorized Admin Gmail Accounts */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>3. Authorized Admin Gmail Accounts</span>
              </label>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono uppercase">
                {allowedEmails.length} Admin{allowedEmails.length > 1 ? 's' : ''} Authorized
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              শুধুমাত্র নিচের Gmail অ্যাড্রেসগুলো দিয়ে এডমিন প্যানেলে লগইন করা যাবে। নতুন কোনো Gmail যুক্ত করতে নিচে এড করে "Add Gmail" এ ক্লিক করুন।
            </p>

            {/* List of currently allowed admin emails */}
            <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {allowedEmails.map((email) => (
                <div key={email} className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-mono font-medium text-slate-200">{email}</span>
                  </div>

                  <button
                    onClick={() => handleRemoveAdminEmail(email)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                    title="Remove Admin Access"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Input to add new admin email */}
            <div className="flex gap-2 pt-1">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="Enter new admin gmail (e.g. newadmin@gmail.com)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleAddAdminEmail}
                disabled={addingEmail || !newAdminEmail.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition disabled:opacity-50 cursor-pointer"
              >
                {addingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Add Gmail
              </button>
            </div>
          </div>

          {/* Setup Guide for Google Apps Script */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Quick Apps Script Setup (30 Seconds)
              </span>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Code!' : 'Copy Apps Script'}
              </button>
            </div>

            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Open your Google Sheet ➔ Click <strong>Extensions</strong> ➔ <strong>Apps Script</strong>.</li>
              <li>Delete any existing code, paste the copied script, and click <strong>Save</strong>.</li>
              <li>Click <strong>Deploy</strong> ➔ <strong>New Deployment</strong> ➔ Select type: <strong>Web app</strong>.</li>
              <li>Set <em>Execute as: Me</em> and <em>Who has access: <strong>Anyone</strong></em>.</li>
              <li>Click <strong>Deploy</strong>, copy the <code>Web app URL</code>, and paste it in the box above!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950/80 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Last Synced: {config.lastSyncTime ? new Date(config.lastSyncTime).toLocaleTimeString() : 'Never'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Save Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
