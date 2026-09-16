import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { IconButton } from '../ui/IconButton';


interface DateTimelineProps {
  selectedDate: string;
  onDateChange: (date: string) => void;

  disabled?: boolean;
}


const START_DATE = '2025-01-01';
const END_DATE = '2025-12-31';


function dateToIndex(date: string): number {
  const start = new Date(
    `${START_DATE}T00:00:00Z`,
  );

  const current = new Date(
    `${date}T00:00:00Z`,
  );

  return Math.round(
    (
      current.getTime() -
      start.getTime()
    ) /
    (1000 * 60 * 60 * 24),
  );
}


function indexToDate(index: number): string {
  const start = new Date(
    `${START_DATE}T00:00:00Z`,
  );

  start.setUTCDate(
    start.getUTCDate() + index,
  );

  return start
    .toISOString()
    .split('T')[0];
}


function formatDateLabel(date: string): string {
  const value = new Date(
    `${date}T00:00:00Z`,
  );

  return value
    .toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      },
    )
    .toUpperCase();
}


export function DateTimeline({
  selectedDate,
  onDateChange,
  disabled = false,
}: DateTimelineProps) {
  const [isPlaying, setIsPlaying] =
    useState(false);

  const playInterval =
    useRef<number | null>(null);


  const totalDays = useMemo(() => {
    const start = new Date(
      `${START_DATE}T00:00:00Z`,
    );

    const end = new Date(
      `${END_DATE}T00:00:00Z`,
    );

    return Math.round(
      (
        end.getTime() -
        start.getTime()
      ) /
      (1000 * 60 * 60 * 24),
    );
  }, []);


  const currentIndex = Math.max(
    0,
    Math.min(
      totalDays,
      dateToIndex(selectedDate),
    ),
  );


  const stopPlaying = () => {
    setIsPlaying(false);

    if (
      playInterval.current !== null
    ) {
      window.clearInterval(
        playInterval.current,
      );

      playInterval.current = null;
    }
  };


  const advanceDay = (
    direction: number,
  ) => {
    const nextIndex =
      currentIndex + direction;

    if (nextIndex >= totalDays) {
      onDateChange(END_DATE);

      if (direction > 0) {
        stopPlaying();
      }

      return;
    }

    if (nextIndex <= 0) {
      onDateChange(START_DATE);
      return;
    }

    onDateChange(
      indexToDate(nextIndex),
    );
  };


  useEffect(() => {
    if (
      !isPlaying ||
      disabled
    ) {
      return;
    }

    playInterval.current =
      window.setInterval(() => {
        const nextIndex =
          dateToIndex(selectedDate) + 1;

        if (nextIndex >= totalDays) {
          onDateChange(END_DATE);
          stopPlaying();
          return;
        }

        onDateChange(
          indexToDate(nextIndex),
        );
      }, 350);


    return () => {
      if (
        playInterval.current !== null
      ) {
        window.clearInterval(
          playInterval.current,
        );

        playInterval.current = null;
      }
    };
  }, [
    isPlaying,
    selectedDate,
    totalDays,
    disabled,
  ]);


  useEffect(() => {
    if (disabled) {
      stopPlaying();
    }
  }, [disabled]);


  const handleSliderChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const index =
      Number(event.target.value);

    if (!Number.isFinite(index)) {
      return;
    }

    onDateChange(
      indexToDate(
        Math.max(
          0,
          Math.min(totalDays, index),
        ),
      ),
    );
  };


  const progress =
    totalDays === 0
      ? 0
      : (currentIndex / totalDays) * 100;


  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >

      {/* Controls + date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom:
            'var(--space-2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <IconButton
            disabled={disabled}
            onClick={() => {
              if (isPlaying) {
                stopPlaying();
              } else {
                setIsPlaying(true);
              }
            }}
          >
            {isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} />
            )}
          </IconButton>

          <IconButton
            disabled={
              disabled ||
              currentIndex === 0
            }
            onClick={() =>
              advanceDay(-1)
            }
          >
            <ChevronLeft size={18} />
          </IconButton>

          <IconButton
            disabled={
              disabled ||
              currentIndex === totalDays
            }
            onClick={() =>
              advanceDay(1)
            }
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>


        <div
          className="data-numeric"
          style={{
            fontSize: '1.25rem',
            color:
              'var(--color-text)',
          }}
        >
          {formatDateLabel(
            selectedDate,
          )}
        </div>
      </div>


      {/* Native timeline slider */}
      <div
        style={{
          position: 'relative',
          width: '100%',
        }}
      >
        <input
          type="range"
          min={0}
          max={totalDays}
          step={1}
          value={currentIndex}
          disabled={disabled}
          onChange={
            handleSliderChange
          }
          aria-label="Historical date"
          aria-valuemin={0}
          aria-valuemax={totalDays}
          aria-valuenow={currentIndex}
          style={{
            width: '100%',
            height: '24px',
            margin: 0,
            cursor: disabled
              ? 'not-allowed'
              : 'pointer',
            accentColor:
              'var(--color-ocean)',
          }}
        />

        {/* Progress indicator */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            width: `${progress}%`,
            height: '3px',
            transform:
              'translateY(-50%)',
            backgroundColor:
              'var(--color-ocean)',
            borderRadius: '2px',
            pointerEvents:
              'none',
            zIndex: 0,
          }}
        />
      </div>


      {/* Month labels */}
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          marginTop:
            'var(--space-1)',
          fontSize: '0.65rem',
          color:
            'var(--color-text-subtle)',
          letterSpacing: '0.05em',
        }}
      >
        <span>JAN</span>
        <span>MAR</span>
        <span>MAY</span>
        <span>JUL</span>
        <span>SEP</span>
        <span>NOV</span>
        <span>DEC</span>
      </div>
    </div>
  );
}