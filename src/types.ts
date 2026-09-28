export interface Participant {
  id: string;
  name: string;
  secretTargetId?: string; // ID of the person this participant must give a gift to
  isRevealed?: boolean;
  revealedAt?: string | null;
  wishlist?: string;
}

export interface ExclusionRule {
  id: string;
  fromParticipantId: string; // Pessoa que NÃO pode tirar
  toParticipantId: string;   // Pessoa que NÃO pode ser tirada
}

export interface PendingRequest {
  id: string;
  name: string;
  message?: string;
  contact?: string; // WhatsApp ou telefone
  createdAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface SecretGroup {
  id: string;
  adminKey: string;
  adminPassword?: string;
  title: string;
  description?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  eventDate?: string | null;
  eventTime?: string | null;
  eventLocation?: string | null;
  participants: Participant[];
  exclusions: ExclusionRule[];
  pendingRequests: PendingRequest[];
  status: 'draft' | 'drawn';
  createdAt: string;
  updatedAt?: string;
}

export interface DrawSimulationState {
  isShuffling: boolean;
  isReadyToOpen: boolean;
  isOpened: boolean;
}
