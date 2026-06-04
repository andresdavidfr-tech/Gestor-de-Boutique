import type { BagStatus, VisitStatus } from '../types';

interface StatusMeta {
  label: string;
  className: string;
}

export const BAG_STATUS: Record<BagStatus, StatusMeta> = {
  available:  { label: 'Disponible',   className: 'bg-purple-100 text-purple-800' },
  concession: { label: 'En Concesión', className: 'bg-blue-100 text-blue-800' },
  sold:       { label: 'Vendida',      className: 'bg-green-100 text-green-800' },
  returned:   { label: 'Devuelta',     className: 'bg-gray-100 text-gray-800' },
};

export const VISIT_STATUS: Record<VisitStatus, StatusMeta> = {
  scheduled: { label: 'Programada', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completada', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelada',  className: 'bg-red-100 text-red-800' },
};

const FALLBACK: StatusMeta = { label: '—', className: 'bg-gray-100 text-gray-800' };

export const bagStatus = (s?: string): StatusMeta =>
  (s && BAG_STATUS[s as BagStatus]) || { ...FALLBACK, label: s ?? '—' };

export const visitStatus = (s?: string): StatusMeta =>
  (s && VISIT_STATUS[s as VisitStatus]) || { ...FALLBACK, label: s ?? '—' };

export const BAG_STATUS_OPTIONS: { value: BagStatus; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'concession', label: 'En Concesión' },
  { value: 'sold', label: 'Vendida' },
  { value: 'returned', label: 'Devuelta' },
];

export const TRANSACTION_LABEL: Record<string, string> = {
  sold: 'Venta',
  paid: 'Cobro',
  debt: 'Adeudo',
};
