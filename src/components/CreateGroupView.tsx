import React, { useState } from 'react';
import { Gift, Plus, Trash2, Users, DollarSign, Calendar, MapPin, AlertCircle, Ban, Sparkles, CheckCircle2, ClipboardPaste, ArrowRight, Lock, ShieldCheck, Key } from 'lucide-react';
import { SecretGroup, Participant, ExclusionRule } from '../types';
import { performSecretSantaDraw, formatBRL } from '../utils/secretSanta';
import { playClickSound } from '../utils/soundEffects';
import { saveGroup } from '../services/groupStorage';

interface CreateGroupViewProps {
  onGroupCreated: (group: SecretGroup) => void;
}

export const CreateGroupView: React.FC<CreateGroupViewProps> = ({ onGroupCreated }) => {
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [adminPassword, setAdminPassword] = useState('1234');

  // Participants
  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'p_1', name: 'Ana Carolina' },
    { id: 'p_2', name: 'Bruno Mendes' },
    { id: 'p_3', name: 'Camila Santos' },
    { id: 'p_4', name: 'Diego Ferreira' },
  ]);

  // Bulk add modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  // Restrictions: Person A cannot draw Person B
  const [exclusions, setExclusions] = useState<ExclusionRule[]>([]);
  const [fromParticipantId, setFromParticipantId] = useState('');
  const [toParticipantId, setToParticipantId] = useState('');
  const [isMutual, setIsMutual] = useState(true);

  // Status & validation error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Add single participant
  const handleAddParticipant = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = participantInput.trim();
    if (!trimmed) return;

    if (participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`"${trimmed}" já está na lista de participantes.`);
      return;
    }

    const newP: Participant = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
    };

    setParticipants([...participants, newP]);
    setParticipantInput('');
    setErrorMsg(null);
  };

  // Bulk add participants
  const handleBulkAdd = () => {
    if (!bulkInput.trim()) return;
    const lines = bulkInput
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const existingNames = new Set(participants.map((p) => p.name.toLowerCase()));
    const newItems: Participant[] = [];

    for (const name of lines) {
      if (!existingNames.has(name.toLowerCase())) {
        existingNames.add(name.toLowerCase());
        newItems.push({
          id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name,
        });
      }
    }

    setParticipants([...participants, ...newItems]);
    setBulkInput('');
    setShowBulkModal(false);
    playClickSound();
  };

  // Remove participant
  const handleRemoveParticipant = (id: string) => {
    playClickSound();
    setParticipants(participants.filter((p) => p.id !== id));
    // Clean up associated exclusions
    setExclusions(exclusions.filter((e) => e.fromParticipantId !== id && e.toParticipantId !== id));
  };

  // Add restriction
  const handleAddExclusion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromParticipantId || !toParticipantId) return;
    if (fromParticipantId === toParticipantId) {
      setErrorMsg('Uma pessoa não pode tirar a si mesma por padrão.');
      return;
    }

    const exists = exclusions.some(
      (r) => r.fromParticipantId === fromParticipantId && r.toParticipantId === toParticipantId
    );

    if (exists) {
      setErrorMsg('Essa restrição já foi adicionada.');
      return;
    }

    const newRules: ExclusionRule[] = [
      {
        id: `ex_${Date.now()}_1`,
        fromParticipantId,
        toParticipantId,
      },
    ];

    if (isMutual) {
      const mutualExists = exclusions.some(
        (r) => r.fromParticipantId === toParticipantId && r.toParticipantId === fromParticipantId
      );
      if (!mutualExists) {
        newRules.push({
          id: `ex_${Date.now()}_2`,
          fromParticipantId: toParticipantId,
          toParticipantId: fromParticipantId,
        });
      }
    }

    setExclusions([...exclusions, ...newRules]);
    setToParticipantId('');
    setErrorMsg(null);
    playClickSound();
  };

  // Remove restriction
  const handleRemoveExclusion = (ruleId: string) => {
    playClickSound();
    setExclusions(exclusions.filter((e) => e.id !== ruleId));
  };

  // Submit and perform Secret Santa draw
  const handleCreateAndDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Por favor, informe o nome do grupo.');
      return;
    }

    if (participants.length < 3) {
      setErrorMsg('Adicione pelo menos 3 participantes para poder realizar o sorteio.');
      return;
    }

    const minNum = minPrice ? parseFloat(minPrice) : null;
    const maxNum = maxPrice ? parseFloat(maxPrice) : null;
    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setErrorMsg('O valor mínimo não pode ser maior que o valor máximo do presente.');
      return;
    }

    setIsProcessing(true);

    // Compute the draw
    const drawResult = performSecretSantaDraw(participants, exclusions);

    if (!drawResult.success || !drawResult.pairs) {
      setErrorMsg(drawResult.error || 'Não foi possível encontrar uma combinação de sorteio válida.');
      setIsProcessing(false);
      return;
    }

    // Assign secret targets to each participant
    const participantsWithDraw: Participant[] = participants.map((p) => ({
      ...p,
      secretTargetId: drawResult.pairs![p.id],
      isRevealed: false,
    }));

    const groupId = `grp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const adminKey = `adm_${Math.random().toString(36).substring(2, 10)}`;
    const finalPassword = adminPassword.trim() || '1234';

    const newGroup: SecretGroup = {
      id: groupId,
      adminKey,
      adminPassword: finalPassword,
      title: title.trim(),
      description: description.trim() || undefined,
      minPrice: minNum,
      maxPrice: maxNum,
      eventDate: eventDate || undefined,
      eventTime: eventTime || undefined,
      eventLocation: eventLocation.trim() || undefined,
      participants: participantsWithDraw,
      exclusions,
      pendingRequests: [],
      status: 'drawn',
      createdAt: new Date().toISOString(),
    };

    const saved = await saveGroup(newGroup);
    setIsProcessing(false);
    onGroupCreated(saved);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Hero Welcome */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sorteio Rápido e Sem Cadastro</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight mb-3">
          Criar Sorteio de Amigo Secreto
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Configure as informações do seu grupo, defina valores sugeridos, adicione restrições de quem não pode tirar quem e gere um link exclusivo para os participantes.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Atenção</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleCreateAndDraw} className="space-y-8">
        {/* 1. Informações Básicas */}
        <div className="bg-[#111A2E] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-amber-400" />
            <span>1. Informações do Grupo</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome do Grupo ou Evento *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Amigo Secreto da Família 2026, Turma da Firma..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Gift Price Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Faixa de Valor do Presente (R$)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold">
                    R$ Mínimo
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Ex: 30,00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-24 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold">
                    R$ Máximo
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Ex: 80,00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-24 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Date, Time & Location (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  <span>Data da Revelação</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Horário (opcional)
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Local do Encontro</span>
                </label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Ex: Casa da Vovó, Escritório..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Descrição ou Recado aos Participantes (opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Levar um prato doce ou salgado. O tema deste ano é 'Presente Criativo'!"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Participantes */}
        <div className="bg-[#111A2E] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>2. Participantes ({participants.length})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Mínimo de 3 participantes para realizar o sorteio.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 self-start sm:self-auto bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg border border-amber-400/20 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Colar lista de nomes</span>
            </button>
          </div>

          {/* Add participant input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddParticipant();
                }
              }}
              placeholder="Digite um nome e pressione Enter..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => handleAddParticipant()}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>

          {/* List of participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {participants.map((p, index) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {index + 1}
                  </span>
                  <span className="truncate font-medium">{p.name}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(p.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Restrições de Sorteio */}
        <div className="bg-[#111A2E] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-400" />
              <span>3. Restrições de Sorteio (Quem não pode tirar quem)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ideal para casais, pessoas que moram juntas ou familiares diretos.
            </p>
          </div>

          {participants.length >= 3 ? (
            <div className="space-y-4">
              {/* Form to add a restriction */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                      Esta pessoa:
                    </label>
                    <select
                      value={fromParticipantId}
                      onChange={(e) => setFromParticipantId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                    >
                      <option value="">Selecione quem não pode tirar...</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                      NÃO pode ser tirada por / tirar:
                    </label>
                    <select
                      value={toParticipantId}
                      onChange={(e) => setToParticipantId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                    >
                      <option value="">Selecione o destinatário proibido...</option>
                      {participants
                        .filter((p) => p.id !== fromParticipantId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMutual}
                      onChange={(e) => setIsMutual(e.target.checked)}
                      className="rounded border-slate-700 text-rose-500 focus:ring-0 focus:outline-none"
                    />
                    <span>Restrição mútua (nenhum dos dois pode tirar o outro)</span>
                  </label>

                  <button
                    type="button"
                    disabled={!fromParticipantId || !toParticipantId}
                    onClick={handleAddExclusion}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Adicionar Restrição</span>
                  </button>
                </div>
              </div>

              {/* Active restrictions list */}
              {exclusions.length > 0 ? (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Restrições Ativas ({exclusions.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {exclusions.map((rule) => {
                      const fromP = participants.find((p) => p.id === rule.fromParticipantId);
                      const toP = participants.find((p) => p.id === rule.toParticipantId);
                      return (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-slate-200"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-white truncate">
                              {fromP?.name || 'Desconhecido'}
                            </span>
                            <span className="text-rose-400 font-bold shrink-0">
                              não pode tirar
                            </span>
                            <span className="font-semibold text-white truncate">
                              {toP?.name || 'Desconhecido'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveExclusion(rule.id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                            title="Remover restrição"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Nenhuma restrição definida. Todos os participantes podem tirar qualquer pessoa (exceto a si mesmos).
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Adicione pelo menos 3 participantes acima para configurar restrições.
            </p>
          )}
        </div>

        {/* 4. Admin Security Password */}
        <div className="bg-[#111A2E] border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                <span>Senha do Administrador</span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Proteção Ativa
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Apenas quem souber essa senha poderá entrar no painel para ver o gabarito do sorteio.
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Defina a senha do organizador:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Ex: 1234 ou natal2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 tracking-wider font-semibold font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setAdminPassword(Math.floor(1000 + Math.random() * 9000).toString());
                }}
                className="px-3 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium transition-colors shrink-0"
                title="Gerar código aleatório"
              >
                Gerar PIN
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Participantes que receberem o link não conseguirão ver quem tirou quem sem esta senha.</span>
            </p>
          </div>
        </div>

        {/* 5. Action CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            Ao realizar o sorteio, um link exclusivo será gerado para você compartilhar com os participantes.
          </p>

          <button
            type="submit"
            disabled={isProcessing || participants.length < 3 || !title.trim()}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm sm:text-base transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-display"
          >
            {isProcessing ? (
              <span>Sorteando os pares...</span>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>Realizar Sorteio e Gerar Link</span>
                <ArrowRight className="w-5 h-5 text-slate-950" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111A2E] border border-amber-500/30 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 font-display">
              Colar Lista de Participantes
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cole nomes separados por quebra de linha ou vírgulas (ótimo para listas do WhatsApp).
            </p>

            <textarea
              rows={6}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="Maria Silva&#10;João Pedro&#10;Lucas Santos&#10;Fernanda Lima"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:border-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
              >
                Adicionar Nomes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
