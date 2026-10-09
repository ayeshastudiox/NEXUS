/**
 * NEXUS location combobox.
 * ----------------------------------------------------------------------------
 * Searchable single-select over the frontend location catalog. Reused for both
 * Origin and Destination on the registration form.
 *
 * Accessibility: implements the ARIA combobox pattern — the input carries
 * role="combobox", aria-expanded, aria-controls, aria-activedescendant and
 * aria-autocomplete; options are role="option" inside a role="listbox".
 *
 * Keyboard: ArrowUp / ArrowDown move the active option, Home / End jump,
 * Enter selects, Escape closes (returning focus to the input), Tab closes.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  KIND_LABEL, countLocations, findLocation, searchLocations, type NexusLocation,
} from '../data/locations';

export interface LocationComboboxProps {
  /** Controlled value: the selected location's `name`, or '' when unset. */
  value: string;
  onChange: (location: NexusLocation) => void;
  /** Called when the selection is cleared. */
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Narrow keyboard/screen-reader hint, e.g. "origin". */
  purpose?: string;
}

/** Small glyph indicating the facility type. */
function KindIcon({ kind }: { kind: NexusLocation['kind'] }) {
  const common = {
    width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'SEAPORT':
      return (
        <svg {...common}>
          <path d="M2.5 20.5c.8.6 1.6 1 2.6 1 2.5 0 2.5-2.2 5-2.2 1.4 0 2 .6 2.6 1.1.7.5 1.3 1.1 2.7 1.1 2.5 0 2.5-2.2 5-2.2.5 0 1 .1 1.4.3" />
          <path d="M5.4 15.6 12 4.2l6.6 11.4" />
          <path d="M8.4 15.6h7.2" />
        </svg>
      );
    case 'AIRPORT':
      return (
        <svg {...common}>
          <path d="M17.6 19.4 15.9 11l3.4-3.4c1.5-1.5 2-3.4 1.5-4.4-1-.5-2.9 0-4.4 1.5L13 8.1 4.6 6.4a1 1 0 0 0-1 .5l-.4.6a1 1 0 0 0 .3 1.3L9 11.6l-2 3H4.5L3.5 15.6l3 2 2 3 .9-1v-2.6l3-2 2.8 5.5c.2.5.8.7 1.3.5l.6-.3c.4-.3.6-.8.5-1.3Z" />
        </svg>
      );
    case 'RAIL':
      return (
        <svg {...common}>
          <rect x="4.5" y="3.5" width="15" height="13" rx="2" />
          <path d="M4.5 11h15M12 3.5V11M8.5 19.5l-1.5 2.5M15.5 19.5l1.5 2.5" />
        </svg>
      );
    case 'ROAD':
      return (
        <svg {...common}>
          <path d="M14 18V6.5a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 3 6.5V17a1 1 0 0 0 1 1h1.5" />
          <path d="M14.5 18H9.5" />
          <path d="M18.5 18H20a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.2-.6l-3.5-4.4a1 1 0 0 0-.8-.4H14" />
          <circle cx="7" cy="18" r="1.9" />
          <circle cx="18" cy="18" r="1.9" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M2.5 19.5h19" />
          <path d="M4 19.5V9.2l8-5.7 8 5.7v10.3" />
          <rect x="9" y="12.5" width="6" height="7" rx="1" />
        </svg>
      );
  }
}

export default function LocationCombobox({
  value,
  onChange,
  onClear,
  label,
  placeholder = 'Search city, port, airport or country…',
  disabled = false,
  purpose = 'location',
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const listId = `${useId()}-locations`;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const selected: NexusLocation | undefined = useMemo(
    () => (value ? findLocation(value) : undefined),
    [value]
  );

  // Results follow the typed query; an empty query shows the featured set.
  const results = useMemo(() => searchLocations(query, 12), [query]);
  const totalMatches = useMemo(() => countLocations(query), [query]);
  const hidden = Math.max(0, totalMatches - results.length);

  // Reset the highlight whenever the result set changes.
  useEffect(() => { setCursor(0); }, [query, open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor, open]);

  // Dismiss on outside pointer.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const t = window.setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const openWithCurrent = () => {
    if (disabled) return;
    setQuery('');
    setOpen(true);
    // Selecting all makes it trivial to type over an existing choice.
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commit = (loc: NexusLocation) => {
    onChange(loc);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const clear = () => {
    onClear?.();
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { openWithCurrent(); return; }
      if (results.length === 0) return;
      setCursor(c => {
        const next = e.key === 'ArrowDown' ? c + 1 : c - 1;
        return (next + results.length) % results.length;
      });
      return;
    }

    if (e.key === 'Home' && open && results.length > 0) { e.preventDefault(); setCursor(0); return; }
    if (e.key === 'End' && open && results.length > 0) { e.preventDefault(); setCursor(results.length - 1); return; }

    if (e.key === 'Enter') {
      if (open && results[cursor]) {
        e.preventDefault();
        commit(results[cursor]);
      }
      return;
    }

    if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); setQuery(''); }
      return;
    }

    if (e.key === 'Tab') { setOpen(false); setQuery(''); }
  };

  const displayValue = open ? query : (selected?.name || '');

  return (
    <div className="atl-combo" ref={wrapRef}>
      <div
        className={`atl-combo-field${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
        onClick={() => { if (!open) openWithCurrent(); }}
      >
        <span className="atl-combo-search" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" />
          </svg>
        </span>

        <input
          ref={inputRef}
          className="atl-combo-input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[cursor] ? optionId(cursor) : undefined}
          aria-label={label || `Search ${purpose}`}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={displayValue}
          placeholder={selected ? selected.name : placeholder}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onKeyDown={onKeyDown}
          onFocus={() => { if (!open) openWithCurrent(); }}
        />

        {selected && !open && (
          <button
            type="button"
            className="atl-combo-tag"
            title="Type to search for another location"
            onMouseDown={e => e.preventDefault()}
            onClick={e => { e.stopPropagation(); openWithCurrent(); }}
          >
            <KindIcon kind={selected.kind} />
            {KIND_LABEL[selected.kind]}
          </button>
        )}

        {selected && !disabled && (
          <button
            type="button"
            className="atl-combo-clear"
            aria-label={`Clear ${purpose}`}
            title="Clear"
            onMouseDown={e => e.preventDefault()}
            onClick={e => { e.stopPropagation(); clear(); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}

        <span className={`atl-combo-caret${open ? ' is-open' : ''}`} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>

      {open && (
        <div className="atl-combo-menu" role="listbox" id={listId} aria-label={`${purpose} suggestions`} ref={listRef}>
          {results.length === 0 ? (
            <div className="atl-combo-empty">
              No location matches “{query.trim()}”.
              <span className="atl-combo-empty-hint">
                Check the spelling, or try a city, country, port or airport name.
              </span>
            </div>
          ) : (
            <>
              {!query.trim() && (
                <div className="atl-combo-group">
                  <span className="nx-label">Principal gateways</span>
                </div>
              )}
              {results.map((loc, i) => (
                <div
                  key={loc.name}
                  id={optionId(i)}
                  data-idx={i}
                  role="option"
                  aria-selected={loc.name === value}
                  className={`atl-combo-option${i === cursor ? ' is-active' : ''}${loc.name === value ? ' is-selected' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => commit(loc)}
                >
                  <span className={`atl-combo-ico kind-${loc.kind.toLowerCase()}`}>
                    <KindIcon kind={loc.kind} />
                  </span>

                  <span className="atl-combo-text">
                    <span className="atl-combo-name">{loc.city}</span>
                    <span className="atl-combo-sub">
                      {loc.name.replace(`, ${loc.country}`, '') !== loc.city
                        ? `${loc.name.replace(`, ${loc.country}`, '')} · `
                        : ''}
                      {loc.country}
                    </span>
                  </span>

                  <span className="atl-combo-kind">{KIND_LABEL[loc.kind]}</span>
                  <span className="atl-combo-coord nx-mono">
                    {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                  </span>
                </div>
              ))}

              {hidden > 0 && (
                <div className="atl-combo-more">
                  {hidden} more match{hidden === 1 ? '' : 'es'} — keep typing to narrow
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
