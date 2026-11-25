import { post, get } from './api';
import { kv, pendingOps } from './db';

export function deviceId(): string {
  let id = kv.get('device_id');
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    kv.set('device_id', id);
  }
  return id;
}

export function opId(): string {
  return 'op-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export interface PushSummary {
  results: { opId: string; status: string; entityId?: string; error?: string }[];
  summary: Record<string, number>;
}

/**
 * Pousse la file locale vers POST /sync/push.
 * Le serveur est idempotent : rejouer une opId connue retourne 'duplicate'
 * sans doublon métier. Les ops rejetées restent 'rejected' pour revue.
 */
export async function pushPending(): Promise<PushSummary> {
  const ops = pendingOps.list('pending');
  if (ops.length === 0) return { results: [], summary: {} };

  const res = await post<PushSummary>('/sync/push', {
    deviceId: deviceId(),
    operations: ops.map((o) => ({
      opId: o.op_id,
      type: o.type,
      entityId: o.entity_id ?? undefined,
      payload: o.payload,
      clientTimestamp: o.client_timestamp,
    })),
  });

  for (const r of res.results) {
    if (r.status === 'applied' || r.status === 'duplicate') {
      pendingOps.mark(r.opId, r.status === 'duplicate' ? 'duplicate' : 'applied');
    } else {
      pendingOps.mark(r.opId, 'rejected', r.error);
    }
  }
  pendingOps.clearApplied();

  kv.set('last_sync_at', new Date().toISOString());
  return res;
}

export async function pullDelta(since?: string) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  return get<{ cursor: string; acts: unknown[]; beneficiaries: unknown[]; referentials: unknown[] }>(`/sync/pull${qs}`);
}
