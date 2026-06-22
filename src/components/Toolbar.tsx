import type { KpiNode, Section } from '../kpi-types';

export type Mode = 'overview' | 'focus' | 'path';

interface ToolbarProps {
  mode: Mode;
  focusKpi: KpiNode | null;
  hops: number;
  maxHops: number;
  sections: Section[];
  allNodes: KpiNode[];
  visibleCount: number;
  totalCount: number;
  fullyExpanded: boolean;
  collapsedToTop: boolean;
  onReset: () => void;
  onHopsChange: (hops: number) => void;
  onTogglePath: () => void;
  onSelectKpi: (id: string) => void;
  onExpandAll: () => void;
  onCollapseToTop: () => void;
}

export function Toolbar({
  mode,
  focusKpi,
  hops,
  maxHops,
  sections,
  allNodes,
  visibleCount,
  totalCount,
  fullyExpanded,
  collapsedToTop,
  onReset,
  onHopsChange,
  onTogglePath,
  onSelectKpi,
  onExpandAll,
  onCollapseToTop,
}: ToolbarProps) {
  return (
    <div className="panel toolbar">
      <div className="mode-line">
        {mode === 'overview' && (
          <>
            Showing <b>{visibleCount}</b> of {totalCount} KPIs · click <b>+N</b> to reveal drivers
          </>
        )}
        {mode === 'focus' && (
          <>
            Focus: <b>{focusKpi?.name}</b> · {hops}-hop neighbourhood
          </>
        )}
        {mode === 'path' && (
          <>
            Path to top from <b>{focusKpi?.name}</b>
          </>
        )}
      </div>

      <select
        className="kpi-select"
        value={focusKpi?.id ?? ''}
        onChange={(e) => e.target.value && onSelectKpi(e.target.value)}
        aria-label="Jump to a KPI"
      >
        <option value="">Jump to a KPI…</option>
        {sections.map((s) => (
          <optgroup key={s.id} label={s.label}>
            {allNodes
              .filter((n) => n.section === s.id)
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>

      <div className="row">
        <button className="btn" onClick={onExpandAll} disabled={fullyExpanded}>
          Expand all
        </button>
        <button className="btn" onClick={onCollapseToTop} disabled={collapsedToTop}>
          Collapse to top
        </button>
      </div>

      {mode !== 'overview' && (
        <div className="row">
          <button className="btn" onClick={onReset}>
            ← Back to map
          </button>
          <button
            className={`btn ${mode === 'path' ? 'active' : ''}`}
            onClick={onTogglePath}
            disabled={!focusKpi}
          >
            {mode === 'path' ? 'Path to top ✓' : 'Path to top ↑'}
          </button>
        </div>
      )}

      {mode === 'focus' && (
        <div className="row">
          <span className="stepper">
            <button
              onClick={() => onHopsChange(hops - 1)}
              disabled={hops <= 1}
              aria-label="Fewer hops"
            >
              −
            </button>
            {hops} hop{hops > 1 ? 's' : ''}
            <button
              onClick={() => onHopsChange(hops + 1)}
              disabled={hops >= maxHops}
              aria-label="More hops"
            >
              +
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
