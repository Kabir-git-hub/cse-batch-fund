import React, { useState } from 'react';
import { X, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, db, doc, getDoc } from '../../firebase';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifyEmail: (email: string, pin?: string, verifiedByGoogle?: boolean) => Promise<boolean>;
  onVerifyPin?: (pin: string) => boolean;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onVerifyEmail,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fallback listener for postMessage OAuth if needed
  React.useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        const { email: verifiedEmail, isAllowed, error: oauthError } = event.data;
        if (isAllowed && verifiedEmail) {
          setSuccessMsg(`Google Account Verified! Access granted for ${verifiedEmail}`);
          onVerifyEmail(verifiedEmail, undefined, true).then((ok) => {
            if (ok) {
              setTimeout(() => onClose(), 600);
            }
          }).catch((err) => {
            setError(err.message || 'Verification error');
          });
        } else {
          setError(oauthError || `Access Denied: Google account (${verifiedEmail}) is not an authorized Admin.`);
        }
        setLoading(false);
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
        setError(event.data.error || 'Google Sign-In failed.');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, onVerifyEmail, onClose]);

  if (!isOpen) return null;

  const handleFirebaseAuthLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 1. Firebase Auth Google Sign-In Popup
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user?.email;

      if (!userEmail) {
        throw new Error('Google Sign-In failed: No email address returned.');
      }

      const cleanEmail = userEmail.trim().toLowerCase();

      // 2. Strict Config Query: ONLY fetch the 'batch' document from the 'config' collection
      const configSnap = await getDoc(doc(db, 'config', 'batch'));
      if (!configSnap.exists()) {
        throw new Error('Configuration document not found in Firestore config/batch.');
      }

      const configData = configSnap.data();
      const rawAllowed = Array.isArray(configData?.allowedAdminEmails) ? configData.allowedAdminEmails : [];
      const allowedAdminEmails = rawAllowed.map((e: any) => String(e || '').trim().toLowerCase());

      // 3. Email Array Check: verify exact existence in allowedAdminEmails array
      const isAllowed = allowedAdminEmails.includes(cleanEmail);
      if (!isAllowed) {
        throw new Error(`Access Denied! '${userEmail}' is not in the authorized admin list in Firestore config.`);
      }

      // 4. Verify email with system backend to complete session setup
      const ok = await onVerifyEmail(userEmail, undefined, true);
      if (ok) {
        setSuccessMsg(`Google Account Verified! Access Granted for ${userEmail}`);
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      console.warn('Google Sign-In authentication error:', err);

      // If popup blocked or popup closed or domain error, try Server OAuth fallback
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/unauthorized-domain' || err.code === 'auth/operation-not-allowed') {
        try {
          const res = await fetch('/api/auth/google/url');
          const data = await res.json();
          if (data.configured && data.url) {
            const authWindow = window.open(
              data.url,
              'google_oauth_popup',
              'width=520,height=680,top=100,left=100'
            );
            if (!authWindow) {
              setError('Google Sign-In popup was blocked by browser. Please allow popups for this site.');
              setLoading(false);
              return;
            }
            return; // postMessage listener will handle result
          }
        } catch (serverErr) {
          console.error('Server OAuth fallback failed:', serverErr);
        }
      }

      setError(err.message || 'Access Denied: Could not verify Google account on this device.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden my-auto flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Top Header */}
        <div className="p-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Admin Authentication</h3>
              <p className="text-[11px] text-slate-500">Google Account Verification Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2 text-left animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-700 flex items-center gap-2 text-left animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="text-center space-y-1.5">
            <h4 className="text-base font-extrabold text-slate-900">Device Authentication</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sign in with your authorized Google Account to verify administrative access on this device.
            </p>
          </div>

          {/* Direct Firebase Auth Google Sign-In Button */}
          <button
            type="button"
            onClick={handleFirebaseAuthLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <GoogleIcon />
            <span>{loading ? 'Authenticating...' : 'Sign In with Google'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 py-3 text-center text-[10px] text-slate-400 border-t border-slate-100 font-medium">
          Protected by Google Workspace & Firebase Auth
        </div>

      </div>
    </div>
  );
};




