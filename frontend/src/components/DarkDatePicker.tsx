import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

interface DarkDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DarkDatePicker({ value, onChange, placeholder = 'Select date & time' }: DarkDatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const parsed = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }, [value]);

  const [viewYear, setViewYear] = useState(() => parsed?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsed?.getMonth() ?? new Date().getMonth());
  const [hour, setHour] = useState(() => (parsed ? parsed.getHours() % 12 || 12 : 9));
  const [minute, setMinute] = useState(() => (parsed ? parsed.getMinutes() : 0));
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => (parsed && parsed.getHours() >= 12 ? 'PM' : 'AM'));
  const [pickMode, setPickMode] = useState<'day' | 'hour' | 'minute'>('day');

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupH = 380;
    const popupW = 310;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < popupH + 8;
    setPos({
      top: showAbove ? Math.max(8, rect.top - popupH - 6) : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 8)),
    });
  }, []);

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
      setHour(parsed.getHours() % 12 || 12);
      setMinute(parsed.getMinutes());
      setAmpm(parsed.getHours() >= 12 ? 'PM' : 'AM');
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => updatePos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePos]);

  // Outside click + Escape to dismiss.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (popupRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
      setPickMode('day');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setPickMode('day'); triggerRef.current?.focus(); }
    };
    const t = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const emitValue = (y: number, m: number, d: number, h: number, min: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    onChange(`${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}`);
  };

  const to24 = (h12: number, ap: 'AM' | 'PM') => (ap === 'PM' ? (h12 % 12) + 12 : h12 % 12);

  const selectDay = (day: number) => {
    emitValue(viewYear, viewMonth, day, to24(hour, ampm), minute);
    setPickMode('hour');
  };

  const selectMinute = (m: number) => {
    const day = parsed?.getDate() ?? new Date().getDate();
    emitValue(viewYear, viewMonth, day, to24(hour, ampm), m);
    setMinute(m);
    setOpen(false);
    setPickMode('day');
  };

  const toggleAmpm = () => {
    const next = ampm === 'AM' ? 'PM' : 'AM';
    setAmpm(next);
    const day = parsed?.getDate() ?? new Date().getDate();
    emitValue(viewYear, viewMonth, day, to24(hour, next), minute);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;

  const displayValue = useMemo(() => {
    if (!parsed) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const h12 = parsed.getHours() % 12 || 12;
    const ap = parsed.getHours() >= 12 ? 'PM' : 'AM';
    return `${MONTHS_SHORT[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}  ${h12}:${pad(parsed.getMinutes())} ${ap}`;
  }, [parsed]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="nx-datepicker-trigger"
        style={{ width: '100%' }}
        onClick={() => { setOpen(o => !o); setPickMode('day'); }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span style={{ color: displayValue ? 'var(--nx-text-1)' : 'var(--nx-text-3)' }}>
          {displayValue || placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--nx-text-3)', flexShrink: 0 }} aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
        </svg>
      </button>

      {open && (
        <div
          ref={popupRef}
          className="nx-datepicker-popup"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999 }}
          role="dialog"
          aria-label="Select date and time"
        >
          {pickMode === 'day' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 8px' }}>
                <button
                  type="button"
                  className="nx-datepicker-cell"
                  style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Previous month"
                  onClick={() => {
                    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
                    else setViewMonth(m => m - 1);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--nx-text-1)', letterSpacing: '0.02em' }}>
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  className="nx-datepicker-cell"
                  style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Next month"
                  onClick={() => {
                    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
                    else setViewMonth(m => m + 1);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 10px 4px' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--nx-text-3)', padding: '3px 0', letterSpacing: '0.05em' }}>
                    {d}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 10px 8px', gap: 2 }}>
                {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isSelected = !!parsed && parsed.getDate() === day && parsed.getMonth() === viewMonth && parsed.getFullYear() === viewYear;
                  const isToday = isCurrentMonth && today.getDate() === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`nx-datepicker-day${isSelected ? ' selected' : ''}${isToday && !isSelected ? ' today' : ''}`}
                      style={{ border: 'none', fontFamily: 'inherit' }}
                      aria-label={`Select ${MONTHS[viewMonth]} ${day}, ${viewYear}`}
                      aria-current={isSelected ? 'date' : undefined}
                      onClick={() => selectDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px 10px', borderTop: '1px solid var(--nx-border)' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--nx-teal)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em', padding: 0 }}
                  onClick={() => {
                    const n = new Date();
                    setViewYear(n.getFullYear());
                    setViewMonth(n.getMonth());
                    emitValue(n.getFullYear(), n.getMonth(), n.getDate(), hour, minute);
                    setOpen(false);
                    setPickMode('day');
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--nx-text-3)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                  onClick={() => { onChange(''); setOpen(false); setPickMode('day'); }}
                >
                  Clear
                </button>
              </div>
            </>
          )}

          {pickMode === 'hour' && (
            <>
              <div style={{ padding: '13px 12px 8px', borderBottom: '1px solid var(--nx-border)' }}>
                <span className="nx-label">Select hour</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 12 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`nx-datepicker-cell${h === hour ? ' active' : ''}`}
                    style={{ border: 'none', fontFamily: 'inherit' }}
                    aria-label={`Hour ${h} ${ampm}`}
                    onClick={() => { setHour(h); setPickMode('minute'); }}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </>
          )}

          {pickMode === 'minute' && (
            <>
              <div style={{ padding: '13px 12px 8px', borderBottom: '1px solid var(--nx-border)' }}>
                <span className="nx-label">Select minute</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 12 }}>
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`nx-datepicker-cell${m === minute ? ' active' : ''}`}
                    style={{ border: 'none', fontFamily: 'inherit' }}
                    aria-label={`Minute ${m}`}
                    onClick={() => selectMinute(m)}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
                <button type="button" className="nx-datepicker-ampm active" onClick={toggleAmpm}>{ampm}</button>
                <button type="button" className="nx-datepicker-ampm" onClick={() => setPickMode('hour')}>Back</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
