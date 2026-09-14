import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { formatDate } from '../../utils/formatting';

interface TimelineNavigatorProps {
  dates: string[];
  selectedDate: string;
  onDateSelected: (date: string) => void;
  isLoading: boolean;
}

export function TimelineNavigator({ dates, selectedDate, onDateSelected, isLoading }: TimelineNavigatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Prop index is the source of truth from the parent
  const propIdx = Math.max(0, dates.indexOf(selectedDate));
  
  // Local index allows smooth scrubbing without triggering API requests immediately
  const [localIdx, setLocalIdx] = useState(propIdx);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Sync local index when parent prop changes, UNLESS we are currently dragging the scrubber
  useEffect(() => {
    if (!isScrubbing) {
      setLocalIdx(propIdx);
    }
  }, [propIdx, isScrubbing]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsScrubbing(true);
    setLocalIdx(parseInt(e.target.value, 10));
  };

  const handleSliderCommit = () => {
    setIsScrubbing(false);
    if (dates[localIdx] !== selectedDate) {
      onDateSelected(dates[localIdx]);
    }
  };

  // Playback Step
  const step = (dir: number) => {
    const nextIdx = propIdx + dir;
    if (nextIdx >= 0 && nextIdx < dates.length) {
      onDateSelected(dates[nextIdx]);
    } else {
      setIsPlaying(false);
    }
  };

  // Playback Loop
  const propIdxRef = useRef(propIdx);
  useEffect(() => {
    propIdxRef.current = propIdx;
  }, [propIdx]);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        const nextIdx = propIdxRef.current + 1;
        if (nextIdx < dates.length) {
          onDateSelected(dates[nextIdx]);
        } else {
          setIsPlaying(false);
        }
      }, 600); // 600ms allows time for API + raster projection
    }
    return () => clearInterval(interval);
  }, [isPlaying, dates.length, onDateSelected]);

  if (dates.length === 0) return null;

  const displayDate = dates[localIdx] || selectedDate;

  // Generate a few ticks for context
  const ticks = dates.map((d, i) => {
    const dt = new Date(d);
    // Simple logic for quarterly ticks (Jan, Apr, Jul, Oct)
    if (dt.getDate() === 1 && (dt.getMonth() % 3 === 0)) {
      return { idx: i, label: dt.toLocaleDateString('en-GB', { month: 'short' }) };
    }
    return null;
  }).filter(t => t !== null) as {idx: number, label: string}[];

  return (
    <div className="panel" style={{ 
      position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      width: '90%', maxWidth: '800px', display: 'flex', alignItems: 'center', padding: '12px 24px', gap: '24px'
    }}>
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button className="btn" onClick={() => step(-1)} title="Previous">
          <SkipBack size={16} />
        </button>
        <button className="btn" onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button className="btn" onClick={() => step(1)} title="Next">
          <SkipForward size={16} />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', height: '36px', display: 'flex', alignItems: 'center' }}>
        <input 
          type="range"
          min={0}
          max={dates.length - 1}
          value={localIdx}
          onChange={handleSliderChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          style={{ width: '100%', cursor: 'pointer', zIndex: 2 }}
        />
        
        {/* Ticks */}
        <div style={{ position: 'absolute', top: '24px', width: '100%', display: 'flex', pointerEvents: 'none' }}>
          {ticks.map((t, i) => (
            <div key={i} style={{ 
              position: 'absolute', 
              left: `${(t.idx / (dates.length - 1)) * 100}%`,
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: 'var(--text-muted)'
            }}>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '120px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
          {formatDate(displayDate)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', height: '16px' }}>
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="spinner" style={{ width: '10px', height: '10px', border: '1px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Updating...
            </span>
          ) : 'Ready'}
        </div>
      </div>
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
