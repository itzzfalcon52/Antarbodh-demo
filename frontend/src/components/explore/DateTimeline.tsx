import { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

interface DateTimelineProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onDateChange: (date: string) => void;
}

export function DateTimeline({ selectedDate, onDateChange }: DateTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playInterval = useRef<number | null>(null);

  const start = new Date('2025-01-01T00:00:00Z');
  const end = new Date('2025-12-31T00:00:00Z');
  const current = new Date(`${selectedDate}T00:00:00Z`);

  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const currentDays = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const progress = Math.max(0, Math.min(100, (currentDays / totalDays) * 100));

  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
  };

  const advanceDay = (days: number) => {
    const d = new Date(`${selectedDate}T00:00:00Z`);
    d.setDate(d.getDate() + days);
    if (d > end) {
      setIsPlaying(false);
      onDateChange('2025-12-31');
    } else if (d < start) {
      onDateChange('2025-01-01');
    } else {
      onDateChange(d.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      playInterval.current = window.setInterval(() => advanceDay(1), 350);
    } else if (playInterval.current !== null) {
      window.clearInterval(playInterval.current);
    }
    return () => {
      if (playInterval.current !== null) window.clearInterval(playInterval.current);
    };
  }, [isPlaying]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <IconButton onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </IconButton>
          <IconButton onClick={() => advanceDay(-1)}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton onClick={() => advanceDay(1)}>
            <ChevronRight size={18} />
          </IconButton>
        </div>
        <div className="data-numeric" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
          {formatDateLabel(current)}
        </div>
      </div>
      
      <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
        {/* Track */}
        <div style={{ position: 'absolute', width: '100%', height: '4px', backgroundColor: 'var(--color-ink)', borderRadius: '2px', border: '1px solid var(--color-border)' }} />
        {/* Progress */}
        <div style={{ position: 'absolute', width: `${progress}%`, height: '4px', backgroundColor: 'var(--color-ocean)', borderRadius: '2px' }} />
        {/* Thumb */}
        <div style={{ position: 'absolute', left: `calc(${progress}% - 6px)`, width: '12px', height: '12px', backgroundColor: 'var(--color-text)', borderRadius: '50%', boxShadow: '0 0 4px rgba(0,0,0,0.5)', cursor: 'pointer' }} />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)', fontSize: '0.65rem', color: 'var(--color-text-subtle)', letterSpacing: '0.05em' }}>
        <span>JAN</span>
        <span>MAR</span>
        <span>MAY</span>
        <span>JUL</span>
        <span>SEP</span>
        <span>NOV</span>
      </div>
    </div>
  );
}
