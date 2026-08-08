import React, { useState } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { Student } from '../../types';

interface StudentModalProps {
  existingStudent?: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (studentData: any) => Promise<void>;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  existingStudent,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [roll, setRoll] = useState(existingStudent?.roll || '');
  const [name, setName] = useState(existingStudent?.name || '');
  const [phone, setPhone] = useState(existingStudent?.phone || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(existingStudent?.status || 'active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prevIsOpen = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setRoll(existingStudent?.roll || '');
      setName(existingStudent?.name || '');
      setPhone(existingStudent?.phone || '');
      setStatus(existingStudent?.status || 'active');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, existingStudent]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roll || !name) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: existingStudent?.id,
        roll,
        name,
        phone,
        status,
        joinedMonth: existingStudent?.joinedMonth || '2025-01',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {existingStudent ? 'Edit Student Profile' : 'Add New Student'}
              </h3>
              <p className="text-xs text-slate-400">Sylhet Engineering College — CSE Batch-17</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student Registration / Roll No *
            </label>
            <input
              type="text"
              placeholder="e.g. 2023331546"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Al Amin Kabir"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile / WhatsApp Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g. 01712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enrollment Status
            </label>
            <select
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="active">Active Student</option>
              <option value="inactive">Inactive / Transferred</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !roll || !name}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Student Record
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
