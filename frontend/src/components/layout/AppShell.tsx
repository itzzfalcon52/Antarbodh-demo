import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Explore } from '../../pages/Explore';
import { ApiClient } from '../../api/client';

type View = 'explore' | 'validation' | 'methodology';

export function AppShell() {
  const [currentView, setCurrentView] = useState<View>('explore');
  const [status, setStatus] = useState<'online' | 'offline' | 'loading'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    
    // Simple health check polling
    const checkHealth = () => {
      ApiClient.checkHealth(controller.signal)
        .then(res => setStatus(res.status === 'ok' ? 'online' : 'offline'))
        .catch(() => setStatus('offline'));
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <Header 
        currentView={currentView}
        onViewChange={setCurrentView}
        status={status}
      />
      
      {currentView === 'explore' && <Explore />}
      
      {currentView === 'validation' && (
        <div style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 300, marginBottom: '24px' }}>Validation & Performance</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Validation metrics and evaluation against Argo floats will be displayed here.</p>
          </div>
        </div>
      )}
      
      {currentView === 'methodology' && (
        <div style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 300, marginBottom: '24px' }}>Scientific Methodology</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Model architecture, training pipeline, and data preprocessing details will be displayed here.</p>
          </div>
        </div>
      )}
    </>
  );
}
