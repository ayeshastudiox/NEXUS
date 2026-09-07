import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchShipments } from '../lib/api';
import { getModeIcon, getStatusColor } from '../lib/format';
import { Search } from 'lucide-react';

export default function ShipmentSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number>(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchShipments(value);
        setResults(data);
        setIsOpen(true);
      } catch (e) {
        setResults([]);
      }
      setLoading(false);
    }, 250);
  };

  const handleSelect = (ref: string) => {
    setQuery('');
    setIsOpen(false);
    navigate(`/shipments/${ref}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative group">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-xl" />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400/60 group-focus-within:text-sky-400 transition-colors" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search shipments..."
          className="relative w-full pl-11 pr-20 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/30 focus:bg-white/[0.05] transition-all duration-300"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading ? (
            <div className="w-4 h-4 border-2 border-sky-500/40 border-t-sky-400 rounded-full animate-spin" />
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 bg-white/[0.03] border border-white/[0.06] rounded">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full glass-strong rounded-xl shadow-2xl shadow-black/50 z-50 max-h-80 overflow-y-auto overflow-x-hidden animate-fade-in-up">
          <div className="p-1.5">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r.shipment_ref)}
                className="w-full px-3 py-2.5 text-left hover:bg-white/[0.05] rounded-lg flex items-center justify-between gap-3 transition-colors group/item"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base">{getModeIcon(r.transport_mode)}</span>
                  <div className="min-w-0">
                    <span className="font-mono text-sm text-sky-400 group-hover/item:text-sky-300 transition-colors">{r.shipment_ref}</span>
                    <span className="text-xs text-slate-500 ml-2 truncate">{r.origin_name} → {r.destination_name}</span>
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider"
                  style={{
                    backgroundColor: getStatusColor(r.status) + '15',
                    color: getStatusColor(r.status),
                    border: `1px solid ${getStatusColor(r.status)}20`
                  }}
                >
                  {r.status.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full mt-2 w-full glass-strong rounded-xl shadow-2xl shadow-black/50 z-50 p-6 text-center animate-fade-in">
          <div className="text-slate-500 text-sm">No shipment found for '<span className="text-slate-300">{query}</span>'</div>
        </div>
      )}
    </div>
  );
}