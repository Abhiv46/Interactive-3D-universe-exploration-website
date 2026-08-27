import { useState, useRef, useEffect } from 'react';
import { useSimulationClock } from '@/hooks/useSimulationClock';
import { J2000_EPOCH, SECONDS_PER_DAY } from '@/engine/Constants';

interface DatePickerProps {
  /** Callback when date changes */
  onDateChange?: (date: Date) => void;
}

export function DatePicker({ onDateChange }: DatePickerProps) {
  const { julianDate, setJulianDate, speed, isRunning, toggle } = useSimulationClock();
  const [inputDate, setInputDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Convert Julian Date to JavaScript Date
  const julianToDate = (jd: number): Date => {
    const unixMs = (jd - 2440587.5) * 86400000;
    return new Date(unixMs);
  };

  // Convert JavaScript Date to Julian Date
  const dateToJulian = (date: Date): number => {
    const unixMs = date.getTime();
    return unixMs / 86400000 + 2440587.5;
  };

  // Sync input date with simulation time
  useEffect(() => {
    const date = julianToDate(julianDate);
    setInputDate(date);
    onDateChange?.(date);
  }, [julianDate, onDateChange]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      setInputDate(date);
      const jd = dateToJulian(date);
      setJulianDate(jd);
      onDateChange?.(date);
    }
  };

  // Handle calendar day click
  const handleDayClick = (day: number) => {
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    setInputDate(date);
    const jd = dateToJulian(date);
    setJulianDate(jd);
    onDateChange?.(date);
    setShowCalendar(false);
  };

  // Generate calendar days
  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: (number | null)[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(prevMonthDays - i);
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // Next month days to fill grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push(i);
    }

    return days;
  };

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preset dates
  const presets = [
    { label: 'Today', date: new Date() },
    { label: 'J2000 Epoch', date: julianToDate(J2000_EPOCH) },
    { label: 'Apollo 11 Landing', date: new Date('1969-07-20') },
    { label: 'Voyager 1 Launch', date: new Date('1977-09-05') },
    { label: 'JWST Launch', date: new Date('2021-12-25') },
  ];

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatMonthYear = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="date-picker" ref={wrapperRef}>
      <div className="date-picker-header">
        <label htmlFor="date-input" className="date-label">Simulation Date</label>
        <div className="date-input-wrapper">
          <input
            ref={inputRef}
            id="date-input"
            type="date"
            className="date-input"
            value={formatDate(inputDate)}
            onChange={handleInputChange}
            onClick={() => setShowCalendar(true)}
            readOnly
          />
          <button
            className="date-calendar-toggle"
            onClick={() => setShowCalendar(!showCalendar)}
            aria-label="Open calendar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar dropdown */}
      {showCalendar && (
        <div className="date-calendar">
          <div className="calendar-header">
            <button className="calendar-nav" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="calendar-title">{formatMonthYear(calendarMonth)}</span>
            <button className="calendar-nav" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <span key={day} className="weekday">{day}</span>
            ))}
          </div>

          <div className="calendar-days">
            {getCalendarDays().map((day, index) => (
              <button
                key={index}
                className={`calendar-day ${day === null ? 'other-month' : ''} ${day === inputDate.getDate() && calendarMonth.getMonth() === inputDate.getMonth() && calendarMonth.getFullYear() === inputDate.getFullYear() ? 'selected' : ''} ${day === new Date().getDate() && calendarMonth.getMonth() === new Date().getMonth() && calendarMonth.getFullYear() === new Date().getFullYear() ? 'today' : ''}`}
                onClick={() => day !== null && handleDayClick(day)}
                disabled={day === null}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preset dates */}
      <div className="date-presets">
        {presets.map((preset, index) => (
          <button
            key={index}
            className={`date-preset ${formatDate(preset.date) === formatDate(inputDate) ? 'active' : ''}`}
            onClick={() => {
              setInputDate(preset.date);
              const jd = dateToJulian(preset.date);
              setJulianDate(jd);
              onDateChange?.(preset.date);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Play/Pause and Speed indicator */}
      <div className="date-playback">
        <button
          className={`play-toggle ${isRunning ? 'playing' : ''}`}
          onClick={toggle}
          aria-label={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21" />
            </svg>
          )}
        </button>
        <span className="speed-display">{speed.toLocaleString()}×</span>
      </div>
    </div>
  );
}