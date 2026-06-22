import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { KpiNode } from '../kpi-types';
import { unitLabel } from '../lib/format';

export type NodeState = 'normal' | 'focused' | 'active' | 'dim';

export interface KpiNodeData {
  kpi: KpiNode;
  color: string;
  state: NodeState;
  /** Whether this KPI has drivers that can be revealed. */
  expandable: boolean;
  /** Whether its drivers are currently revealed. */
  isExpanded: boolean;
  /** Number of direct drivers (shown on the collapsed chip). */
  childCount: number;
  onToggleExpand: (id: string) => void;
  /** Whether to show the expand/collapse chip (map mode only). */
  chip: boolean;
  [key: string]: unknown;
}

function variantOf(level: number): 'apex' | 'pillar' | 'normal' {
  if (level === 1) return 'apex';
  if (level === 2) return 'pillar';
  return 'normal';
}

function KpiNodeViewImpl({ data }: NodeProps) {
  const { kpi, color, state, expandable, isExpanded, childCount, onToggleExpand, chip } =
    data as KpiNodeData;
  const variant = variantOf(kpi.level);

  return (
    <div
      className={`kpi-node v-${variant} state-${state}`}
      style={{ ['--accent' as string]: color }}
      title={kpi.name}
    >
      {/* Source handle (top) reaches up to parents; target handle (bottom) receives from children. */}
      <Handle type="source" position={Position.Top} className="kpi-handle" />
      <Handle type="target" position={Position.Bottom} className="kpi-handle" />
      <div className="kpi-accent" />
      <div className="kpi-body">
        <div className="kpi-name">{kpi.name}</div>
        {variant === 'apex' && <div className="kpi-equation">= Revenue − Total Cost</div>}
        <div className="kpi-meta">
          <span className="kpi-chip">{unitLabel(kpi.unit)}</span>
          <span className="kpi-level">L{kpi.level}</span>
        </div>
      </div>

      {chip && expandable && (
        <button
          type="button"
          className={`kpi-expand ${isExpanded ? 'is-open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(kpi.id);
          }}
          aria-label={
            isExpanded
              ? `Collapse the drivers of ${kpi.name}`
              : `Reveal ${childCount} driver${childCount === 1 ? '' : 's'} of ${kpi.name}`
          }
          title={isExpanded ? 'Collapse drivers' : `Reveal ${childCount} drivers`}
        >
          {isExpanded ? '–' : `+${childCount}`}
        </button>
      )}
    </div>
  );
}

export const KpiNodeView = memo(KpiNodeViewImpl);
