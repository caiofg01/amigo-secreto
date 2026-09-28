import React from 'react';
import { Gift, ShieldCheck, Share2, Sparkles, X, UserX } from 'lucide-react';
import { playClickSound } from '../utils/soundEffects';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111A2E] border border-amber-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-slate-100 shadow-2xl relative">
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2 font-display flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Como Funciona o Amigo Secreto Online</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Sorteio seguro, rápido e sem complicações.
        </p>

        <div className="space-y-4 text-xs sm:text-sm">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 font-bold font-display text-sm">
              1
            </div>
            <div>
              <p className="font-semibold text-white">Criação do Grupo e Restrições</p>
              <p className="text-slate-400 text-xs mt-0.5">
                O organizador define o nome do grupo, faixa de preço recomendada para presentes e quem não pode tirar quem (ex: casais ou irmãos).
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 font-bold font-display text-sm">
              2
            </div>
            <div>
              <p className="font-semibold text-white">Sorteio Matemático Garantido</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Nosso algoritmo inteligente encontra uma combinação perfeita que respeita todas as exclusões e garante que ninguém tire a si mesmo.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold font-display text-sm">
              3
            </div>
            <div>
              <p className="font-semibold text-white">Link Único Sem Cadastro</p>
              <p className="text-slate-400 text-xs mt-0.5">
                O administrador envia um link único no WhatsApp ou e-mail. Os convidados não precisam baixar aplicativo nem criar conta!
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 font-bold font-display text-sm">
              4
            </div>
            <div>
              <p className="font-semibold text-white">Confirmação e Animação Mágica</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Cada participante clica em seu nome, passa pelo aviso de confirmação ("Escolhi o nome errado") e abre uma caixa de presente animada com confetes e trilha sonora!
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0 font-bold font-display text-sm">
              5
            </div>
            <div>
              <p className="font-semibold text-white">"Meu nome não está aqui"</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Se alguém esqueceu de ser colocado na lista, basta tocar em "Meu nome não está aqui" para enviar uma solicitação direta ao organizador.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full mt-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors"
        >
          Entendi, vamos começar!
        </button>
      </div>
    </div>
  );
};
