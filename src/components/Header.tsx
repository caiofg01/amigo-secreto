import React from 'react';
import { Gift, PlusCircle, Sparkles } from 'lucide-react';
import { playClickSound } from '../utils/soundEffects';

interface HeaderProps {
  onNewGroup: () => void;
  onOpenHowItWorks: () => void;
  onOpenMyGroups: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewGroup,
  onOpenHowItWorks,
  onOpenMyGroups,
}) => {
  return (
    <header className="w-full border-b border-slate-800 bg-[#0B1320]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            playClickSound();
            window.location.href = window.location.pathname;
          }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white hover:text-amber-300 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center text-slate-950 shadow-sm">
            <Gift className="w-5 h-5" />
          </div>
          <span className="font-display font-bold">Amigo Secreto Online</span>
        </a>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => {
              playClickSound();
              onOpenHowItWorks();
            }}
            className="hover:text-amber-300 transition-colors"
          >
            Como Funciona
          </button>
          <button
            onClick={() => {
              playClickSound();
              onNewGroup();
            }}
            className="hover:text-amber-300 transition-colors"
          >
            Criar Sorteio
          </button>
          <button
            onClick={() => {
              playClickSound();
              onOpenMyGroups();
            }}
            className="hover:text-amber-300 transition-colors"
          >
            Meus Grupos
          </button>
        </nav>

        {/* Zone 3: Primary action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClickSound();
              onNewGroup();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors whitespace-nowrap active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Sorteio</span>
          </button>
        </div>
      </div>
    </header>
  );
};
