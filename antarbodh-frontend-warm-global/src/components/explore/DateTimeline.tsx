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
import { SEASONS, formatDay, seasonFor } from '../../lib/seasons';


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
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * A position along the scrubber that lines up with the native range
 * thumb: the thumb's centre travels from one thumb-radius in from the
 * left edge to one radius in from the right, not from 0% to 100%.
 */
const along = (fraction: number) =>
  `calc(var(--thumb-r) + (100% - 2 * var(--thumb-r)) * ${fraction})`;


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
      : currentIndex / totalDays;


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
          fraction:
            totalDays === 0
              ? 0
              : index / totalDays,
        };
      }),
    [totalDays],
  );


  // IMD season bands, placed on the same calendar.
  const seasonSpans = useMemo(
    () =>
      SEASONS.map((season, i) => {
        const start = dateToIndex(
          `2025-${String(season.from).padStart(2, '0')}-01`,
        );
        const next = SEASONS[i + 1];
        const end = next
          ? dateToIndex(`2025-${String(next.from).padStart(2, '0')}-01`)
          : totalDays;

        return {
          id: season.id,
          name: season.name,
          start: totalDays === 0 ? 0 : start / totalDays,
          end: totalDays === 0 ? 0 : end / totalDays,
        };
      }),
    [totalDays],
  );

  const season = seasonFor(selectedDate);


  return (
    <div className="timeline">

      {/* Transport controls */}
      <div className="timeline__transport">
        <IconButton
          size="lg"
          className="timeline__play"
          data-playing={isPlaying}
          disabled={disabled}
          aria-label={
            isPlaying
              ? 'Pause playback'
              : 'Play through the year'
          }
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


      {/* Scrubber: seasons above, the rail, months below. Every
          layer uses along() so it lines up with the thumb. */}
      <div className="timeline__scrubber">
        <div
          aria-hidden="true"
          className="timeline__seasons"
        >
          {seasonSpans.map(({ id, name, start, end }) => (
            <span
              key={id}
              className="timeline__season"
              data-season={id}
              data-current={id === season.id}
              style={{
                left: along(start),
                width: `calc((100% - 2 * var(--thumb-r)) * ${end - start})`,
              }}
            >
              <span className="timeline__season-name">{name}</span>
            </span>
          ))}
        </div>

        <div className="timeline__rail">
          <div
            aria-hidden="true"
            className="timeline__track"
          />

          <div
            aria-hidden="true"
            className="timeline__fill"
            style={{
              width: `calc((100% - 2 * var(--thumb-r)) * ${progress})`,
            }}
          />

          <div
            aria-hidden="true"
            className="timeline__ticks"
          >
            {monthOffsets.map(({ label, fraction }) => (
              <span
                key={label}
                className="timeline__tick"
                style={{ left: along(fraction) }}
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
          />
        </div>

        {/* Month labels */}
        <div
          aria-hidden="true"
          className="timeline__months"
        >
          {monthOffsets.map(({ label, fraction }) => (
            <span
              key={label}
              className="timeline__month"
              style={{ left: along(fraction) }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>


      {/* Date readout */}
      <div className="timeline__readout">
        <span className="timeline__date">
          {formatDay(selectedDate)}
        </span>

        <span className="timeline__meta">
          Day {currentIndex + 1} · {season.name}
        </span>
      </div>
    </div>
  );
}
