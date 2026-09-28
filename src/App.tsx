/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SecretGroup, Participant } from './types';
import { fetchGroup, loadGroupLocally } from './services/groupStorage';
import { Header } from './components/Header';
import { CreateGroupView } from './components/CreateGroupView';
import { ParticipantSelectView } from './components/ParticipantSelectView';
import { AdminDashboard } from './components/AdminDashboard';
import { DrawAnimationView } from './components/DrawAnimationView';
import { HowItWorksModal } from './components/HowItWorksModal';
import { MyGroupsModal } from './components/MyGroupsModal';
import { Loader2, Gift, Sparkles, AlertCircle } from 'lucide-react';
import { playClickSound } from './utils/soundEffects';

type ViewMode = 'create' | 'admin' | 'participant_select' | 'participant_draw';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('create');
  const [currentGroup, setCurrentGroup] = useState<SecretGroup | null>(null);
  const [activeParticipant, setActiveParticipant] = useState<Participant | null>(null);
  const [targetParticipant, setTargetParticipant] = useState<Participant | null>(null);

  // Modals
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isMyGroupsOpen, setIsMyGroupsOpen] = useState(false);

  // Loading & error
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Check URL on startup
  useEffect(() => {
    async function initFromUrl() {
      setIsLoading(true);
      setLoadError(null);

      const params = new URLSearchParams(window.location.search);
      const groupId = params.get('grupo');
      const participantId = params.get('p');
      const isAdminMode = params.get('admin') === '1';

      if (groupId) {
        const found = await fetchGroup(groupId);
        if (found) {
          setCurrentGroup(found);

          // Check for direct individual participant link
          if (participantId) {
            const p = found.participants.find((item) => item.id === participantId);
            if (p && p.secretTargetId) {
              const target = found.participants.find((item) => item.id === p.secretTargetId);
              if (target) {
                setActiveParticipant(p);
                setTargetParticipant(target);
                setViewMode('participant_draw');
                setIsLoading(false);
                return;
              }
            }
          }

          if (isAdminMode) {
            setViewMode('admin');
          } else {
            setViewMode('participant_select');
          }
        } else {
          setLoadError(
            'Não foi possível encontrar este grupo. Verifique o link ou crie um novo sorteio.'
          );
          setViewMode('create');
        }
      } else {
        setViewMode('create');
      }

      setIsLoading(false);
    }

    initFromUrl();
  }, []);

  // When group is created by admin
  const handleGroupCreated = (group: SecretGroup) => {
    setCurrentGroup(group);
    setViewMode('admin');
    // Update URL quietly to include group ID and admin mode
    const url = new URL(window.location.href);
    url.searchParams.set('grupo', group.id);
    url.searchParams.set('admin', '1');
    window.history.pushState({}, '', url.toString());
  };

  // When participant selects a name in the group
  const handleSelectParticipant = (participant: Participant) => {
    if (!currentGroup) return;

    const target = currentGroup.participants.find(
      (p) => p.id === participant.secretTargetId
    );

    if (!target) {
      alert('Erro: Não foi possível localizar o amigo sorteado para este participante.');
      return;
    }

    setActiveParticipant(participant);
    setTargetParticipant(target);
    setViewMode('participant_draw');
  };

  // Navigate to group from saved groups modal
  const handleSelectSavedGroup = async (groupId: string) => {
    setIsLoading(true);
    const found = await fetchGroup(groupId);
    if (found) {
      setCurrentGroup(found);
      setViewMode('admin');
      const url = new URL(window.location.href);
      url.searchParams.set('grupo', groupId);
      url.searchParams.set('admin', '1');
      window.history.pushState({}, '', url.toString());
    }
    setIsLoading(false);
  };

  const handleStartNewGroup = () => {
    setCurrentGroup(null);
    setActiveParticipant(null);
    setTargetParticipant(null);
    setViewMode('create');
    const url = new URL(window.location.href);
    url.searchParams.delete('grupo');
    url.searchParams.delete('admin');
    window.history.pushState({}, '', url.pathname);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1320] text-slate-100">
      {/* Top Bar Header */}
      <Header
        onNewGroup={handleStartNewGroup}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        onOpenMyGroups={() => setIsMyGroupsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
            <p className="text-xs uppercase tracking-wider font-semibold">
              Carregando sorteio...
            </p>
          </div>
        ) : (
          <>
            {loadError && (
              <div className="max-w-xl mx-auto px-4 mt-6 w-full">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="flex-1">{loadError}</span>
                  <button
                    onClick={() => setLoadError(null)}
                    className="text-xs underline hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* Mode 1: Group Creation */}
            {viewMode === 'create' && (
              <CreateGroupView onGroupCreated={handleGroupCreated} />
            )}

            {/* Mode 2: Admin Dashboard */}
            {viewMode === 'admin' && currentGroup && (
              <AdminDashboard
                group={currentGroup}
                onUpdateGroup={(updated) => setCurrentGroup(updated)}
                onViewAsParticipant={() => setViewMode('participant_select')}
                onBackToHome={handleStartNewGroup}
              />
            )}

            {/* Mode 3: Participant Select Screen */}
            {viewMode === 'participant_select' && currentGroup && (
              <ParticipantSelectView
                group={currentGroup}
                onSelectParticipant={handleSelectParticipant}
                onGoToAdmin={() => setViewMode('admin')}
              />
            )}

            {/* Mode 4: Draw Animation and Secret Reveal */}
            {viewMode === 'participant_draw' && currentGroup && activeParticipant && targetParticipant && (
              <DrawAnimationView
                group={currentGroup}
                currentParticipant={activeParticipant}
                targetParticipant={targetParticipant}
                onBackToParticipants={() => setViewMode('participant_select')}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      <MyGroupsModal
        isOpen={isMyGroupsOpen}
        onClose={() => setIsMyGroupsOpen(false)}
        onSelectGroup={handleSelectSavedGroup}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-[#080D17] py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-300">Amigo Secreto Online</span>
            <span>·</span>
            <span>Sorteio seguro, anônimo e sem cadastro</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => {
                playClickSound();
                setIsHowItWorksOpen(true);
              }}
              className="hover:text-amber-300 transition-colors"
            >
              Regras & Como Funciona
            </button>
            <button
              onClick={() => {
                playClickSound();
                handleStartNewGroup();
              }}
              className="hover:text-amber-300 transition-colors"
            >
              Criar Novo Sorteio
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
