import React from 'react';
import { AlertTriangle, UserCheck, XCircle } from 'lucide-react';
import { playClickSound } from '../utils/soundEffects';

interface ConfirmationModalProps {
  participantName: string;
  onConfirm: () => void;
  onWrongName: () => void;
  isOpen: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  participantName,
  onConfirm,
  onWrongName,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111A2E] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-center text-white mb-2 font-display">
          Confirmação de Identidade
        </h3>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 my-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Você selecionou:
          </p>
          <p className="text-2xl font-extrabold text-amber-400 tracking-tight font-display">
            {participantName}
          </p>
        </div>

        <p className="text-sm text-slate-300 text-center mb-6 leading-relaxed">
          Para que o amigo secreto continue uma surpresa para todos, confirme que você é realmente{' '}
          <strong className="text-white font-semibold">{participantName}</strong>. Após a revelação, você descobrirá quem deve presentear!
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onWrongName();
            }}
            className="order-2 sm:order-1 flex-1 py-3 px-4 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            <span>Escolhi o nome errado</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onConfirm();
            }}
            className="order-1 sm:order-2 flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sim, sou eu!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
