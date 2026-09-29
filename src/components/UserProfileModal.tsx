import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Landmark,
  KeyRound,
  CheckCircle2,
  LogOut,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Shield
} from 'lucide-react';
import { AuthUser } from '../types/auth';

interface UserProfileModalProps {
  user: AuthUser;
  onClose: () => void;
  onLogout: () => void;
  onOpenSupport: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onLogout,
  onOpenSupport
}) => {
  const [copied, setCopied] = useState(false);
  const [pinChangeMode, setPinChangeMode] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(user.primaryAccountNumber || '0129482015');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) return;
    setPinSuccess(true);
    setTimeout(() => {
      setPinChangeMode(false);
      setPinSuccess(false);
      setOldPin('');
      setNewPin('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Card Header */}
        <div className="flex items-center gap-4 pb-5 border-b border-neutral-800">
          <img
            src={user.avatarUrl}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-2xl object-cover border border-neutral-700 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-100">{user.name}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {user.kycLevel}
              </span>
            </div>
            <p className="text-xs text-neutral-400">{user.email}</p>
            <p className="text-[11px] font-mono text-emerald-400 mt-0.5">{user.clientTier}</p>
          </div>
        </div>

        {/* Account Coordinates */}
        <div className="mt-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="font-mono text-[11px]">Primary Nigerian NUBAN</span>
              <button
                onClick={handleCopyAccount}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-lg font-mono font-bold text-neutral-100">
              {user.primaryAccountNumber || '8940 3120 4821'}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono flex items-center gap-3">
              <span>Clearing: Aureus Wealth Bank (090)</span>
              <span>·</span>
              <span>Sort Code: 090110</span>
            </div>
          </div>

          {/* Identification Details */}
          <div className="grid grid-cols-2 gap-3 text-neutral-300">
            <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block">Phone Channel</span>
              <span className="font-mono text-xs text-neutral-200 mt-0.5 block truncate">
                {user.phone || '+234 1 890 4421'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block">Member Since</span>
              <span className="font-mono text-xs text-neutral-200 mt-0.5 block">
                {user.memberSince || '2024'}
              </span>
            </div>
          </div>

          {/* Security & Transaction PIN Section */}
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-200 font-medium">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>4-Digit Transaction PIN</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active & Enforced
              </span>
            </div>

            {!pinChangeMode ? (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Used for wire disbursements & bill payments</span>
                <button
                  onClick={() => setPinChangeMode(true)}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Change PIN
                </button>
              </div>
            ) : (
              <form onSubmit={handleSavePin} className="space-y-3 pt-2 border-t border-neutral-800">
                {pinSuccess ? (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PIN successfully updated!</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Current PIN"
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-xs text-neutral-100 font-mono"
                        required
                      />
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="New 4-digit PIN"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-xs text-neutral-100 font-mono"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPinChangeMode(false)}
                        className="text-xs text-neutral-400 hover:text-neutral-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs"
                      >
                        Save PIN
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Relationship Manager Contact */}
          <div className="p-3.5 rounded-xl bg-neutral-950/40 border border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-500 block">Dedicated Wealth Advisor</span>
              <span className="font-medium text-neutral-200 block mt-0.5">
                {user.relationshipManager.name}
              </span>
              <span className="text-[11px] text-neutral-400 block truncate">
                {user.relationshipManager.email}
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSupport();
              }}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
            >
              <span>Contact Desk</span>
              <ExternalLink className="w-3 h-3 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Modal Footer / Logout Action */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            Close
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Lock Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
