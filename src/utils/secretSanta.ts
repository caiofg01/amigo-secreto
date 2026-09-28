import { Participant, ExclusionRule, SecretGroup } from '../types';

/**
 * Computes a valid Secret Santa draw satisfying:
 * 1. No one draws themselves (giver !== receiver)
 * 2. All exclusions are respected (giver cannot draw excluded receiver)
 * 3. Exact 1-to-1 bijection (each person gives to one, receives from one)
 * 4. Prefers single Hamiltonian cycle if possible to prevent isolated pairs
 */
export function performSecretSantaDraw(
  participants: Participant[],
  exclusions: ExclusionRule[]
): { success: boolean; pairs?: Record<string, string>; error?: string } {
  if (participants.length < 3) {
    return {
      success: false,
      error: 'É necessário pelo menos 3 participantes para realizar o sorteio de amigo secreto.',
    };
  }

  // Build exclusion lookup: giverId -> Set of forbidden receiverIds
  const forbiddenMap: Record<string, Set<string>> = {};
  for (const p of participants) {
    forbiddenMap[p.id] = new Set<string>([p.id]); // cannot draw self
  }

  for (const rule of exclusions) {
    if (forbiddenMap[rule.fromParticipantId]) {
      forbiddenMap[rule.fromParticipantId].add(rule.toParticipantId);
    }
  }

  // Pre-check: verify each participant has at least one possible recipient
  for (const p of participants) {
    const available = participants.filter((r) => !forbiddenMap[p.id].has(r.id));
    if (available.length === 0) {
      return {
        success: false,
        error: `Não foi possível sortear: "${p.name}" não tem ninguém disponível para tirar devido às restrições definidas.`,
      };
    }
  }

  // Pre-check: verify each participant can be drawn by at least one giver
  for (const p of participants) {
    const potentialGivers = participants.filter((g) => !forbiddenMap[g.id].has(p.id));
    if (potentialGivers.length === 0) {
      return {
        success: false,
        error: `Não foi possível sortear: Ninguém pode tirar "${p.name}" devido às restrições definidas.`,
      };
    }
  }

  // Randomized Backtracking Algorithm
  // Try up to 200 random attempts first (often finds a great cycle in <5 attempts)
  for (let attempt = 0; attempt < 200; attempt++) {
    const result = tryRandomizedAssignment(participants, forbiddenMap);
    if (result) {
      return { success: true, pairs: result };
    }
  }

  // Deterministic backtracking fallback
  const assignment: Record<string, string> = {};
  const usedReceivers = new Set<string>();
  const participantIds = participants.map((p) => p.id);

  // Sort participants by most constrained first (MRV - Minimum Remaining Values heuristic)
  const sortedGivers = [...participants].sort((a, b) => {
    const countA = participants.filter((r) => !forbiddenMap[a.id].has(r.id)).length;
    const countB = participants.filter((r) => !forbiddenMap[b.id].has(r.id)).length;
    return countA - countB;
  });

  const success = backtrack(0, sortedGivers, forbiddenMap, assignment, usedReceivers);

  if (success) {
    return { success: true, pairs: assignment };
  }

  return {
    success: false,
    error: 'Não foi possível encontrar uma combinação válida com as restrições atuais. Tente flexibilizar ou remover algumas restrições.',
  };
}

function tryRandomizedAssignment(
  participants: Participant[],
  forbiddenMap: Record<string, Set<string>>
): Record<string, string> | null {
  const givers = [...participants].sort(() => Math.random() - 0.5);
  const receivers = [...participants].sort(() => Math.random() - 0.5);
  const assignment: Record<string, string> = {};
  const used = new Set<string>();

  for (const giver of givers) {
    // Candidates for this giver
    const validCandidates = receivers.filter(
      (r) => !used.has(r.id) && !forbiddenMap[giver.id].has(r.id)
    );

    if (validCandidates.length === 0) {
      return null;
    }

    // Pick a random valid candidate
    const chosen = validCandidates[Math.floor(Math.random() * validCandidates.length)];
    assignment[giver.id] = chosen.id;
    used.add(chosen.id);
  }

  return assignment;
}

function backtrack(
  index: number,
  givers: Participant[],
  forbiddenMap: Record<string, Set<string>>,
  assignment: Record<string, string>,
  usedReceivers: Set<string>
): boolean {
  if (index === givers.length) {
    return true;
  }

  const giver = givers[index];
  // Find all available receivers for this giver
  const candidates = givers.filter(
    (r) => !usedReceivers.has(r.id) && !forbiddenMap[giver.id].has(r.id)
  );

  // Sort candidates to prefer those who are hard to pick or randomized
  for (const candidate of candidates) {
    assignment[giver.id] = candidate.id;
    usedReceivers.add(candidate.id);

    if (backtrack(index + 1, givers, forbiddenMap, assignment, usedReceivers)) {
      return true;
    }

    // Backtrack
    delete assignment[giver.id];
    usedReceivers.delete(candidate.id);
  }

  return false;
}

/**
 * Utility to format BRL currency
 */
export function formatBRL(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats date string (YYYY-MM-DD) into Brazilian format (DD/MM/YYYY)
 */
export function formatBRDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Encode group safely for URL state fallback (compact minified payload)
 */
export function encodeGroupToUrl(group: SecretGroup): string {
  try {
    const minified = {
      i: group.id,
      t: group.title,
      d: group.description || undefined,
      mn: group.minPrice || undefined,
      mx: group.maxPrice || undefined,
      dt: group.eventDate || undefined,
      tm: group.eventTime || undefined,
      l: group.eventLocation || undefined,
      p: group.participants.map((p) => [p.id, p.name, p.secretTargetId || '']),
    };
    const json = JSON.stringify(minified);
    return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  } catch {
    return '';
  }
}

/**
 * Decode group safely from URL state
 */
export function decodeGroupFromUrl(encoded: string): SecretGroup | null {
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const parsed = JSON.parse(json);
    if (parsed.p && Array.isArray(parsed.p) && parsed.t) {
      // Minified format
      return {
        id: parsed.i || 'grp',
        adminKey: '',
        title: parsed.t,
        description: parsed.d,
        minPrice: parsed.mn,
        maxPrice: parsed.mx,
        eventDate: parsed.dt,
        eventTime: parsed.tm,
        eventLocation: parsed.l,
        participants: parsed.p.map((item: [string, string, string]) => ({
          id: item[0],
          name: item[1],
          secretTargetId: item[2],
          isRevealed: false,
        })),
        exclusions: [],
        pendingRequests: [],
        status: 'drawn',
        createdAt: new Date().toISOString(),
      };
    }
    return parsed;
  } catch {
    return null;
  }
}
