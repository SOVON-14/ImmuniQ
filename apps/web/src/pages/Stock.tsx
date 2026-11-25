import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Lot, Product, Structure } from '../lib/types';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner, Table,
} from '../components/ui';

interface StockLevel {
  id: string;
  quantityOnHand: number;
  lot?: Lot & { product?: Product };
  structure?: { id: string; name?: string };
  lotId?: string;
  structureId?: string;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  createdAt: string;
  lot?: { lotNumber?: string };
  product?: { name?: string };
}

const LOT_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  available: { label: 'Disponible', tone: 'success' },
  quarantined: { label: 'Quarantaine', tone: 'warning' },
  depleted: { label: 'Épuisé', tone: 'neutral' },
  expired: { label: 'Expiré', tone: 'danger' },
};

const MOVE_TYPE: Record<string, string> = {
  receipt: 'Réception',
  transfer_out: 'Transfert sortant',
  transfer_in: 'Transfert entrant',
  administration: 'Administration',
  loss: 'Perte',
  adjustment: 'Ajustement',
  return: 'Retour',
  quarantine: 'Mise en quarantaine',
  release: 'Sortie quarantaine',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function Stock() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<'levels' | 'lots' | 'movements'>('levels');
  const [modal, setModal] = useState<'' | 'receive' | 'transfer' | 'adjust'>('');

  const levels = useQuery({ queryKey: ['stock-levels'], queryFn: () => get<StockLevel[]>('/stock/levels'), enabled: tab === 'levels' });
  const lots = useQuery({ queryKey: ['lots'], queryFn: () => get<Lot[]>('/stock/lots'), enabled: tab === 'lots' });
  const movements = useQuery({ queryKey: ['stock-movements'], queryFn: () => get<Movement[]>('/stock/movements'), enabled: tab === 'movements' });
  const products = useQuery({ queryKey: ['products'], queryFn: () => get<Product[]>('/stock/products') });
  const structures = useQuery({ queryKey: ['structures'], queryFn: () => get<Structure[]>('/org/structures'), retry: false });

  return (
    <div>
      <PageHeader
        title="Stocks & lots"
        subtitle="Produits, lots, niveaux par structure et mouvements"
        actions={
          <div className="flex gap-2">
            {hasPermission('stock.receive') && <Button variant="secondary" onClick={() => setModal('receive')}>+ Réception lot</Button>}
            {hasPermission('stock.move') && <Button variant="secondary" onClick={() => setModal('transfer')}>Transfert</Button>}
            {hasPermission('stock.adjust') && <Button variant="ghost" onClick={() => setModal('adjust')}>Ajustement</Button>}
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        {(['levels', 'lots', 'movements'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t ? 'bg-immuniq-navy text-white' : 'bg-surface text-muted border border-line hover:bg-immuniq-mist'}`}>
            {t === 'levels' ? 'Niveaux' : t === 'lots' ? 'Lots' : 'Mouvements'}
          </button>
        ))}
      </div>

      {tab === 'levels' && (
        <Card>
          <ErrorBox error={levels.error} />
          {levels.isLoading ? <Spinner /> : !levels.data || levels.data.length === 0 ? (
            <EmptyState message="Aucun niveau de stock." />
          ) : (
            <Table head={['Produit', 'Lot', 'Expiration', 'Structure', 'Qté']}>
              {levels.data.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">{l.lot?.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.lot?.lotNumber ?? '—'}</td>
                  <td className="px-4 py-3">{fmtDate(l.lot?.expiryDate)}</td>
                  <td className="px-4 py-3">{l.structure?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{l.quantityOnHand}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'lots' && (
        <Card>
          <ErrorBox error={lots.error} />
          {lots.isLoading ? <Spinner /> : !lots.data || lots.data.length === 0 ? (
            <EmptyState message="Aucun lot." />
          ) : (
            <Table head={['Produit', 'N° lot', 'Expiration', 'Qté initiale', 'Statut', 'Fournisseur']}>
              {lots.data.map((l) => {
                const s = LOT_STATUS[l.status ?? ''] ?? LOT_STATUS.available;
                return (
                  <tr key={l.id}>
                    <td className="px-4 py-3">{(l.product as Product | undefined)?.name ?? l.productId ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.lotNumber ?? '—'}</td>
                    <td className="px-4 py-3">{fmtDate(l.expiryDate)}</td>
                    <td className="px-4 py-3">{l.quantityInitial ?? '—'}</td>
                    <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted">{l.supplier ?? '—'}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      )}

      {tab === 'movements' && (
        <Card>
          <ErrorBox error={movements.error} />
          {movements.isLoading ? <Spinner /> : !movements.data || movements.data.length === 0 ? (
            <EmptyState message="Aucun mouvement." />
          ) : (
            <Table head={['Date', 'Type', 'Produit', 'Lot', 'Qté', 'Motif']}>
              {movements.data.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">{fmtDate(m.createdAt)}</td>
                  <td className="px-4 py-3">{MOVE_TYPE[m.type] ?? m.type}</td>
                  <td className="px-4 py-3">{m.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.lot?.lotNumber ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{m.quantity}</td>
                  <td className="px-4 py-3 text-xs text-muted">{m.reason}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {modal === 'receive' && <ReceiveLotModal products={products.data ?? []} structures={structures.data ?? []} onClose={() => setModal('')} />}
      {modal === 'transfer' && <TransferModal lots={lots.data ?? []} structures={structures.data ?? []} onClose={() => setModal('')} />}
      {modal === 'adjust' && <AdjustModal lots={lots.data ?? []} structures={structures.data ?? []} onClose={() => setModal('')} />}
    </div>
  );
}

function ReceiveLotModal({ products, structures, onClose }: { products: Product[]; structures: Structure[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ productId: '', lotNumber: '', expiryDate: '', quantityInitial: '1', manufacturer: '', supplier: '', structureId: '', notes: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/stock/lots/receive', {
      ...form,
      quantityInitial: Number(form.quantityInitial),
      receiptDate: new Date().toISOString().slice(0, 10),
      manufacturer: form.manufacturer || undefined,
      supplier: form.supplier || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lots'] }); qc.invalidateQueries({ queryKey: ['stock-levels'] }); onClose(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <Modal title="Réception d'un lot" onClose={onClose} error={error} onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} busy={mutation.isPending} submitLabel="Réceptionner">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Produit *">
          <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
            <option value="">— Choisir —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Structure *">
          <Select value={form.structureId} onChange={(e) => setForm({ ...form, structureId: e.target.value })} required>
            <option value="">— Choisir —</option>
            {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="N° de lot *"><Input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} required /></Field>
        <Field label="Date d'expiration *"><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required /></Field>
        <Field label="Quantité *"><Input type="number" min={1} value={form.quantityInitial} onChange={(e) => setForm({ ...form, quantityInitial: e.target.value })} required /></Field>
        <Field label="Fabricant"><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
        <Field label="Fournisseur"><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
        <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function TransferModal({ lots, structures, onClose }: { lots: Lot[]; structures: Structure[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ lotId: '', fromStructureId: '', toStructureId: '', quantity: '1', reason: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/stock/transfers', { ...form, quantity: Number(form.quantity) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-levels'] }); qc.invalidateQueries({ queryKey: ['stock-movements'] }); onClose(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <Modal title="Transfert de stock" onClose={onClose} error={error} onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} busy={mutation.isPending} submitLabel="Transférer">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lot *">
          <Select value={form.lotId} onChange={(e) => setForm({ ...form, lotId: e.target.value })} required>
            <option value="">— Choisir —</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.lotNumber} (exp. {fmtDate(l.expiryDate)})</option>)}
          </Select>
        </Field>
        <Field label="Quantité *"><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></Field>
        <Field label="De (structure) *">
          <Select value={form.fromStructureId} onChange={(e) => setForm({ ...form, fromStructureId: e.target.value })} required>
            <option value="">— Choisir —</option>
            {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Vers (structure) *">
          <Select value={form.toStructureId} onChange={(e) => setForm({ ...form, toStructureId: e.target.value })} required>
            <option value="">— Choisir —</option>
            {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Motif *"><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required /></Field>
        </div>
      </div>
    </Modal>
  );
}

function AdjustModal({ lots, structures, onClose }: { lots: Lot[]; structures: Structure[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ lotId: '', structureId: '', newQuantity: '0', reason: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/stock/adjustments', { ...form, newQuantity: Number(form.newQuantity) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-levels'] }); qc.invalidateQueries({ queryKey: ['stock-movements'] }); onClose(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <Modal title="Ajustement de stock" onClose={onClose} error={error} onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} busy={mutation.isPending} submitLabel="Ajuster">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lot *">
          <Select value={form.lotId} onChange={(e) => setForm({ ...form, lotId: e.target.value })} required>
            <option value="">— Choisir —</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.lotNumber}</option>)}
          </Select>
        </Field>
        <Field label="Structure *">
          <Select value={form.structureId} onChange={(e) => setForm({ ...form, structureId: e.target.value })} required>
            <option value="">— Choisir —</option>
            {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Nouvelle quantité *"><Input type="number" min={0} value={form.newQuantity} onChange={(e) => setForm({ ...form, newQuantity: e.target.value })} required /></Field>
        <Field label="Motif *"><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required /></Field>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose, onSubmit, busy, submitLabel, error }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  busy: boolean;
  submitLabel: string;
  error: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 my-8">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <ErrorBox error={error || null} />
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy ? '…' : submitLabel}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
