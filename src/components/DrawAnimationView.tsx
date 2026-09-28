import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Eye, EyeOff, Gift, Calendar, MapPin, DollarSign, Send, CheckCircle2, RotateCcw, Heart, Lock, Copy, Check } from 'lucide-react';
import { SecretGroup, Participant } from '../types';
import { formatBRL, formatBRDate } from '../utils/secretSanta';
import { playTick, playGiftShakeSound, playCelebrationFanfare, playClickSound } from '../utils/soundEffects';
import { markParticipantRevealed, updateParticipantWishlist } from '../services/groupStorage';

interface DrawAnimationViewProps {
  group: SecretGroup;
  currentParticipant: Participant;
  targetParticipant: Participant;
  onBackToParticipants?: () => void;
}

type AnimationStage = 'shuffling' | 'ready_to_open' | 'revealed';

export const DrawAnimationView: React.FC<DrawAnimationViewProps> = ({
  group,
  currentParticipant,
  targetParticipant,
}) => {
  const [stage, setStage] = useState<AnimationStage>('shuffling');
  const [displayedName, setDisplayedName] = useState<string>('Sorteando...');
  const [isNameHidden, setIsNameHidden] = useState<boolean>(false);
  const [wishlistText, setWishlistText] = useState<string>(currentParticipant.wishlist || '');
  const [wishlistSaved, setWishlistSaved] = useState<boolean>(false);
  const [copiedTargetName, setCopiedTargetName] = useState<boolean>(false);
  const hasTriggeredConfetti = useRef<boolean>(false);

  // Stage 1: Fast shuffling names animation with tick audio
  useEffect(() => {
    const candidateNames = group.participants
      .filter((p) => p.id !== currentParticipant.id)
      .map((p) => p.name);

    if (candidateNames.length === 0) {
      setStage('ready_to_open');
      return;
    }

    let count = 0;
    const maxSteps = 18;
    const interval = setInterval(() => {
      count++;
      const randomName = candidateNames[Math.floor(Math.random() * candidateNames.length)];
      setDisplayedName(randomName);
      playTick(350 + count * 20);

      if (count >= maxSteps) {
        clearInterval(interval);
        setStage('ready_to_open');
      }
    }, 110);

    return () => clearInterval(interval);
  }, [group.participants, currentParticipant.id]);

  // Stage 2 to 3: Open the gift box
  const handleOpenGift = async () => {
    playGiftShakeSound();
    setStage('revealed');

    // Trigger celebratory fanfare
    playCelebrationFanfare();

    // Mark as revealed in storage/server
    markParticipantRevealed(group.id, currentParticipant.id);

    // Launch celebratory confetti burst
    if (!hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      triggerConfettiExplosion();
    }
  };

  const triggerConfettiExplosion = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#EF4444', '#10B981', '#FBBF24', '#FFFFFF'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleSaveWishlist = async () => {
    playClickSound();
    await updateParticipantWishlist(group.id, currentParticipant.id, wishlistText);
    setWishlistSaved(true);
    setTimeout(() => setWishlistSaved(false), 3000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Privacy badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Sorteio Individual Confidencial</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Guarde este resultado em segredo 🤫
        </span>
      </div>

      {/* Main Animation Box */}
      <div className="bg-[#111A2E] border border-amber-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">
            Amigo Secreto · {group.title}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display mb-1">
            Olá, <span className="text-amber-300">{currentParticipant.name}</span>!
          </h2>

          {/* STAGE 1: Shuffling names */}
          {stage === 'shuffling' && (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 rounded-2xl bg-amber-400/20 animate-ping" />
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center text-slate-950 shadow-xl animate-bounce">
                  <Gift className="w-12 h-12" />
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-3 font-medium">
                Embaralhando os participantes...
              </p>

              <div className="h-14 px-6 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center min-w-[240px]">
                <span className="text-xl font-bold text-amber-300 font-display tracking-wide animate-pulse">
                  {displayedName}
                </span>
              </div>
            </div>
          )}

          {/* STAGE 2: Ready to open gift */}
          {stage === 'ready_to_open' && (
            <div className="py-10 flex flex-col items-center justify-center">
              <p className="text-slate-300 text-sm mb-6 max-w-md">
                O sorteio foi realizado com sucesso! Sua caixa misteriosa está pronta para ser aberta.
              </p>

              <button
                type="button"
                onClick={handleOpenGift}
                className="group relative cursor-pointer outline-none focus:outline-none"
              >
                {/* Glowing backdrop */}
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-amber-500/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />

                {/* Animated Gift Box */}
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 border-2 border-amber-400/50 shadow-2xl flex flex-col items-center justify-center text-amber-300 animate-gift-shake group-hover:scale-105 transition-transform">
                  {/* Golden ribbon */}
                  <div className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-amber-300 to-amber-500 opacity-90 shadow-md" />
                  <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-amber-300 to-amber-500 opacity-90 shadow-md" />

                  {/* Ribbon Bow */}
                  <div className="relative z-10 w-16 h-16 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-bold">
                    <Sparkles className="w-8 h-8 text-rose-950" />
                  </div>
                </div>
              </button>

              <p className="mt-6 text-base font-bold text-amber-400 tracking-wide font-display animate-pulse">
                Toque na caixa de presente para revelar!
              </p>
            </div>
          )}

          {/* STAGE 3: Result Revealed! */}
          {stage === 'revealed' && (
            <div className="py-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sorteio revelado</span>
              </div>

              <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-2">
                Seu amigo secreto é:
              </p>

              {/* Secret Name Container */}
              <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/40 rounded-2xl p-6 sm:p-8 shadow-2xl my-3 relative">
                {isNameHidden ? (
                  <div className="py-6 text-slate-500 flex flex-col items-center justify-center">
                    <EyeOff className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm font-medium">Nome ocultado por segurança</p>
                    <p className="text-xs text-slate-600 mt-1">Clique abaixo para ver novamente</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 font-display tracking-tight mb-2">
                      {targetParticipant.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Guarde esse segredo até o dia da revelação! 🤫
                    </p>
                  </>
                )}

                {/* Hide / Show toggle */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsNameHidden(!isNameHidden);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60"
                >
                  {isNameHidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Exibir nome</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ocultar nome por segurança</span>
                    </>
                  )}
                </button>
              </div>

              {/* Gift Rules Card */}
              <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 my-4 text-left text-xs sm:text-sm text-slate-300 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span>Orientações do Presente</span>
                </div>

                {(group.minPrice || group.maxPrice) && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Faixa de valor sugerida:{' '}
                      <strong className="text-white">
                        {group.minPrice && group.maxPrice
                          ? `${formatBRL(group.minPrice)} a ${formatBRL(group.maxPrice)}`
                          : group.minPrice
                          ? `A partir de ${formatBRL(group.minPrice)}`
                          : `Até ${formatBRL(group.maxPrice)}`}
                      </strong>
                    </span>
                  </div>
                )}

                {group.eventDate && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Data da troca:{' '}
                      <strong className="text-white">
                        {formatBRDate(group.eventDate)} {group.eventTime ? `às ${group.eventTime}` : ''}
                      </strong>
                    </span>
                  </div>
                )}

                {group.eventLocation && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Local:{' '}
                      <strong className="text-white">{group.eventLocation}</strong>
                    </span>
                  </div>
                )}

                {targetParticipant.wishlist && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    <p className="font-semibold flex items-center gap-1 text-xs text-amber-400 mb-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>Desejos de {targetParticipant.name}:</span>
                    </p>
                    <p className="italic text-xs">{targetParticipant.wishlist}</p>
                  </div>
                )}
              </div>

              {/* Wishlist submission by current participant */}
              <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-xl p-4 my-2 text-left">
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Dicas para quem te tirou (O que você gostaria de ganhar?):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wishlistText}
                    onChange={(e) => setWishlistText(e.target.value)}
                    placeholder="Ex: Livros de ficção, chocolates, meia térmica..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveWishlist}
                    className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                </div>
                {wishlistSaved && (
                  <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Dicas salvas com sucesso!</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    triggerConfettiExplosion();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Soltar confetes 🎉</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    navigator.clipboard.writeText(targetParticipant.name);
                    setCopiedTargetName(true);
                    setTimeout(() => setCopiedTargetName(false), 2500);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {copiedTargetName ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-950" />
                      <span>Nome Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-950" />
                      <span>Copiar Nome do Amigo</span>
                    </>
                  )}
                </button>

                <p className="w-full text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Para manter o sigilo, você só tem acesso ao seu amigo sorteado. Guarde este segredo!</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
