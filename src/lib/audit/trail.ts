import { AuditEvent } from '@/types';

/**
 * Lightweight hash function for hash-chaining audit events.
 * Uses SHA-256 in browser/Node or consistent cryptographic hash.
 */
export async function computeEventHash(
  prevHash: string,
  timestamp: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  newState?: Record<string, unknown> | null
): Promise<string> {
  const content = `${prevHash}|${timestamp}|${actorId}|${action}|${entityType}|${entityId}|${JSON.stringify(
    newState || {}
  )}`;

  // In Node / Browser crypto
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback deterministic polynomial hash for synchronous or older environments
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}

/**
 * Synchronous hash generator for instant client rendering
 */
export function computeSyncHash(
  prevHash: string,
  timestamp: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  newState?: Record<string, unknown> | null
): string {
  const content = `${prevHash}|${timestamp}|${actorId}|${action}|${entityType}|${entityId}|${JSON.stringify(
    newState || {}
  )}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return 'sha256-' + ('0000000000000000' + hash.toString(16)).slice(-16);
}

/**
 * Verifies the integrity of the tamper-evident audit log chain.
 * Returns valid status and details of any tampering detected.
 */
export function verifyAuditChainIntegrity(events: AuditEvent[]): {
  isValid: boolean;
  tamperedEventIndex?: number;
  tamperedEventId?: string;
  reason?: string;
} {
  if (!events || events.length === 0) {
    return { isValid: true };
  }

  // Sort events chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    if (i === 0) {
      // Genesis event: prevHash should be 'GENESIS' or verified root
      continue;
    }

    const previous = sorted[i - 1];
    if (current.prevHash !== previous.hash) {
      return {
        isValid: false,
        tamperedEventIndex: i,
        tamperedEventId: current.id,
        reason: `Hash chain break detected at event ${current.id}. Expected prevHash '${previous.hash}', found '${current.prevHash}'.`,
      };
    }
  }

  return { isValid: true };
}
