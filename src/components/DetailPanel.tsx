import type { KpiNode } from '../kpi-types';
import { brand } from '../theme/brand';
import { nodeById, sectionById, sectionColor } from '../lib/graph';
import { relationshipLabel, unitFull } from '../lib/format';

interface DetailPanelProps {
  kpi: KpiNode | null;
  open: boolean;
  pathActive: boolean;
  onClose: () => void;
  onPathToTop: () => void;
  onFocusKpi: (id: string) => void;
}

export function DetailPanel({
  kpi,
  open,
  pathActive,
  onClose,
  onPathToTop,
  onFocusKpi,
}: DetailPanelProps) {
  // Keep the last KPI rendered while the panel slides out.
  const section = kpi ? sectionById.get(kpi.section) : undefined;
  const color = kpi ? sectionColor(kpi.section) : brand.color.blue;

  return (
    <aside
      className={`detail ${open ? 'open' : ''}`}
      style={{ ['--section-color' as string]: color }}
      aria-hidden={!open}
    >
      {kpi && (
        <>
          <div className="detail-head">
            <button className="detail-close" onClick={onClose} aria-label="Close">
              ×
            </button>
            <span className="eyebrow">
              <span className="dot" />
              {section?.label ?? kpi.section}
            </span>
            <h2>{kpi.name}</h2>
            <div className="level-tag">
              Level {kpi.level} · {kpi.childrenIds.length} driver
              {kpi.childrenIds.length === 1 ? '' : 's'} · {kpi.parents.length} parent
              {kpi.parents.length === 1 ? '' : 's'}
            </div>
            <div className="cta-row">
              <button
                className={`btn ${pathActive ? 'active' : 'primary'}`}
                onClick={onPathToTop}
              >
                {pathActive ? 'Showing path to top ✓' : 'Show path to top ↑'}
              </button>
            </div>
          </div>

          <div className="detail-body">
            <section>
              <h3>Definition</h3>
              <p>{kpi.definition}</p>
            </section>

            <section>
              <h3>How it is measured</h3>
              <div className="formula">
                <span className="unit">{unitFull(kpi.unit)}</span>
                {kpi.formula}
              </div>
            </section>

            {kpi.parents.length > 0 && (
              <section>
                <h3>Ladders up into</h3>
                <div className="relate-chips">
                  {kpi.parents.map((p) => {
                    const parent = nodeById.get(p.id);
                    return (
                      <button
                        key={p.id}
                        className="relate-chip"
                        onClick={() => onFocusKpi(p.id)}
                        title={p.note ?? ''}
                      >
                        <span
                          className="rel-dot"
                          style={{ background: brand.relationship[p.relationship] }}
                        />
                        {parent?.name ?? p.id}
                        <span className="rel-tag">{relationshipLabel[p.relationship]}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {kpi.childrenIds.length > 0 && (
              <section>
                <h3>Driven by</h3>
                <div className="relate-chips">
                  {kpi.childrenIds.map((cid) => {
                    const child = nodeById.get(cid);
                    return (
                      <button
                        key={cid}
                        className="relate-chip"
                        onClick={() => onFocusKpi(cid)}
                      >
                        {child?.name ?? cid}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h3>Levers to improve it</h3>
              {kpi.levers.length === 0 ? (
                <p className="empty-note">No levers captured yet.</p>
              ) : (
                kpi.levers.map((lever, i) => (
                  <div className="lever" key={i}>
                    <div className="lever-action">{lever.action}</div>
                    {lever.description && <div className="lever-desc">{lever.description}</div>}
                    <div className="badges">
                      <span className="badge" style={{ background: brand.magnitude[lever.impact] }}>
                        <span className="badge-k">impact</span>
                        {lever.impact}
                      </span>
                      <span className="badge" style={{ background: brand.magnitude[lever.effort] }}>
                        <span className="badge-k">effort</span>
                        {lever.effort}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section>
              <h3>Benchmarks</h3>
              {kpi.benchmarks.length === 0 ? (
                <p className="empty-note">
                  No reliable public benchmark; this is typically a client-specific measure.
                </p>
              ) : (
                kpi.benchmarks.map((b, i) => (
                  <div className="benchmark" key={i}>
                    <div className="b-value">{b.value}</div>
                    <div className="b-label">{b.label}</div>
                    {b.note && <div className="b-note">{b.note}</div>}
                    <a href={b.source} target="_blank" rel="noreferrer noopener">
                      Source ↗
                    </a>
                  </div>
                ))
              )}
            </section>
          </div>
        </>
      )}
    </aside>
  );
}
