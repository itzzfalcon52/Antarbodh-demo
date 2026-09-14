import { useState, useRef, useEffect } from 'react';
import { Target } from 'lucide-react';
import type { Domain } from '../../types/api';

interface CoordinateInputProps {
  domain: Domain;
  onLocationSubmit: (loc: { lat: number; lon: number }) => void;
}

export function CoordinateInput({ domain, onLocationSubmit }: CoordinateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    if (isNaN(latNum) || isNaN(lonNum)) {
      setError('Invalid numeric input.');
      return;
    }
    
    if (latNum < -90 || latNum > 90) {
      setError('Latitude must be between -90° and +90°.');
      return;
    }
    if (lonNum < -180 || lonNum > 180) {
      setError('Longitude must be between -180° and +180°.');
      return;
    }
    
    // Check dataset bounds explicitly
    if (latNum < domain.lat_min || latNum > domain.lat_max || lonNum < domain.lon_min || lonNum > domain.lon_max) {
      setError(`No data available outside Bay of Bengal (${domain.lat_min}-${domain.lat_max}°N, ${domain.lon_min}-${domain.lon_max}°E).`);
      return;
    }
    
    onLocationSubmit({ lat: latNum, lon: lonNum });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: '80px', right: '24px' }}>
      <button className="btn panel" onClick={() => setIsOpen(!isOpen)}>
        <Target size={16} className="text-secondary" /> 
        <span>Go to Location</span>
      </button>

      {isOpen && (
        <div className="panel" style={{ 
          marginTop: '8px', padding: '16px', width: '260px', 
          display: 'flex', flexDirection: 'column', gap: '16px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Coordinate Search</h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Latitude (°N)</label>
                <input 
                  type="text" 
                  className="input" 
                  value={lat} 
                  onChange={(e) => setLat(e.target.value)} 
                  placeholder="15.00"
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Longitude (°E)</label>
                <input 
                  type="text" 
                  className="input" 
                  value={lon} 
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="90.00"
                />
              </div>
            </div>
            
            <button type="submit" className="btn" style={{ background: 'var(--accent-primary)', color: '#000', border: 'none' }}>
              Search Location
            </button>
            
            {error && (
              <div style={{ fontSize: '11px', color: 'var(--accent-error)', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '4px' }}>
                {error}
              </div>
            )}
          </form>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
