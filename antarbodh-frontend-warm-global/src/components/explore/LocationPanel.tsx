import { useMemo, useState } from 'react';

import type { ProfileResponse, ArgoProfileResponse } from '../../types/api';
import { ProfileChart } from '../predict/ProfileChart';
import { formatCoordinate } from '../../lib/formatting';
import { mapTemperatureColor } from '../../lib/mapColors';
import { steepestCooling, validLevels } from '../../lib/profileStats';
import { formatDay, seasonFor } from '../../lib/seasons';

interface LocationPanelProps {
  location: { lat: number; lon: number } | null;
  date: string;
  depth: number;
  temperature: number | null;
  profile: ProfileResponse | null;
  argoProfile: ArgoProfileResponse | null;
  argoLoading: boolean;
  loading: boolean;
  /** Clicking a level on the profile switches the map to it. */
  onDepthChange?: (depth: number) => void;
}

const fmt = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined ? '—' : value.toFixed(digits);

/** A kolam-style dot grid with a looped path around a centre point. */
function KolamTarget() {
  const dots = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      dots.push(<circle key={`${r}-${c}`} cx={12 + c * 18} cy={12 + r * 18} r={2} />);
    }
  }

  return (
    <svg className="ex-kolam" viewBox="0 0 96 96" aria-hidden="true">
      <g className="ex-kolam__dots">{dots}</g>
      {/* Quatrefoil: four r=14 arcs centred on the dots N, E, S and W
          of the centre, joined at their outer intersections. */}
      <path
        className="ex-kolam__loop"
        d="M34.9 34.9A14 14 0 1 1 61.1 34.9A14 14 0 1 1 61.1 61.1A14 14 0 1 1 34.9 61.1A14 14 0 1 1 34.9 34.9Z"
      />
      <circle className="ex-kolam__centre" cx="48" cy="48" r="5" />
    </svg>
  );
}

export function LocationPanel({
  location,
  date,
  depth,
  temperature,
  profile,
  argoProfile,
  argoLoading,
  loading,
  onDepthChange,
}: LocationPanelProps) {
  const [hoverDepth, setHoverDepth] = useState<number | null>(null);

  const levels = useMemo(
    () => (profile ? validLevels(profile.depths_m, profile.temperature_degC) : []),
    [profile],
  );

  const cooling = useMemo(() => steepestCooling(levels), [levels]);

  if (!location) {
    return (
      <div className="location-panel ex-empty">
        <KolamTarget />
        <h2 className="ex-empty__title">Pick a point on the map</h2>
        <p className="ex-empty__body">
          Click anywhere in the Bay of Bengal to see its temperature at
          every depth, and how it compares with the nearest Argo float.
        </p>
      </div>
    );
  }

  const season = seasonFor(date);

  /*
   * The first profile value corresponds to the model's shallowest
   * target depth (normally 0 m). It is ANTARBODH's reconstruction,
   * NOT the raw SST observation.
   */
  const surface = levels[0] ?? null;

  const observations = argoProfile?.available ? argoProfile.observations ?? [] : [];

  const nearestArgo = observations.length
    ? observations.reduce((best, obs) =>
        Math.abs(obs.depth_m_approx - depth) < Math.abs(best.depth_m_approx - depth) ? obs : best,
      )
    : null;

  const difference =
    nearestArgo && temperature !== null ? temperature - nearestArgo.temperature_degC : null;

  return (
    <div className="location-panel ex-inspect">
      <header className="ex-inspect__head">
        <p className="kicker" lang="hi">
          चयनित बिंदु
        </p>
        <h2 className="ex-inspect__place">
          {formatCoordinate(location.lat, 'lat')}, {formatCoordinate(location.lon, 'lon')}
        </h2>
        <p className="ex-inspect__when">
          {formatDay(date)} · {season.name}
        </p>
      </header>

      <div className="ex-reading">
        <div>
          <p className="ex-reading__label">At {depth} m</p>
          <p className="ex-reading__value">
            {temperature !== null && (
              <span
                aria-hidden="true"
                className="ex-swatch ex-swatch--lg"
                style={{ background: mapTemperatureColor(temperature) }}
              />
            )}
            {loading && temperature === null ? '…' : fmt(temperature)}
            <span className="nl-unit"> °C</span>
          </p>
        </div>

        {depth !== 0 && surface && (
          <div className="ex-reading__side">
            <p className="ex-reading__label">Surface</p>
            <p className="ex-reading__small">
              {fmt(surface.temp)}
              <span className="nl-unit"> °C</span>
            </p>
          </div>
        )}
      </div>

      <section className="ex-block">
        <h3 className="ex-block__title">
          Vertical profile
          {onDepthChange && <span>Click a level to map it</span>}
        </h3>

        {loading ? (
          <div className="ex-state">
            <span className="spinner" aria-hidden="true" />
            Loading profile
          </div>
        ) : levels.length >= 2 ? (
          <ProfileChart
            levels={levels}
            cooling={cooling}
            activeDepth={hoverDepth ?? depth}
            onActiveDepthChange={setHoverDepth}
            colorFor={mapTemperatureColor}
            onDepthClick={onDepthChange}
          />
        ) : (
          <div className="ex-state">Profile unavailable for this point.</div>
        )}

        <p className="ex-note">
          All values are Antarbodh reconstructions, including 0 m; that
          is not the raw satellite sea surface temperature.
        </p>
      </section>

      <section className="ex-block">
        <h3 className="ex-block__title">
          Independent check
          <span>Argo float</span>
        </h3>

        {argoLoading ? (
          <div className="ex-state">
            <span className="spinner" aria-hidden="true" />
            Searching Argo observations
          </div>
        ) : nearestArgo ? (
          <>
            <div className="ex-compare">
              <div>
                <p className="ex-compare__who">Antarbodh</p>
                <p className="ex-compare__value">{fmt(temperature)}°</p>
                <p className="ex-compare__at">{depth} m</p>
              </div>

              <div className="ex-compare__delta" title="Antarbodh minus Argo">
                {difference === null
                  ? '—'
                  : `${difference > 0 ? '+' : difference < 0 ? '−' : ''}${Math.abs(difference).toFixed(2)}°`}
                <span>difference</span>
              </div>

              <div className="ex-compare__argo">
                <p className="ex-compare__who">Argo</p>
                <p className="ex-compare__value">{fmt(nearestArgo.temperature_degC)}°</p>
                <p className="ex-compare__at">~{nearestArgo.depth_m_approx.toFixed(0)} m</p>
              </div>
            </div>

            <dl className="ex-meta">
              <div>
                <dt>Distance</dt>
                <dd>
                  {argoProfile?.distance_km !== undefined
                    ? `${argoProfile.distance_km.toFixed(0)} km`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Observed</dt>
                <dd>
                  {argoProfile?.date_observed
                    ? formatDay(argoProfile.date_observed.slice(0, 10))
                    : '—'}
                </dd>
              </div>
            </dl>

            <p className="ex-note">
              Argo quality-controlled (QC 1) temperature, adjusted values
              preferred. Argo is never a model input.
            </p>
          </>
        ) : (
          <p className="ex-state ex-state--left">
            {argoProfile?.available
              ? 'The matched Argo profile has no valid temperatures.'
              : argoProfile?.reason ?? 'No nearby Argo observation.'}
          </p>
        )}
      </section>

      <dl className="ex-meta ex-meta--foot">
        <div>
          <dt>Source</dt>
          <dd>Antarbodh CNN v1</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>Historical, cached</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>2025</dd>
        </div>
        <div>
          <dt>Validation</dt>
          <dd>Argo, independent</dd>
        </div>
      </dl>
    </div>
  );
}
