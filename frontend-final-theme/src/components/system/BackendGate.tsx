import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '../../api/endpoints';
import {
  BackendStartupScreen,
  type BackendStatus,
} from './BackendStartupScreen';

interface BackendGateProps {
  children: ReactNode;
}

const INITIAL_REQUEST_TIMEOUT = 75000;
const RETRY_REQUEST_TIMEOUT = 8000;
const POLL_INTERVAL = 4000;

export function BackendGate({ children }: BackendGateProps) {
  const [status, setStatus] = useState<BackendStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const checkBackend = useCallback(
    async (signal: AbortSignal) => {
      try {
        const health = await api.getHealth(
          retryKey === 0 ? INITIAL_REQUEST_TIMEOUT : RETRY_REQUEST_TIMEOUT,
          signal,
        );

        setError(null);

        if (!health.api_online) {
          setStatus('waking');
          return false;
        }

        if (!health.model_ready) {
          setStatus('loading-model');
          return false;
        }

        setStatus('ready');
        return true;
      } catch (err) {
        if (signal.aborted) {
          return false;
        }

        setStatus('waking');
        setError(
          err instanceof Error
            ? err.message
            : 'Waiting for the ANTARBODH backend to respond.',
        );
        return false;
      }
    },
    [retryKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      const ready = await checkBackend(controller.signal);

      if (ready || stopped || controller.signal.aborted) return;

      timer = window.setTimeout(poll, POLL_INTERVAL);
    };

    void poll();

    return () => {
      stopped = true;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [checkBackend]);

  if (status !== 'ready') {
    return (
      <BackendStartupScreen
        status={status}
        error={error}
        onRetry={() => {
          setError(null);
          setStatus('connecting');
          setRetryKey((value) => value + 1);
        }}
      />
    );
  }

  return <>{children}</>;
}
