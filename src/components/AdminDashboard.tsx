import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, MessageCircle, Users, Eye, EyeOff, Sparkles, Gift, AlertCircle, Calendar, MapPin, DollarSign, UserPlus, Trash2, ArrowLeft, ShieldAlert, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react';
import { SecretGroup, Participant, PendingRequest } from '../types';
import { formatBRL, formatBRDate, performSecretSantaDraw } from '../utils/secretSanta';
import { playClickSound } from '../utils/soundEffects';
import { saveGroup, subscribeToGroup } from '../services/groupStorage';

interface AdminDashboardProps {
  group: SecretGroup;
  onUpdateGroup: (group: SecretGroup) => void;
  onViewAsParticipant: () => void;
  onBackToHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  group,
  onUpdateGroup,
  onViewAsParticipant,
  onBackToHome,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFullAnswers, setShowFullAnswers] = useState(false);
  const [confirmUnlockAnswers, setConfirmUnlockAnswers] = useState(false);
  const [isRedrawing, setIsRedrawing] = useState(false);
  const [redrawMessage, setRedrawMessage] = useState<string | null>(null);

  // Real-time synchronization with Firestore
  useEffect(() => {
    const unsubscribe = subscribeToGroup(group.id, (updated) => {
      onUpdateGroup(updated);
    });
    return () => unsubscribe();
  }, [group.id]);

  // Clean, short link for participants powered by Firebase Firestore
  const participantUrl = `${window.location.origin}${window.location.pathname}?grupo=${group.id}`;

  const handleCopyLink = () => {
    playClickSound();
    navigator.clipboard.writeText(participantUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const whatsappMessage = encodeURIComponent(
    `🎄 Olá pessoal! Está no ar o sorteio do nosso Amigo Secreto: *${group.title}*!\n\n` +
      `${group.minPrice || group.maxPrice ? `💰 Valor sugerido: ${group.minPrice ? formatBRL(group.minPrice) : ''} ${group.maxPrice ? `a ${formatBRL(group.maxPrice)}` : ''}\n` : ''}` +
      `${group.eventDate ? `📅 Data: ${formatBRDate(group.eventDate)} ${group.eventTime ? `às ${group.eventTime}` : ''}\n` : ''}` +
      `${group.eventLocation ? `📍 Local: ${group.eventLocation}\n` : ''}\n` +
      `👉 Para descobrir quem você tirou (sem cadastro), acesse o link exclusivo do grupo e selecione o seu nome:\n${participantUrl}`
  );

  const revealedCount = group.participants.filter((p) => p.isRevealed).length;
  const pendingRequests = group.pendingRequests?.filter((r) => r.status === 'pending') || [];

  // Add participant from pending request
  const handleApproveRequest = async (request: PendingRequest) => {
    playClickSound();
    const newParticipant: Participant = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: request.name,
      isRevealed: false,
    };

    const updatedParticipants = [...group.participants, newParticipant];
    
    // Perform fresh draw with new participant
    const draw = performSecretSantaDraw(updatedParticipants, group.exclusions || []);
    if (!draw.success || !draw.pairs) {
      alert(`Não foi possível re-sortear automaticamente: ${draw.error}`);
      return;
    }

    const participantsWithDraw = updatedParticipants.map((p) => ({
      ...p,
      secretTargetId: draw.pairs![p.id],
      isRevealed: false, // Reset revealed status on redraw
    }));

    const updatedPending = (group.pendingRequests || []).map((r) =>
      r.id === request.id ? { ...r, status: 'resolved' as const } : r
    );

    const updatedGroup: SecretGroup = {
      ...group,
      participants: participantsWithDraw,
      pendingRequests: updatedPending,
      status: 'drawn',
    };

    await saveGroup(updatedGroup);
    onUpdateGroup(updatedGroup);
    setRedrawMessage(`"${request.name}" foi adicionado(a) com sucesso e o sorteio foi recalculado!`);
    setTimeout(() => setRedrawMessage(null), 4000);
  };

  const handleDismissRequest = async (requestId: string) => {
    playClickSound();
    const updatedPending = (group.pendingRequests || []).map((r) =>
      r.id === requestId ? { ...r, status: 'dismissed' as const } : r
    );
    const updatedGroup: SecretGroup = {
      ...group,
      pendingRequests: updatedPending,
    };
    await saveGroup(updatedGroup);
    onUpdateGroup(updatedGroup);
  };

  // Re-draw all pairs
  const handleRedrawAll = async () => {
    if (!window.confirm('Atenção: Um novo sorteio irá redistribuir os pares e resetar o status de visualização de todos os participantes. Deseja continuar?')) {
      return;
    }
    setIsRedrawing(true);
    const draw = performSecretSantaDraw(group.participants, group.exclusions || []);
    if (!draw.success || !draw.pairs) {
      alert(`Erro no sorteio: ${draw.error}`);
      setIsRedrawing(false);
      return;
    }

    const updatedParticipants = group.participants.map((p) => ({
      ...p,
      secretTargetId: draw.pairs![p.id],
      isRevealed: false,
    }));

    const updatedGroup: SecretGroup = {
      ...group,
      participants: updatedParticipants,
    };

    await saveGroup(updatedGroup);
    onUpdateGroup(updatedGroup);
    setIsRedrawing(false);
    setRedrawMessage('Novo sorteio realizado com sucesso!');
    setTimeout(() => setRedrawMessage(null), 3000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => {
            playClickSound();
            onBackToHome();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Início</span>
        </button>

        <button
          onClick={() => {
            playClickSound();
            onViewAsParticipant();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Ver tela do participante</span>
        </button>
      </div>

      {/* Redraw alert notification */}
      {redrawMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{redrawMessage}</span>
        </div>
      )}

      {/* Main Group Header Card */}
      <div className="bg-[#111A2E] border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Painel do Administrador</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {group.title}
            </h1>
            {group.description && (
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl">
                {group.description}
              </p>
            )}

            {/* Metadata list */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-slate-400">
              {(group.minPrice || group.maxPrice) && (
                <span className="flex items-center gap-1 text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Presentes:{' '}
                    <strong className="text-white">
                      {group.minPrice && group.maxPrice
                        ? `${formatBRL(group.minPrice)} a ${formatBRL(group.maxPrice)}`
                        : group.minPrice
                        ? `A partir de ${formatBRL(group.minPrice)}`
                        : `Até ${formatBRL(group.maxPrice)}`}
                    </strong>
                  </span>
                </span>
              )}
              {group.eventDate && (
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    Data:{' '}
                    <strong className="text-white">
                      {formatBRDate(group.eventDate)} {group.eventTime ? `às ${group.eventTime}` : ''}
                    </strong>
                  </span>
                </span>
              )}
              {group.eventLocation && (
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Local: <strong className="text-white">{group.eventLocation}</strong></span>
                </span>
              )}
            </div>
          </div>

          {/* Status Metric summary */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shrink-0">
            <div className="text-center px-2">
              <span className="text-2xl font-extrabold text-white font-display block">
                {group.participants.length}
              </span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                Participantes
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-2xl font-extrabold text-emerald-400 font-display block">
                {revealedCount}
              </span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                Visualizaram
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-2xl font-extrabold text-amber-400 font-display block">
                {group.participants.length - revealedCount}
              </span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                Pendentes
              </span>
            </div>
          </div>
        </div>

        {/* Share Section: Exclusive Link for participants */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Link exclusivo para enviar aos participantes (sem cadastro)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Os participantes acessam este link e selecionam seus nomes na lista.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono select-all truncate flex items-center">
              {participantUrl}
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-950" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <a
              href={`https://api.whatsapp.com/send?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Pending Requests Alert ("Meu nome não está aqui") */}
      {pendingRequests.length > 0 && (
        <div className="mb-8 bg-rose-950/30 border border-rose-500/40 rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                Solicitações de Inclusão pendentes ({pendingRequests.length})
              </h2>
              <p className="text-xs text-slate-400">
                Pessoas que acessaram o link e marcaram "Meu nome não está aqui".
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{req.name}</span>
                    {req.contact && (
                      <span className="text-xs text-amber-400 font-mono">
                        · {req.contact}
                      </span>
                    )}
                  </div>
                  {req.message && (
                    <p className="text-xs text-slate-300 mt-1 italic">
                      "{req.message}"
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Solicitado em: {new Date(req.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDismissRequest(req.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
                  >
                    Ignorar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApproveRequest(req)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Adicionar e Re-sortear</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants Status Table */}
      <div className="bg-[#111A2E] border border-slate-800 rounded-3xl p-6 shadow-xl mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white font-display">
              Participantes ({group.participants.length})
            </h2>
            <p className="text-xs text-slate-400">
              Acompanhe quem já acessou e visualizou o seu amigo secreto.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isRedrawing}
              onClick={handleRedrawAll}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRedrawing ? 'animate-spin' : ''}`} />
              <span>Novo Sorteio</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {group.participants.map((p) => {
            const target = group.participants.find((item) => item.id === p.secretTargetId);
            return (
              <div
                key={p.id}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-100 truncate">
                    {p.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {p.isRevealed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Visualizou</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <span>⏳ Pendente</span>
                      </span>
                    )}

                    {p.wishlist && (
                      <span className="text-[11px] text-amber-400">
                        · Deixou dicas
                      </span>
                    )}
                  </div>

                  {showFullAnswers && target && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-amber-300">
                      Tirou: <strong className="text-white">{target.name}</strong>
                    </div>
                  )}
                </div>

                <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-400 shrink-0">
                  {p.isRevealed ? (
                    <Eye className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Master answers / spoiler safety */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {showFullAnswers
              ? 'Gabarito completo visível. Não mostre esta tela aos participantes!'
              : 'Por padrão, os pares sorteados ficam ocultos para preservar a surpresa.'}
          </div>

          {!showFullAnswers ? (
            <button
              type="button"
              onClick={() => setConfirmUnlockAnswers(true)}
              className="text-xs text-slate-400 hover:text-amber-400 underline underline-offset-4 transition-colors"
            >
              Revelar gabarito completo (Apenas para o organizador)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowFullAnswers(false)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Ocultar gabarito novamente
            </button>
          )}
        </div>
      </div>

      {/* Confirm Unlock Modal */}
      {confirmUnlockAnswers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111A2E] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-white mb-2 font-display">
              Alerta de Spoiler!
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 text-center mb-6 leading-relaxed">
              Você está prestes a ver a lista de quem tirou quem no amigo secreto. Se você for um dos participantes, isso estragará a sua própria surpresa!
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmUnlockAnswers(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-medium transition-colors"
              >
                Voltar e manter surpresa
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFullAnswers(true);
                  setConfirmUnlockAnswers(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors"
              >
                Sim, quero ver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
