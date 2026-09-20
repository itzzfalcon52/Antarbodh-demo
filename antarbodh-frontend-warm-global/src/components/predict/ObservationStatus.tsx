import type { AvailabilityResponse } from '../../types/api';
import { Check, X, AlertTriangle } from 'lucide-react';

export function ObservationStatus({ availability }: { availability: AvailabilityResponse | null }) {
  if (!availability) return null;

  const getIcon = (available: boolean) => {
    return available ? <Check size={14} color="var(--color-teal)" /> : <X size={14} color="var(--color-danger)" />;
  };

  const isReady = availability.prediction_possible && availability.missing_inputs.length === 0;
  const isPartial = availability.prediction_possible && availability.missing_inputs.length > 0;

  return (
    <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', backgroundColor: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', border: `1px solid ${isReady ? 'var(--color-teal)' : isPartial ? 'var(--color-ocean)' : 'var(--color-danger)'}` }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {isReady && <Check size={18} color="var(--color-teal)" />}
        {isPartial && <AlertTriangle size={18} color="var(--color-ocean-bright)" />}
        {!availability.prediction_possible && <X size={18} color="var(--color-danger)" />}
        <span className="label-scientific" style={{ color: isReady ? 'var(--color-teal)' : isPartial ? 'var(--color-ocean-bright)' : 'var(--color-danger)', fontSize: '0.875rem' }}>
          {isReady ? 'OBSERVATIONS READY' : isPartial ? 'PARTIAL OBSERVATIONS' : 'PREDICTION UNAVAILABLE'}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        {Object.entries(availability.inputs).map(([key, status]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.875rem', color: status.available ? 'var(--color-text)' : 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)' }}>
              {key.toUpperCase()}
            </span>
            {getIcon(status.available)}
          </div>
        ))}
      </div>

      {!availability.prediction_possible && (
        <div style={{ marginTop: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
          {availability.reason}
        </div>
      )}
      {isPartial && (
        <div style={{ marginTop: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--color-text-subtle)' }}>
          ANTARBODH will proceed using missingness masks for: {availability.missing_inputs.join(', ')}.
        </div>
      )}
    </div>
  );
}
