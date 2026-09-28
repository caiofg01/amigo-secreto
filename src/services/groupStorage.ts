import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SecretGroup, PendingRequest, Participant } from '../types';
import { decodeGroupFromUrl } from '../utils/secretSanta';

const LOCAL_STORAGE_KEY_PREFIX = 'amigo_secreto_group_';
const ADMIN_GROUPS_LIST_KEY = 'amigo_secreto_admin_groups';

// Clean object for Firestore (removes undefined fields)
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        cleaned[key] = sanitizeForFirestore(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

export async function fetchGroup(groupId: string): Promise<SecretGroup | null> {
  // 1. Try Firebase Firestore
  try {
    const groupRef = doc(db, 'groups', groupId);
    const snap = await getDoc(groupRef);
    if (snap.exists()) {
      const data = snap.data() as SecretGroup;
      saveGroupLocally(data);
      return data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `groups/${groupId}`);
  }

  // 2. Try Server API fallback
  try {
    const res = await fetch(`/api/groups/${groupId}`);
    if (res.ok) {
      const data: SecretGroup = await res.json();
      saveGroupLocally(data);
      return data;
    }
  } catch {
    // Continue
  }

  // 3. Fallback to URL search param (for legacy links)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('data');
    if (encoded) {
      const decoded = decodeGroupFromUrl(encoded);
      if (decoded && decoded.id === groupId) {
        saveGroupLocally(decoded);
        return decoded;
      }
    }
  }

  // 4. Fallback to Local Storage
  return loadGroupLocally(groupId);
}

export function subscribeToGroup(
  groupId: string,
  onUpdate: (group: SecretGroup) => void
): () => void {
  try {
    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(
      groupRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SecretGroup;
          saveGroupLocally(data);
          onUpdate(data);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `groups/${groupId}`);
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveGroup(group: SecretGroup): Promise<SecretGroup> {
  const sanitized = sanitizeForFirestore(group) as SecretGroup;
  saveGroupLocally(sanitized);
  trackAdminGroup(sanitized.id, sanitized.title, sanitized.adminKey);

  // 1. Save directly to Firebase Firestore
  try {
    const groupRef = doc(db, 'groups', sanitized.id);
    await setDoc(groupRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `groups/${sanitized.id}`);
  }

  // 2. Secondary sync to Express backend if available
  try {
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
    });
  } catch {
    // Continue
  }

  return sanitized;
}

export async function markParticipantRevealed(
  groupId: string,
  participantId: string
): Promise<boolean> {
  // Update locally first
  const group = loadGroupLocally(groupId) || (await fetchGroup(groupId));
  if (group) {
    const p = group.participants.find((item) => item.id === participantId);
    if (p) {
      p.isRevealed = true;
      p.revealedAt = new Date().toISOString();
      saveGroupLocally(group);

      // Update in Firebase Firestore
      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          participants: sanitizeForFirestore(group.participants),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
      }
    }
  }

  return true;
}

export async function requestNameInclusion(
  groupId: string,
  name: string,
  contact?: string,
  message?: string
): Promise<PendingRequest | null> {
  const newRequest: PendingRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    contact: contact?.trim() || '',
    message: message?.trim() || '',
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const group = loadGroupLocally(groupId) || (await fetchGroup(groupId));
  if (group) {
    if (!group.pendingRequests) group.pendingRequests = [];
    group.pendingRequests.push(newRequest);
    saveGroupLocally(group);

    // Save to Firebase Firestore
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        pendingRequests: sanitizeForFirestore(group.pendingRequests),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  }

  return newRequest;
}

export async function updateParticipantWishlist(
  groupId: string,
  participantId: string,
  wishlist: string
): Promise<boolean> {
  const group = loadGroupLocally(groupId) || (await fetchGroup(groupId));
  if (group) {
    const p = group.participants.find((item) => item.id === participantId);
    if (p) {
      p.wishlist = wishlist;
      saveGroupLocally(group);

      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          participants: sanitizeForFirestore(group.participants),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
      }
    }
  }

  return true;
}

// Local Storage helpers
export function saveGroupLocally(group: SecretGroup): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + group.id, JSON.stringify(group));
  } catch {
    // Storage full or unavailable
  }
}

export function loadGroupLocally(groupId: string): SecretGroup | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + groupId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function trackAdminGroup(id: string, title: string, adminKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(ADMIN_GROUPS_LIST_KEY);
    const list: Array<{ id: string; title: string; adminKey: string; date: string }> = raw
      ? JSON.parse(raw)
      : [];
    const existingIndex = list.findIndex((item) => item.id === id);
    const entry = { id, title, adminKey, date: new Date().toISOString() };
    if (existingIndex >= 0) {
      list[existingIndex] = entry;
    } else {
      list.unshift(entry);
    }
    localStorage.setItem(ADMIN_GROUPS_LIST_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    // Ignore
  }
}

export function getAdminGroups(): Array<{ id: string; title: string; adminKey: string; date: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMIN_GROUPS_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
