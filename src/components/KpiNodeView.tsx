import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { KpiNode } from '../kpi-types';
import { unitLabel } from '../lib/format';

export type NodeState = 'normal' | 'focused' | 'active' | 'dim';

export interface KpiNodeData {
  kpi: KpiNode;
  color: string;
  state: NodeState;
  [key: string]: unknown;
}

function KpiNodeViewImpl({ data }: NodeProps) {
  const { kpi, color, state } = data as KpiNodeData;
  return (
    <div
      className={`kpi-node state-${state}`}
      style={{ ['--accent' as string]: color }}
      title={kpi.name}
    >
      {/* Source handle (top) reaches up to parents; target handle (bottom) receives from children. */}
      <Handle type="source" position={Position.Top} className="kpi-handle" />
      <Handle type="target" position={Position.Bottom} className="kpi-handle" />
      <div className="kpi-accent" />
      <div className="kpi-body">
        <div className="kpi-name">{kpi.name}</div>
        <div className="kpi-meta">
          <span className="kpi-chip">{unitLabel(kpi.unit)}</span>
          <span className="kpi-level">L{kpi.level}</span>
        </div>
      </div>
    </div>
  );
}

export const KpiNodeView = memo(KpiNodeViewImpl);
