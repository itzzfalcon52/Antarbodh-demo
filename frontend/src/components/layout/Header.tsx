import { useEffect, useState } from 'react';
import { AntarbodhMark } from '../branding/AntarbodhMark';
import { PrimaryNavigation } from '../navigation/PrimaryNavigation';
import { api } from '../../api/endpoints';

export function Header() {
  const [apiStatus, setApiStatus] = useState<'pending' | 'connected' | 'offline'>('pending');

  useEffect(() => {
    api.getHealth()
      .then(() => setApiStatus('connected'))
      .catch(() => setApiStatus('offline'));
  }, []);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '72px',
      padding: '0 var(--space-6)',
      backgroundColor: 'var(--color-deep)',
      borderBottom: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <AntarbodhMark />
          <div>
            <div style={{ fontWeight: 600, letterSpacing: '0.05em' }}>ANTARBODH</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Subsurface Ocean Intelligence
            </div>
          </div>
        </div>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }} />
        
        <PrimaryNavigation />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ textAlign: 'right' }}>
          <div className="label-scientific" style={{ fontSize: '0.65rem' }}>CNN v1</div>
          <div className="label-scientific" style={{ color: 'var(--color-text)' }}>2025</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
          <span>API</span>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: apiStatus === 'connected' ? 'var(--color-teal)' : (apiStatus === 'offline' ? 'var(--color-danger)' : 'var(--color-warning)')
          }} />
          <span style={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
            {apiStatus}
          </span>
        </div>
      </div>
    </header>
  );
}
