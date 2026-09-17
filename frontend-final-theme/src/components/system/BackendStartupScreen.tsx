import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react';
import { AntarbodhMark } from '../branding/AntarbodhMark';

export type BackendStatus =
  | 'connecting'
  | 'waking'
  | 'loading-model'
  | 'ready'
  | 'error';

interface BackendStartupScreenProps {
  status: BackendStatus;
  error?: string | null;
  onRetry?: () => void;
}

const STATUS_COPY: Record<
  Exclude<BackendStatus, 'ready' | 'error'>,
  { title: string; detail: string }
> = {
  connecting: {
    title: 'Connecting to inference service',
    detail: 'Checking the ANTARBODH backend health endpoint.',
  },
  waking: {
    title: 'Waking inference service',
    detail:
      'The backend is starting after being idle. This can take up to about a minute on the free Render service.',
  },
  'loading-model': {
    title: 'Loading reconstruction model',
    detail:
      'The API is online, but the ANTARBODH model is still becoming ready.',
  },
};

export function BackendStartupScreen({
  status,
  error,
  onRetry,
}: BackendStartupScreenProps) {
  const isError = status === 'error';
  const copy = !isError && status !== 'ready' ? STATUS_COPY[status] : null;

  return (
    <div className="backend-startup-screen" role={isError ? 'alert' : 'status'} aria-live="polite">
      <div className="backend-startup-shell">
        <div className="backend-startup-brand">
          <AntarbodhMark size={46} />
          <div>
            <div className="backend-startup-wordmark">ANTARBODH</div>
            <div className="backend-startup-kicker">OCEAN EMBEDDING ENGINE</div>
          </div>
        </div>

        <div className="backend-startup-divider" />

        {!isError ? (
          <>
            <div className="backend-startup-icon">
              <LoaderCircle size={34} strokeWidth={1.5} aria-hidden="true" />
            </div>

            <div className="backend-startup-title">{copy?.title}</div>
            <div className="backend-startup-detail">{copy?.detail}</div>

            <div className="backend-startup-progress" aria-hidden="true">
              <span />
            </div>

            <div className="backend-startup-steps">
              <StartupStep
                label="API endpoint"
                state={status === 'connecting' ? 'active' : 'complete'}
              />
              <StartupStep
                label="Inference service"
                state={
                  status === 'connecting'
                    ? 'pending'
                    : status === 'waking'
                      ? 'active'
                      : 'complete'
                }
              />
              <StartupStep
                label="Reconstruction model"
                state={
                  status === 'loading-model'
                    ? 'active'
                    : 'pending'
                }
              />
            </div>

            <div className="backend-startup-note">
              The application will open automatically when the inference service is ready.
            </div>
          </>
        ) : (
          <>
            <div className="backend-startup-icon backend-startup-icon--error">
              <AlertTriangle size={34} strokeWidth={1.5} aria-hidden="true" />
            </div>

            <div className="backend-startup-title">Inference service unavailable</div>
            <div className="backend-startup-detail">
              {error ||
                'The ANTARBODH backend could not be reached. Check the API URL and Render service status.'}
            </div>

            {onRetry && (
              <button type="button" className="backend-startup-retry" onClick={onRetry}>
                <RefreshCw size={15} aria-hidden="true" />
                Retry connection
              </button>
            )}

            <div className="backend-startup-note">
              No application data or prediction request is sent until the backend health check succeeds.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StartupStep({
  label,
  state,
}: {
  label: string;
  state: 'pending' | 'active' | 'complete';
}) {
  return (
    <div className={`backend-startup-step backend-startup-step--${state}`}>
      {state === 'complete' ? (
        <CheckCircle2 size={14} aria-hidden="true" />
      ) : state === 'active' ? (
        <LoaderCircle
          size={14}
          className="backend-startup-step__spinner"
          aria-hidden="true"
        />
      ) : (
        <span className="backend-startup-step__dot" aria-hidden="true" />
      )}
      <span>{label}</span>
    </div>
  );
}
