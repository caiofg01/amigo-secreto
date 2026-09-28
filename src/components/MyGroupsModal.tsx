import React from 'react';
import { Folder, X, ExternalLink, Calendar, ArrowRight } from 'lucide-react';
import { getAdminGroups } from '../services/groupStorage';
import { playClickSound } from '../utils/soundEffects';

interface MyGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGroup: (groupId: string) => void;
}

export const MyGroupsModal: React.FC<MyGroupsModalProps> = ({
  isOpen,
  onClose,
  onSelectGroup,
}) => {
  if (!isOpen) return null;

  const groups = getAdminGroups();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111A2E] border border-amber-500/30 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1 font-display flex items-center gap-2">
          <Folder className="w-5 h-5 text-amber-400" />
          <span>Meus Sorteios Salvos</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Sorteios criados ou administrados neste dispositivo.
        </p>

        {groups.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  playClickSound();
                  onSelectGroup(g.id);
                  onClose();
                }}
                className="w-full text-left p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/40 transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="font-semibold text-sm text-white group-hover:text-amber-300 transition-colors">
                    {g.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Criado em: {new Date(g.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-900/40 rounded-2xl border border-slate-800 p-4">
            <p className="text-xs text-slate-400">
              Você ainda não criou nenhum grupo neste navegador.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full mt-6 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-medium transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
