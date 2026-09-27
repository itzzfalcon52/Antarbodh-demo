import { useMemo } from 'react';
import { Download } from 'lucide-react';

import type { PredictionProfileResponse } from '../../types/api';
import { Button } from '../ui/Button';
import { PredictionProfilePanel } from './PredictionProfilePanel';
import {
  formatDepth,
  steepestCooling,
  toCsv,
  validLevels,
} from '../../lib/profileStats';

import '../../styles/predict-result.css';

interface PredictionResultProps {
  profile: PredictionProfileResponse;
  formattedDate: string;
}

const coord = (value: number, pos: string, neg: string) =>
  `${Math.abs(value).toFixed(2)}°${value >= 0 ? pos : neg}`;

export function PredictionResult({ profile, formattedDate }: PredictionResultProps) {
  const levels = useMemo(
    () => validLevels(profile.depths_m, profile.temperature_degC),
    [profile],
  );

  const cooling = useMemo(() => steepestCooling(levels), [levels]);

  const surface = levels[0];
  const deepest = levels[levels.length - 1];
  const missing = profile.depths_m.length - levels.length;

  const place = `${coord(profile.latitude, 'N', 'S')}, ${coord(profile.longitude, 'E', 'W')}`;

  const snapped =
    Math.abs(profile.requested_latitude - profile.latitude) > 1e-6 ||
    Math.abs(profile.requested_longitude - profile.longitude) > 1e-6;

  const handleDownload = () => {
    const csv = toCsv(levels, {
      source: 'ANTARBODH on-demand reconstruction',
      model: profile.model_id,
      date: profile.date,
      latitude: profile.latitude,
      longitude: profile.longitude,
    });

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `antarbodh_${profile.date}_${profile.latitude.toFixed(2)}N_${profile.longitude.toFixed(2)}E.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!surface || !deepest || levels.length < 2) {
    return (
      <div className="predict-empty-state">
        <div className="predict-state-title">No usable levels returned</div>
        <div className="predict-state-description">
          The model responded, but fewer than two depths had a valid
          temperature, so there is no profile to draw for this point.
        </div>
      </div>
    );
  }

  return (
    <div className="pr">
      <header className="pr-head">
        <div>
          <div className="label-scientific">Reconstructed temperature profile</div>
          <h2 className="pr-place">{place}</h2>
          <p className="pr-meta">
            <span className="data-numeric">{formattedDate}</span>
            {snapped && (
              <span>
                Nearest grid cell to{' '}
                {coord(profile.requested_latitude, 'N', 'S')},{' '}
                {coord(profile.requested_longitude, 'E', 'W')}
              </span>
            )}
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleDownload} className="pr-download">
          <Download size={14} aria-hidden="true" />
          Download CSV
        </Button>
      </header>

      <dl className="pr-readings">
        <div>
          <dt>Surface</dt>
          <dd>
            <span className="pr-reading">
              {surface.temp.toFixed(2)}
              <span className="pr-unit"> °C</span>
            </span>
            <span className="pr-reading-note">at {formatDepth(surface.depth)}</span>
          </dd>
        </div>

        <div className="pr-readings__key">
          <dt>Steepest cooling</dt>
          <dd>
            {cooling ? (
              <>
                <span className="pr-reading">
                  {cooling.from.depth}–{formatDepth(cooling.to.depth)}
                </span>
                <span className="pr-reading-note">
                  −{cooling.dropPer10m.toFixed(2)} °C per 10 m
                </span>
              </>
            ) : (
              <>
                <span className="pr-reading">None</span>
                <span className="pr-reading-note">
                  temperature never falls with depth
                </span>
              </>
            )}
          </dd>
        </div>

        <div>
          <dt>Deepest level</dt>
          <dd>
            <span className="pr-reading">
              {deepest.temp.toFixed(2)}
              <span className="pr-unit"> °C</span>
            </span>
            <span className="pr-reading-note">at {formatDepth(deepest.depth)}</span>
          </dd>
        </div>

        <div>
          <dt>Surface to deepest</dt>
          <dd>
            <span className="pr-reading">
              {deepest.temp - surface.temp < 0 ? '−' : '+'}
              {Math.abs(deepest.temp - surface.temp).toFixed(2)}
              <span className="pr-unit"> °C</span>
            </span>
            <span className="pr-reading-note">
              change over {formatDepth(deepest.depth - surface.depth)}
            </span>
          </dd>
        </div>
      </dl>

      <PredictionProfilePanel levels={levels} cooling={cooling} />

      <footer className="pr-foot">
        <p>
          Reconstructed by <span className="data-numeric">{profile.model_id}</span>{' '}
          from surface observations only. GLORYS was the training
          reference and Argo floats are used for validation; neither is
          an input here.
          {missing > 0 &&
            ` ${missing} of ${profile.depths_m.length} depths had no valid value and are left out.`}
        </p>
        <p>
          The depth axis is stretched near the surface (square-root
          scale) so the upper-ocean levels stay readable.
        </p>
      </footer>
    </div>
  );
}
