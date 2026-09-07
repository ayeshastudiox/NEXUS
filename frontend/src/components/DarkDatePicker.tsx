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
  const triggerRef = useRef<HTMLDivElement>(null);
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
  const [hour, setHour] = useState(() => parsed ? (parsed.getHours() % 12 || 12) : 9);
  const [minute, setMinute] = useState(() => parsed ? parsed.getMinutes() : 0);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => parsed ? (parsed.getHours() >= 12 ? 'PM' : 'AM') : 'AM');
  const [pickMode, setPickMode] = useState<'day' | 'hour' | 'minute'>('day');

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupH = 380;
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < popupH + 8;
      setPos({
        top: showAbove ? rect.top - popupH - 6 : rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - 320),
      });
    }
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
    if (open) {
      updatePos();
      const onScroll = () => updatePos();
      const onResize = () => updatePos();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
      };
    }
  }, [open, updatePos]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as HTMLElement) &&
          triggerRef.current && !triggerRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
        setPickMode('day');
      }
    };
    if (open) {
      setTimeout(() => document.addEventListener('mousedown', onDown), 0);
      return () => document.removeEventListener('mousedown', onDown);
    }
  }, [open]);

  const emitValue = (y: number, m: number, d: number, h: number, min: number) => {
    const dt = new Date(y, m, d, h, min);
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(h)}:${pad(min)}`;
    onChange(iso);
  };

  const selectDay = (day: number) => {
    const h24 = ampm === 'PM' ? (hour % 12) + 12 : hour % 12;
    emitValue(viewYear, viewMonth, day, h24, minute);
    setPickMode('hour');
  };

  const selectHour = (h: number) => {
    setHour(h);
    setPickMode('minute');
  };

  const selectMinute = (m: number) => {
    const h24 = ampm === 'PM' ? (hour % 12) + 12 : hour % 12;
    emitValue(viewYear, viewMonth, parsed?.getDate() ?? new Date().getDate(), h24, m);
    setMinute(m);
    setOpen(false);
    setPickMode('day');
  };

  const toggleAmpm = () => {
    const next = ampm === 'AM' ? 'PM' : 'AM';
    setAmpm(next);
    const h24 = next === 'PM' ? (hour % 12) + 12 : hour % 12;
    emitValue(viewYear, viewMonth, parsed?.getDate() ?? new Date().getDate(), h24, minute);
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
      <div ref={triggerRef} style={{ position: 'relative' }}>
        <div
          onClick={() => { setOpen(o => !o); setPickMode('day'); }}
          className="nx-datepicker-trigger"
        >
          <span>{displayValue || placeholder}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ds-gray-500)', flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
          </svg>
        </div>
      </div>

      {open && (
        <div ref={popupRef} className="nx-datepicker-popup" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999 }}>
          {pickMode === 'day' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 10px' }}>
                <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }}
                  style={navBtnStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0', letterSpacing: '0.02em' }}>{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }}
                  style={navBtnStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 10px 4px', gap: 0 }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#5e6478', padding: '4px 0', letterSpacing: '0.05em' }}>{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 10px 6px', gap: 2 }}>
                {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isSelected = parsed && parsed.getDate() === day && parsed.getMonth() === viewMonth && parsed.getFullYear() === viewYear;
                  const isToday = isCurrentMonth && today.getDate() === day;
                  return (
                    <div key={day} onClick={() => selectDay(day)}
                      className={`nx-datepicker-day${isSelected ? ' selected' : ''}${isToday && !isSelected ? ' today' : ''}`}>
                      {day}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px 10px', borderTop: '1px solid rgba(30,34,49,0.8)' }}>
                <button onClick={() => { const n = new Date(); setViewYear(n.getFullYear()); setViewMonth(n.getMonth()); emitValue(n.getFullYear(), n.getMonth(), n.getDate(), hour, minute); setOpen(false); setPickMode('day'); }}
                  style={{ background: 'none', border: 'none', color: '#00d4aa', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}>Today</button>
                <button onClick={() => { onChange(''); setOpen(false); setPickMode('day'); }}
                  style={{ background: 'none', border: 'none', color: '#5e6478', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
              </div>
            </>
          )}

          {pickMode === 'hour' && (
            <>
              <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid rgba(30,34,49,0.8)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#5e6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select Hour</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 12 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                  <div key={h} onClick={() => selectHour(h)}
                    className={`nx-datepicker-cell${h === hour ? ' active' : ''}`}>
                    {String(h).padStart(2, '0')}
                  </div>
                ))}
              </div>
            </>
          )}

          {pickMode === 'minute' && (
            <>
              <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid rgba(30,34,49,0.8)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#5e6478', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select Minute</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 12 }}>
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                  <div key={m} onClick={() => selectMinute(m)}
                    className={`nx-datepicker-cell${m === minute ? ' active' : ''}`}>
                    {String(m).padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
                <button onClick={toggleAmpm}
                  className="nx-datepicker-ampm active">
                  {ampm}
                </button>
                <button onClick={() => setPickMode('hour')}
                  className="nx-datepicker-ampm">
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(30,34,49,0.6)',
  background: 'transparent', color: '#a8aebb', cursor: 'pointer', transition: 'all 0.15s',
};
