import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Smartphone,
  Lock,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Fingerprint
} from 'lucide-react';
import { UserSession } from '../types/banking';

interface SecurityViewProps {
  sessions: UserSession[];
  onRevokeSession: (sessionId: string) => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  sessions,
  onRevokeSession
}) => {
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [hardwareKeyEnabled, setHardwareKeyEnabled] = useState(true);
  const [wireThreshold, setWireThreshold] = useState('250000');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
          Security Architecture & Access Governance
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          FIDO2 WebAuthn hardware keys, multi-party biometric signing, and session revocation
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Security policies updated across all nodes.</span>
        </div>
      )}

      {/* Grid: Authentication Controls & Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Authentication Policies */}
        <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Multi-Factor Authentication</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Hardware-enforced zero-trust credentialing</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* YubiKey */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-900 text-emerald-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-200">FIDO2 Hardware Security Key</div>
                  <div className="text-[11px] text-neutral-400">YubiKey 5Ci Primary · Registered #YB-4491</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Active
              </span>
            </div>

            {/* Biometrics */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-900 text-emerald-400">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-200">Biometric Signatures (Passkeys)</div>
                  <div className="text-[11px] text-neutral-400">FaceID / TouchID biometric prompts for wires &gt;$50k</div>
                </div>
              </div>
              <button
                onClick={() => setBiometricsEnabled(!biometricsEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  biometricsEnabled ? 'bg-emerald-500' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    biometricsEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Outgoing Wire Threshold Trigger */}
            <form onSubmit={handleSaveSecurity} className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-neutral-200">Dual-Signatory Trigger Limit</div>
                  <div className="text-[11px] text-neutral-400">Wires above this threshold require secondary advisor sign-off</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-neutral-400 text-sm">$</span>
                <input
                  type="number"
                  value={wireThreshold}
                  onChange={(e) => setWireThreshold(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-xs text-emerald-400 font-medium whitespace-nowrap border border-neutral-750"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Active Sessions & Device Revocation */}
        <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Authorized Device Sessions</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Active cryptographic bearer tokens</p>
            </div>
            <Globe className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-200">{sess.device}</span>
                    {sess.isCurrent && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Current Session
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">{sess.browser}</div>
                  <div className="text-[10px] text-neutral-500 font-mono mt-1">
                    {sess.location} · {sess.ipAddress} · {sess.lastActive}
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    onClick={() => onRevokeSession(sess.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors"
                    title="Revoke Session Immediately"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
