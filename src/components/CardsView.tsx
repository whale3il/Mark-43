import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RotateCw,
  Plus,
  Sliders,
  ShieldAlert,
  Wifi,
  Smartphone,
  Check,
  AlertTriangle,
  Zap,
  Globe
} from 'lucide-react';
import { PaymentCard } from '../types/banking';

interface CardsViewProps {
  cards: PaymentCard[];
  onUpdateCard: (updatedCard: PaymentCard) => void;
  onIssueNewCard: (card: PaymentCard) => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  cards,
  onUpdateCard,
  onIssueNewCard
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id || '');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinChallengePassed, setPinChallengePassed] = useState(false);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [newCardNickname, setNewCardNickname] = useState('Online Subscriptions');
  const [newCardLimit, setNewCardLimit] = useState(15000);

  const currentCard = cards.find(c => c.id === selectedCardId) || cards[0];

  const handleToggleFreeze = () => {
    onUpdateCard({
      ...currentCard,
      isFrozen: !currentCard.isFrozen
    });
  };

  const handleToggleContactless = () => {
    onUpdateCard({
      ...currentCard,
      contactlessEnabled: !currentCard.contactlessEnabled
    });
  };

  const handleToggleOnline = () => {
    onUpdateCard({
      ...currentCard,
      onlinePaymentsEnabled: !currentCard.onlinePaymentsEnabled
    });
  };

  const handleLimitChange = (newLimit: number) => {
    onUpdateCard({
      ...currentCard,
      monthlyLimit: newLimit
    });
  };

  const handleCreateVirtualCard = (e: React.FormEvent) => {
    e.preventDefault();
    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const newCard: PaymentCard = {
      id: `card-${Date.now()}`,
      nameOnCard: newCardNickname.toUpperCase(),
      cardType: 'virtual',
      tier: 'Titanium Precision Virtual',
      last4,
      fullNumberMasked: `4242 •••• •••• ${last4}`,
      fullNumberRevealed: `4242 8192 0041 ${last4}`,
      expiry: '09/28',
      cvv: Math.floor(100 + Math.random() * 900).toString(),
      billingZip: '10022',
      isFrozen: false,
      contactlessEnabled: false,
      onlinePaymentsEnabled: true,
      atmWithdrawalsEnabled: false,
      monthlyLimit: newCardLimit,
      spentThisMonth: 0,
      dailyAtmLimit: 0,
      atmSpentToday: 0,
      pin: '4820',
      linkedAccountId: 'acc-1'
    };
    onIssueNewCard(newCard);
    setSelectedCardId(newCard.id);
    setShowNewCardModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
            Cards & Biometric Controls
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Heavyweight Obsidian physical metal cards and single-merchant disposable virtual cards
          </p>
        </div>

        <button
          onClick={() => setShowNewCardModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Issue Virtual Card</span>
        </button>
      </div>

      {/* Card Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {cards.map((c) => {
          const isSelected = c.id === selectedCardId;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCardId(c.id);
                setIsFlipped(false);
                setShowFullNumber(false);
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'border-emerald-500/50 bg-neutral-900 text-neutral-100 ring-1 ring-emerald-500/20'
                  : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CreditCard className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-neutral-500'}`} />
              <span>{c.tier} (•• {c.last4})</span>
              {c.isFrozen && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/40">
                  Frozen
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2-Column: Card Graphic & Flip Controls + Card Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Col: 3D Flip Card */}
        <div className="space-y-4 flex flex-col items-center">
          {/* The Physical / Virtual Card Container */}
          <div
            className={`w-full max-w-[420px] aspect-[1.586] rounded-2xl relative p-6 transition-all duration-500 transform shadow-2xl overflow-hidden border border-neutral-700/60 ${
              currentCard.isFrozen ? 'opacity-70 saturate-50' : ''
            }`}
            style={{
              backgroundImage: 'radial-gradient(ellipse at top left, #262626 0%, #141414 50%, #0a0a0a 100%)'
            }}
          >
            {/* Frozen Overlay */}
            {currentCard.isFrozen && (
              <div className="absolute inset-0 bg-sky-950/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center border-2 border-sky-400/40 rounded-2xl">
                <Lock className="w-8 h-8 text-sky-300" />
                <span className="text-xs font-mono uppercase tracking-widest text-sky-200 mt-2 font-semibold">
                  Card Temporarily Frozen
                </span>
              </div>
            )}

            {!isFlipped ? (
              /* Front of Card */
              <div className="h-full flex flex-col justify-between text-neutral-100 select-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-widest uppercase font-sans text-neutral-200">
                      Aureus
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                      {currentCard.cardType === 'physical' ? 'Obsidian' : 'Virtual'}
                    </span>
                  </div>
                  <Wifi className="w-4 h-4 text-neutral-400" />
                </div>

                {/* EMV Microchip & Contactless Glyph */}
                <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-200/80 via-amber-300 to-amber-100 border border-amber-400/50 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-amber-600/40" />
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-amber-600/40" />
                </div>

                {/* Card Number */}
                <div>
                  <div className="text-base sm:text-lg font-mono tracking-widest text-neutral-200 tabular-nums">
                    {showFullNumber ? currentCard.fullNumberRevealed : currentCard.fullNumberMasked}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-neutral-400 uppercase">
                    <div>
                      <div className="text-[8px] text-neutral-500">Cardholder</div>
                      <div className="text-neutral-200 tracking-wider truncate max-w-[160px]">
                        {currentCard.nameOnCard}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] text-neutral-500">Expires</div>
                      <div className="text-neutral-200">{currentCard.expiry}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Back of Card */
              <div className="h-full flex flex-col justify-between text-neutral-100 select-none -mx-6 -my-6 py-6">
                {/* Magnetic Strip */}
                <div className="w-full h-10 bg-neutral-950 border-y border-neutral-800" />

                <div className="px-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] text-neutral-400 font-mono">
                      Authorized Signature · Not Transferable
                    </div>
                    <div className="bg-neutral-200 text-neutral-950 font-mono font-bold text-xs px-2 py-1 rounded">
                      CVV: {currentCard.cvv}
                    </div>
                  </div>
                  <div className="text-[9px] text-neutral-500 leading-tight">
                    Issued by Aureus Private Banking pursuant to license by Visa International. 24/7 Concierge Hotline: +1 (212) 555-0199.
                  </div>
                </div>

                <div className="px-6 flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>Billing Zip: {currentCard.billingZip}</span>
                  <span className="text-emerald-400 uppercase">Aureus Sovereign</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Flip & Reveal Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Flip Card ({isFlipped ? 'Front' : 'Back'})</span>
            </button>

            <button
              onClick={() => setShowFullNumber(!showFullNumber)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors"
            >
              {showFullNumber ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showFullNumber ? 'Hide PAN' : 'Show 16-Digit PAN'}</span>
            </button>

            <button
              onClick={() => setShowPinModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Reveal PIN</span>
            </button>
          </div>
        </div>

        {/* Right Col: Instant Controls & Spending Limits */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Live Security & Feature Controls</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Toggle immediate authorization parameters in real-time</p>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {/* Freeze Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/80 border border-neutral-800">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentCard.isFrozen ? 'bg-sky-500/10 text-sky-400' : 'bg-neutral-900 text-neutral-400'}`}>
                  {currentCard.isFrozen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-200">Freeze Card</div>
                  <div className="text-[11px] text-neutral-400">Block all new transaction authorizations</div>
                </div>
              </div>
              <button
                onClick={handleToggleFreeze}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  currentCard.isFrozen ? 'bg-sky-500' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    currentCard.isFrozen ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Online Transactions */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/80 border border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-900 text-neutral-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-200">Online & E-Commerce Payments</div>
                  <div className="text-[11px] text-neutral-400">Permit web checkouts and digital subscriptions</div>
                </div>
              </div>
              <button
                onClick={handleToggleOnline}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  currentCard.onlinePaymentsEnabled ? 'bg-emerald-500' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    currentCard.onlinePaymentsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Contactless / Apple Pay */}
            {currentCard.cardType === 'physical' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/80 border border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-900 text-neutral-400">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-200">Contactless & Apple Pay</div>
                    <div className="text-[11px] text-neutral-400">NFC point-of-sale tap authorizations</div>
                  </div>
                </div>
                <button
                  onClick={handleToggleContactless}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    currentCard.contactlessEnabled ? 'bg-emerald-500' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      currentCard.contactlessEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Spending Limit Slider */}
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-200">Monthly Spending Limit</span>
              <span className="font-mono text-emerald-400 font-bold tabular-nums">
                ${currentCard.monthlyLimit.toLocaleString()}
              </span>
            </div>

            <input
              type="range"
              min="5000"
              max="150000"
              step="5000"
              value={currentCard.monthlyLimit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>Spent this month: ${currentCard.spentThisMonth.toLocaleString()}</span>
              <span>Available limit: ${(currentCard.monthlyLimit - currentCard.spentThisMonth).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reveal PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-neutral-850 border border-neutral-800 flex items-center justify-center mx-auto text-emerald-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Hardware Biometric Verification</h3>
              <p className="text-xs text-neutral-400 mt-1">Authenticate to reveal the offline 4-digit PIN</p>
            </div>

            {!pinChallengePassed ? (
              <div className="pt-2">
                <button
                  onClick={() => setPinChallengePassed(true)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Verify with Touch ID / Passkey</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-mono">Card PIN</div>
                <div className="text-3xl font-mono font-bold tracking-widest text-emerald-400 mt-1">
                  {currentCard.pin}
                </div>
                <div className="text-[10px] text-neutral-500 mt-2">Auto-hiding in 10 seconds</div>
              </div>
            )}

            <button
              onClick={() => {
                setShowPinModal(false);
                setPinChallengePassed(false);
              }}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Issue Virtual Card Modal */}
      {showNewCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-neutral-100 mb-1">Issue Instant Virtual Card</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Single-purpose digital Mastercard with customizable spending caps
            </p>

            <form onSubmit={handleCreateVirtualCard} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1">Card Label / Purpose</label>
                <input
                  type="text"
                  required
                  value={newCardNickname}
                  onChange={(e) => setNewCardNickname(e.target.value)}
                  placeholder="e.g. AWS & Google Cloud Infrastructure"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Monthly Spending Cap (USD)</label>
                <input
                  type="number"
                  min="500"
                  max="100000"
                  step="500"
                  value={newCardLimit}
                  onChange={(e) => setNewCardLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
                />
              </div>

              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 text-neutral-400 text-[11px] leading-relaxed">
                Virtual cards generate dynamic CVVs and are protected against recurring unauthorized merchant breaches.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCardModal(false)}
                  className="px-4 py-2 rounded-lg text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 font-semibold hover:bg-emerald-400"
                >
                  Generate Card Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
