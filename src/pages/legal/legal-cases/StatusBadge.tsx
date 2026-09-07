import { legalCaseStatusLabel } from '@/components/legal/workspace/legalLabels';

export default function StatusBadge({ status }: { status: string }) {
  const value = status?.toLowerCase();
  const tone = ['cancelled', 'canceled', 'lost', 'urgent', 'high'].includes(value) ? 'danger' : ['pending', 'on_hold', 'suspended', 'new', 'draft'].includes(value) ? 'warning' : ['closed', 'dismissed', 'withdrawn'].includes(value) ? 'muted' : undefined;
  return <span className="lw-tag" data-tone={tone}>{legalCaseStatusLabel(status)}</span>;
}
