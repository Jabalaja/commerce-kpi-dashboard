import type { Section } from '../kpi-types';
import { brand } from '../theme/brand';
import { relationshipLabel } from '../lib/format';

interface LegendProps {
  sections: Section[];
}

const relationships = ['multiplicative', 'additive', 'inverse', 'cost', 'driver'] as const;

export function Legend({ sections }: LegendProps) {
  return (
    <div className="panel legend">
      <div className="legend-group">
        <h4>Sections</h4>
        {sections.map((s) => (
          <div className="swatch-row" key={s.id}>
            <span className="swatch" style={{ background: brand.section[s.id] }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="legend-group">
        <h4>Relationship (impact flows up ↑)</h4>
        {relationships.map((r) => (
          <div className="swatch-row" key={r}>
            <span className="line" style={{ borderTopColor: brand.relationship[r] }} />
            <span>{relationshipLabel[r]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
