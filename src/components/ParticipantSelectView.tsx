import React, { useState } from 'react';
import { User, Search, UserX, Gift, Calendar, MapPin, DollarSign, CheckCircle2, MessageCircle, AlertCircle, Share2, Sparkles, ExternalLink, Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { SecretGroup, Participant } from '../types';
import { formatBRL, formatBRDate } from '../utils/secretSanta';
import { playClickSound } from '../utils/soundEffects';
import { ConfirmationModal } from './ConfirmationModal';
import { requestNameInclusion } from '../services/groupStorage';

interface ParticipantSelectViewProps {
  group: SecretGroup;
  onSelectParticipant: (participant: Participant) => void;
  onGoToAdmin: () => void;
}

export const ParticipantSelectView: React.FC<ParticipantSelectViewProps> = ({
  group,
  onSelectParticipant,
  onGoToAdmin,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Participant | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // Admin password verification modal state
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);

  // "Meu nome não está aqui" modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestContact, setRequestContact] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const filteredParticipants = group.participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleNameClick = (p: Participant) => {
    playClickSound();
    setSelectedCandidate(p);
    setIsConfirmationOpen(true);
  };

  const handleConfirmName = () => {
    setIsConfirmationOpen(false);
    if (selectedCandidate) {
      onSelectParticipant(selectedCandidate);
    }
  };

  const handleWrongName = () => {
    setIsConfirmationOpen(false);
    setSelectedCandidate(null);
  };

  const handleOpenAdminPasswordModal = () => {
    playClickSound();
    setAdminPasswordInput('');
    setAdminPasswordError(null);
    setIsAdminPasswordModalOpen(true);
  };

  const handleVerifyAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const input = adminPasswordInput.trim();
    const correctPassword = group.adminPassword || group.adminKey;

    if (!input) {
      setAdminPasswordError('Por favor, informe a senha do administrador.');
      return;
    }

    if (input === correctPassword || input === group.adminKey) {
      playClickSound();
      setIsAdminPasswordModalOpen(false);
      onGoToAdmin();
    } else {
      setAdminPasswordError('Senha incorreta! Apenas o criador do sorteio pode acessar este painel.');
    }
  };

  const handleSubmitInclusionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName.trim()) return;

    setIsSubmittingRequest(true);
    await requestNameInclusion(group.id, requestName, requestContact, requestMessage);
    setIsSubmittingRequest(false);
    setRequestSubmitted(true);
  };

  const resetRequestModal = () => {
    setIsRequestModalOpen(false);
    setRequestSubmitted(false);
    setRequestName('');
    setRequestContact('');
    setRequestMessage('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Group Header Card */}
      <div className="bg-[#111A2E] border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Sorteio de Amigo Secreto</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display mb-2">
              {group.title}
            </h1>
            {group.description && (
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                {group.description}
              </p>
            )}
          </div>

          {/* Organizer shortcut button */}
          <div className="shrink-0">
            <button
              onClick={handleOpenAdminPasswordModal}
              className="text-xs font-medium text-slate-400 hover:text-amber-300 underline underline-offset-4 transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400/80" />
              <span>É o administrador deste grupo?</span>
            </button>
          </div>
        </div>

        {/* Info pills / details */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
          {(group.minPrice || group.maxPrice) && (
            <div className="flex items-center gap-2.5 text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Valor sugerido:</span>
                <span className="font-semibold text-white">
                  {group.minPrice && group.maxPrice
                    ? `${formatBRL(group.minPrice)} a ${formatBRL(group.maxPrice)}`
                    : group.minPrice
                    ? `A partir de ${formatBRL(group.minPrice)}`
                    : `Até ${formatBRL(group.maxPrice)}`}
                </span>
              </div>
            </div>
          )}

          {group.eventDate && (
            <div className="flex items-center gap-2.5 text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Data da troca:</span>
                <span className="font-semibold text-white">
                  {formatBRDate(group.eventDate)} {group.eventTime ? `às ${group.eventTime}` : ''}
                </span>
              </div>
            </div>
          )}

          {group.eventLocation && (
            <div className="flex items-center gap-2.5 text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Local do encontro:</span>
                <span className="font-semibold text-white truncate max-w-[200px] block">
                  {group.eventLocation}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Selection Area */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white font-display">
              Quem é você no grupo?
            </h2>
            <p className="text-xs text-slate-400">
              Clique sobre o seu nome para descobrir quem você tirou.
            </p>
          </div>

          {/* Quick search input */}
          {group.participants.length > 6 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar meu nome..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}
        </div>

        {/* Participants Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredParticipants.map((p) => {
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleNameClick(p)}
                className="group p-4 rounded-2xl bg-[#111A2E] hover:bg-[#16213B] border border-slate-800 hover:border-amber-500/40 text-left transition-all duration-200 flex items-center justify-between gap-3 shadow-md hover:shadow-amber-500/5 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-amber-400/20 text-slate-300 group-hover:text-amber-400 flex items-center justify-center shrink-0 font-bold text-sm transition-colors">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-100 group-hover:text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Toque para revelar
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-800/60 group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-400 flex items-center justify-center shrink-0 transition-colors">
                  <Gift className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        {filteredParticipants.length === 0 && search && (
          <div className="text-center py-8 bg-slate-900/40 rounded-2xl border border-slate-800 p-6">
            <p className="text-sm text-slate-400 mb-2">
              Nenhum participante encontrado com "{search}".
            </p>
            <p className="text-xs text-slate-500">
              Verifique a grafia ou solicite a inclusão do seu nome abaixo.
            </p>
          </div>
        )}
      </div>

      {/* Prominent "Meu nome não está aqui" Button / Banner */}
      <div className="mt-8 bg-gradient-to-r from-rose-950/40 to-amber-950/40 border border-rose-500/20 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              Não encontrou o seu nome na lista?
            </h3>
            <p className="text-xs text-slate-400">
              Peça ao administrador para incluir você no grupo agora mesmo.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setIsRequestModalOpen(true);
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shadow-lg shadow-rose-600/20 active:scale-95 flex items-center justify-center gap-2"
        >
          <UserX className="w-4 h-4" />
          <span>Meu nome não está aqui</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {selectedCandidate && (
        <ConfirmationModal
          isOpen={isConfirmationOpen}
          participantName={selectedCandidate.name}
          onConfirm={handleConfirmName}
          onWrongName={handleWrongName}
        />
      )}

      {/* "Meu nome não está aqui" Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A2E] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            {!requestSubmitted ? (
              <form onSubmit={handleSubmitInclusionRequest}>
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                  <UserX className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-center text-white mb-1 font-display">
                  Solicitar Inclusão no Grupo
                </h3>
                <p className="text-xs text-slate-400 text-center mb-6">
                  Informe seus dados para que o administrador do grupo "{group.title}" adicione você ao sorteio.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={requestName}
                      onChange={(e) => setRequestName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo Silva"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Seu WhatsApp ou Telefone (opcional)
                    </label>
                    <input
                      type="text"
                      value={requestContact}
                      onChange={(e) => setRequestContact(e.target.value)}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Recado para o organizador (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      placeholder="Ex: Oi, pode me colocar no amigo secreto da família?"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={resetRequestModal}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest || !requestName.trim()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    {isSubmittingRequest ? 'Enviando...' : 'Enviar Solicitação'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-display">
                  Solicitação Enviada!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  Seu nome (<strong className="text-white">{requestName}</strong>) foi registrado na lista de pendências do administrador deste grupo.
                </p>

                <div className="space-y-3">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Olá! Tentei acessar o Amigo Secreto "${group.title}", mas meu nome (${requestName}) não estava na lista. Pode me incluir, por favor? Link do grupo: ${window.location.href}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Avisar o organizador pelo WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={resetRequestModal}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Password Verification Modal */}
      {isAdminPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111A2E] border border-amber-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 text-slate-100 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Acesso de Administrador
                </h3>
                <p className="text-xs text-slate-400">
                  {group.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              O painel de controle e o gabarito do sorteio são protegidos. Digite a senha definida pelo organizador ao criar o grupo:
            </p>

            <form onSubmit={handleVerifyAdminPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha do Administrador:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (adminPasswordError) setAdminPasswordError(null);
                    }}
                    placeholder="Digite a senha..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none tracking-widest font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
                </div>
                {adminPasswordError && (
                  <p className="text-xs text-rose-400 mt-2 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{adminPasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminPasswordModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Entrar no Painel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
