import { useState } from 'react';

import {
  DEPTH_GROUPS,
  temperatureColor,
  type CoolingLayer,
  type ProfileLevel,
} from '../../lib/profileStats';
import { ProfileChart } from './ProfileChart';

interface PredictionProfilePanelProps {
  levels: ProfileLevel[];
  cooling: CoolingLayer | null;
}

/**
 * The chart and the level table share one "active depth": hovering
 * or focusing either one highlights the same level in both.
 */
export function PredictionProfilePanel({
  levels,
  cooling,
}: PredictionProfilePanelProps) {
  const [activeDepth, setActiveDepth] = useState<number | null>(null);

  const temps = levels.map((l) => l.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);

  const inCooling = (depth: number) =>
    cooling !== null && (depth === cooling.from.depth || depth === cooling.to.depth);

  return (
    <div className="pr-body">
      <div className="pr-chart-wrap">
        <ProfileChart
          levels={levels}
          cooling={cooling}
          activeDepth={activeDepth}
          onActiveDepthChange={setActiveDepth}
        />
      </div>

      <div className="pr-table-wrap">
        <table className="pr-table">
          <caption className="pr-sr">
            Reconstructed temperature at each standard depth
          </caption>

          <thead>
            <tr>
              <th scope="col">Depth</th>
              <th scope="col" aria-hidden="true" />
              <th scope="col" className="is-num">
                °C
              </th>
            </tr>
          </thead>

          {DEPTH_GROUPS.map((group) => {
            const rows = levels.filter((l) =>
              (group.depths as readonly number[]).includes(l.depth),
            );
            if (!rows.length) return null;

            return (
              <tbody key={group.title}>
                <tr className="pr-table__group">
                  <th scope="rowgroup" colSpan={3}>
                    {group.title}
                  </th>
                </tr>

                {rows.map(({ depth, temp }) => {
                  const color = temperatureColor(temp, min, max);
                  const share = max > min ? (temp - min) / (max - min) : 1;

                  return (
                    <tr
                      key={depth}
                      tabIndex={0}
                      data-active={depth === activeDepth}
                      data-cooling={inCooling(depth)}
                      onMouseEnter={() => setActiveDepth(depth)}
                      onMouseLeave={() => setActiveDepth(null)}
                      onFocus={() => setActiveDepth(depth)}
                      onBlur={() => setActiveDepth(null)}
                    >
                      <th scope="row">
                        {depth.toLocaleString('en-IN')}
                        <span className="pr-unit"> m</span>
                      </th>
                      <td aria-hidden="true" className="pr-table__bar-cell">
                        <span className="pr-bar">
                          <span
                            className="pr-bar__fill"
                            style={{
                              width: `${8 + share * 92}%`,
                              background: color,
                            }}
                          />
                        </span>
                      </td>
                      <td className="is-num" style={{ color }}>
                        {temp.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
