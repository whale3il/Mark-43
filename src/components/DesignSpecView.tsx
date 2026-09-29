import React, { useState } from 'react';
import {
  Layers,
  Palette,
  Type,
  Component,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Code,
  Sparkles,
  Layout,
  ArrowRight,
  Shield,
  CreditCard,
  Send,
  Eye
} from 'lucide-react';

export const DesignSpecView: React.FC<{ onReturnToApp: () => void }> = ({ onReturnToApp }) => {
  const [activeSpecSection, setActiveSpecSection] = useState<'tokens' | 'typography' | 'components' | 'states' | 'flows'>('tokens');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner with Quick Switch */}
      <div className="p-6 md:p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
            <Layers className="w-4 h-4" />
            <span>Aureus OS · Design System & UI Specification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 font-sans mt-2">
            Fintech Design Architecture & Token Sheet
          </h1>
          <p className="text-xs text-neutral-400 max-w-2xl mt-1 leading-relaxed">
            Engineered per the Swiss Minimalist Private Banking Constitution: Zero-pill metadata discipline, single-elevation depth, 60-30-10 color allocation, and tabular monospace numerals.
          </p>
        </div>

        <button
          onClick={onReturnToApp}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors flex items-center gap-2 shrink-0 shadow-sm"
        >
          <span>Return to Live Banking App</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Spec Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 overflow-x-auto text-xs font-medium">
        {[
          { id: 'tokens', label: '1. Color & Elevation Tokens', icon: Palette },
          { id: 'typography', label: '2. Typography & Tabular Scale', icon: Type },
          { id: 'components', label: '3. Component Blueprint Matrix', icon: Component },
          { id: 'states', label: '4. State Completeness (Empty/Loading/Error)', icon: Sparkles },
          { id: 'flows', label: '5. UX Flow Diagrams & Architecture', icon: Layout },
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSpecSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSpecSection(sec.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-emerald-400 border border-neutral-700 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: Color Tokens */}
      {activeSpecSection === 'tokens' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-100">60-30-10 Discipline & Token Palette</h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
              Strict color budget: <strong>60%</strong> neutral canvas, <strong>30%</strong> structural card surfaces with hairline 1px borders, and <strong>10%</strong> high-intent emerald accents. The light theme meticulously mirrors these optical weights with crisp Executive Slate and Pure White cards.
            </p>

            <div className="text-xs font-semibold text-neutral-300 font-mono uppercase text-[11px] pt-1">
              Dark Theme (Obsidian Matrix)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950">
                <div className="w-full h-12 rounded-lg bg-neutral-950 border border-neutral-800 mb-2" />
                <div className="text-xs font-semibold text-neutral-200">Canvas Base</div>
                <div className="text-[10px] font-mono text-neutral-500">#0a0a0a · 60%</div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950">
                <div className="w-full h-12 rounded-lg bg-neutral-900 border border-neutral-750 mb-2" />
                <div className="text-xs font-semibold text-neutral-200">Card Surface</div>
                <div className="text-[10px] font-mono text-neutral-500">#171717 · 30%</div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950">
                <div className="w-full h-12 rounded-lg bg-emerald-500 mb-2" />
                <div className="text-xs font-semibold text-neutral-200">Emerald Primary</div>
                <div className="text-[10px] font-mono text-emerald-400">#10b981 · 10%</div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950">
                <div className="w-full h-12 rounded-lg bg-amber-500 mb-2" />
                <div className="text-xs font-semibold text-neutral-200">Yield Amber</div>
                <div className="text-[10px] font-mono text-amber-400">#f59e0b · Alert</div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950">
                <div className="w-full h-12 rounded-lg bg-sky-500 mb-2" />
                <div className="text-xs font-semibold text-neutral-200">Frozen Ice Cyan</div>
                <div className="text-[10px] font-mono text-sky-400">#0ea5e9 · State</div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950">
                <div className="w-full h-12 rounded-lg bg-rose-500 mb-2" />
                <div className="text-xs font-semibold text-neutral-200">Critical Rose</div>
                <div className="text-[10px] font-mono text-rose-400">#f43f5e · Error</div>
              </div>
            </div>

            <div className="text-xs font-semibold text-neutral-300 font-mono uppercase text-[11px] pt-4">
              Light Theme Mirror (Executive Slate & Pure White)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-xs">
                <div className="w-full h-12 rounded-lg bg-slate-100 border border-slate-300 mb-2" />
                <div className="text-xs font-semibold text-slate-900">Canvas Base</div>
                <div className="text-[10px] font-mono text-slate-500">#f8fafc · 60%</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-xs">
                <div className="w-full h-12 rounded-lg bg-white border border-slate-200 mb-2" />
                <div className="text-xs font-semibold text-slate-900">Card Surface</div>
                <div className="text-[10px] font-mono text-slate-500">#ffffff · 30%</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-xs">
                <div className="w-full h-12 rounded-lg bg-emerald-600 mb-2" />
                <div className="text-xs font-semibold text-slate-900">High-Contrast Green</div>
                <div className="text-[10px] font-mono text-emerald-600">#059669 · 10%</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-xs">
                <div className="w-full h-12 rounded-lg bg-amber-600 mb-2" />
                <div className="text-xs font-semibold text-slate-900">Yield Amber</div>
                <div className="text-[10px] font-mono text-amber-600">#d97706 · Alert</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-xs">
                <div className="w-full h-12 rounded-lg bg-cyan-600 mb-2" />
                <div className="text-xs font-semibold text-slate-900">Cyan Accents</div>
                <div className="text-[10px] font-mono text-cyan-600">#0891b2 · State</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-xs">
                <div className="w-full h-12 rounded-lg bg-rose-600 mb-2" />
                <div className="text-xs font-semibold text-slate-900">Rose Critical</div>
                <div className="text-[10px] font-mono text-rose-600">#e11d48 · Error</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Typography Scale */}
      {activeSpecSection === 'typography' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-5">
            <h2 className="text-sm font-semibold text-neutral-100">The 2+1 Typographic Rule</h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
              <strong>Plus Jakarta Sans</strong> for optical balance and crisp hierarchy, paired strictly with <strong>JetBrains Mono</strong> with <code className="font-mono text-emerald-400">tabular-nums</code> for financial vertical alignment.
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold font-sans text-neutral-100 tracking-tight">
                    $1,482,940.50
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-0.5">Display Large KPI · 32px · Weight 700</div>
                </div>
                <div className="text-xs font-mono text-neutral-400">font-sans tabular-nums tracking-tight</div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-neutral-100">
                    NetJets Europe Fractional Charter · Settled
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-0.5">Section Title & Body · 14px · Weight 600</div>
                </div>
                <div className="text-xs font-mono text-neutral-400">text-sm font-semibold text-neutral-100</div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-neutral-400 flex items-center gap-2">
                    <span>Federal Reserve Clearing</span>
                    <span>·</span>
                    <span>Fedwire MT103</span>
                    <span>·</span>
                    <span className="font-mono text-emerald-400">Instant</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-0.5">Zero-Pill Metadata · 12px · Unboxed with bullet separators</div>
                </div>
                <div className="text-xs font-mono text-neutral-400">text-xs text-neutral-400 (NO pill badges)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Components Blueprint */}
      {activeSpecSection === 'components' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-6">
            <h2 className="text-sm font-semibold text-neutral-100">Core Component Library</h2>

            {/* Button States */}
            <div>
              <div className="text-xs font-semibold text-neutral-300 mb-3 font-mono uppercase text-[11px]">
                Button Affordances
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs shadow-sm hover:bg-emerald-400">
                  Primary Emerald
                </button>
                <button className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 font-medium text-xs hover:bg-neutral-850">
                  Secondary Obsidian
                </button>
                <button className="px-4 py-2 rounded-xl bg-neutral-850 border border-neutral-750 text-emerald-400 font-medium text-xs">
                  Subtle Accent
                </button>
                <button disabled className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-600 font-medium text-xs border border-neutral-850 cursor-not-allowed">
                  Disabled State
                </button>
              </div>
            </div>

            {/* Form Inputs */}
            <div>
              <div className="text-xs font-semibold text-neutral-300 mb-3 font-mono uppercase text-[11px]">
                Form Inputs & Presets
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Standard Field</label>
                  <input
                    type="text"
                    readOnly
                    value="Cambridge Wealth Trust"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Currency Formatted Tabular</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">$</span>
                    <input
                      type="text"
                      readOnly
                      value="250,000.00"
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: States Completeness */}
      {activeSpecSection === 'states' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">State Completeness Specification</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Every screen implements Populated, Skeleton Loading, Empty, and Error states.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Loading Skeleton */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="text-xs font-semibold text-neutral-400 font-mono">Loading Skeleton</div>
                <div className="h-4 w-3/4 bg-neutral-800 rounded animate-pulse" />
                <div className="h-7 w-1/2 bg-neutral-800 rounded animate-pulse" />
                <div className="h-3 w-full bg-neutral-850 rounded animate-pulse" />
              </div>

              {/* 2. Empty State */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
                <div className="text-xs font-semibold text-neutral-400 font-mono">Empty State</div>
                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 font-medium">No Virtual Cards Generated</div>
                <div className="text-[10px] text-neutral-500">Issue your first disposable card to get started</div>
              </div>

              {/* 3. Error / Warning State */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="text-xs font-semibold text-neutral-400 font-mono">Error / Guardrail State</div>
                <div className="flex items-center gap-2 text-rose-400 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Wire exceeds daily threshold</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Disbursements over $2,500,000 require dual-signatory verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: UX Flow Blueprints */}
      {activeSpecSection === 'flows' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-5">
            <h2 className="text-sm font-semibold text-neutral-100">UX Architecture & Transfer State Machine</h2>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                Wire Transfer Lifecycle: 4-Step Irrevocable Pipeline
              </div>

              {/* Wire Transfer Lifecycle */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="font-mono text-neutral-500 text-[10px]">STEP 01</div>
                  <div className="font-semibold text-neutral-200 mt-1">Configure Wire</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Source account, beneficiary, amount, and speed</div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="font-mono text-neutral-500 text-[10px]">STEP 02</div>
                  <div className="font-semibold text-neutral-200 mt-1">Security Review</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">OFAC sanctions scrub & fee waiver validation</div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="font-mono text-neutral-500 text-[10px]">STEP 03</div>
                  <div className="font-semibold text-neutral-200 mt-1">Disbursement</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Fedwire clearing via BNY Mellon correspondent</div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                  <div className="font-mono text-emerald-400 text-[10px]">STEP 04</div>
                  <div className="font-semibold text-emerald-300 mt-1">Settled Receipt</div>
                  <div className="text-[11px] text-neutral-300 mt-0.5">Cryptographic PDF receipt with reference ID</div>
                </div>
              </div>
            </div>

            {/* Authentication & NUBAN Account Lifecycle */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                Authentication & NUBAN Onboarding Pipeline (Prisma / Express Architecture)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="font-mono text-neutral-500 text-[10px]">STAGE 01</div>
                  <div className="font-semibold text-neutral-200 mt-1">User Account</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Identity credentials, email, password & CBN Tier 3 consent</div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="font-mono text-neutral-500 text-[10px]">STAGE 02</div>
                  <div className="font-semibold text-neutral-200 mt-1">Transaction PIN</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">4-digit cryptographic transaction authorization key</div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="font-mono text-neutral-500 text-[10px]">STAGE 03</div>
                  <div className="font-semibold text-neutral-200 mt-1">Account Select</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">Tier 3 Savings, Current, Domiciliary FX, or Escrow</div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <div className="font-mono text-neutral-500 text-[10px]">STAGE 04</div>
                  <div className="font-semibold text-neutral-200 mt-1">NUBAN Minting</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">10-digit CBN modulo-10 algorithm check digit calculation</div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                  <div className="font-mono text-emerald-400 text-[10px]">STAGE 05</div>
                  <div className="font-semibold text-emerald-300 mt-1">Vault Launch</div>
                  <div className="text-[11px] text-neutral-300 mt-0.5">NIP clearing ready, redirect to executive dashboard</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
