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

// Label positions along the year, expressed as a fraction.
// Presentation only — not used in any date computation.
const MONTH_LABELS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];


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


  // Month tick offsets derived from the same calendar the
  // scrubber uses, so labels stay aligned with the data.
  const monthOffsets = useMemo(
    () =>
      MONTH_LABELS.map((label, month) => {
        const index = dateToIndex(
          `2025-${String(month + 1).padStart(2, '0')}-01`,
        );

        return {
          label,
          percent:
            totalDays === 0
              ? 0
              : (index / totalDays) * 100,
        };
      }),
    [totalDays],
  );


  return (
    <div className="timeline">

      {/* Transport controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          flexShrink: 0,
        }}
      >
        <IconButton
          disabled={disabled}
          aria-label={
            isPlaying
              ? 'Pause playback'
              : 'Play through the year'
          }
          style={{
            color: isPlaying
              ? 'var(--color-ocean-bright)'
              : undefined,
          }}
          onClick={() => {
            if (isPlaying) {
              stopPlaying();
            } else {
              setIsPlaying(true);
            }
          }}
        >
          {isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
        </IconButton>

        <IconButton
          disabled={
            disabled ||
            currentIndex === 0
          }
          aria-label="Previous day"
          onClick={() =>
            advanceDay(-1)
          }
        >
          <ChevronLeft size={16} />
        </IconButton>

        <IconButton
          disabled={
            disabled ||
            currentIndex === totalDays
          }
          aria-label="Next day"
          onClick={() =>
            advanceDay(1)
          }
        >
          <ChevronRight size={16} />
        </IconButton>
      </div>


      {/* Scrubber */}
      <div className="timeline__scrubber">
        <div
          aria-hidden="true"
          className="timeline__track"
        />

        <div
          aria-hidden="true"
          className="timeline__fill"
          style={{ width: `${progress}%` }}
        />

        <div
          aria-hidden="true"
          className="timeline__ticks"
        >
          {monthOffsets.map(({ label, percent }) => (
            <span
              key={label}
              className="timeline__tick"
              style={{ left: `${percent}%` }}
            />
          ))}
        </div>

        <input
          type="range"
          className="timeline-range"
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
          aria-valuetext={formatDateLabel(selectedDate)}
          style={{
            width: '100%',
            margin: 0,
            cursor: disabled
              ? 'not-allowed'
              : 'pointer',
          }}
        />

        {/* Month labels */}
        <div
          aria-hidden="true"
          className="timeline__months"
        >
          {monthOffsets.map(({ label, percent }) => (
            <span
              key={label}
              className="timeline__month"
              style={{ left: `${percent}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>


      {/* Date readout */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '1px',
          flexShrink: 0,
          minWidth: '148px',
        }}
      >
        <span
          className="label-scientific"
          style={{ fontSize: '0.5625rem' }}
        >
          Ocean state
        </span>

        <span
          className="data-numeric"
          style={{
            fontSize: '1.02rem',
            letterSpacing: '0.01em',
            color: 'var(--color-text)',
          }}
        >
          {formatDateLabel(
            selectedDate,
          )}
        </span>
      </div>
    </div>
  );
}
