/**
 * Document intake panel.
 * ----------------------------------------------------------------------------
 * Documents are not part of the shipment creation payload on the backend — they
 * attach through `POST /api/shipments/{ref}/documents`, which requires the
 * shipment to exist first. This panel therefore takes the document types chosen
 * during registration (or all required types, when opened from the Document
 * workspace) and attaches them to an existing shipment.
 *
 * The deduplication of extractions and discrepancy detection is performed by the
 * backend; nothing about that logic is duplicated or altered here.
 */
import { useRef, useState } from 'react';
import { uploadShipmentDocument } from '../lib/api';
import { Glyph } from './ui';

/** Mirrors the backend DocumentType enum exactly. */
export const DOCUMENT_TYPES = [
  { value: 'BILL_OF_LADING', label: 'Bill of Lading', short: 'BOL' },
  { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', short: 'Invoice' },
  { value: 'PACKING_LIST', label: 'Packing List', short: 'Packing' },
  { value: 'PROOF_OF_DELIVERY', label: 'Proof of Delivery', short: 'POD' },
] as const;

const DOCUMENT_LABELS: Record<string, string> = DOCUMENT_TYPES.reduce(
  (acc, d) => { acc[d.value] = d.label; return acc; },
  {} as Record<string, string>
);

export function documentLabel(type?: string): string {
  if (!type) return 'Document';
  return DOCUMENT_LABELS[type] || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export type UploadPhase = 'idle' | 'uploading' | 'done' | 'error';

interface UploadState {
  status: UploadPhase;
  message?: string;
}

export interface DocumentIntakePanelProps {
  shipmentRef: string;
  /** Types to offer, in order. Defaults to every document type. */
  types?: readonly string[];
  /** Types already on file, so they can be shown as received. */
  receivedTypes?: string[];
  /** Called after any successful upload so the parent can refetch. */
  onUploaded?: () => void;
  /** Rendered instead of the checklist when there is nothing to collect. */
  emptyMessage?: string;
}

export default function DocumentIntakePanel({
  shipmentRef,
  types,
  receivedTypes = [],
  onUploaded,
  emptyMessage = 'All required documents are already on file for this shipment.',
}: DocumentIntakePanelProps) {
  const offer = types && types.length > 0 ? types : DOCUMENT_TYPES.map(d => d.value);
  const pending = offer.filter(t => !receivedTypes.includes(t));

  const [state, setState] = useState<Record<string, UploadState>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setFor = (type: string, next: UploadState) => {
    setState(prev => ({ ...prev, [type]: next }));
  };

  const handleFile = async (type: string, file: File | undefined) => {
    if (!file) return;
    setFor(type, { status: 'uploading' });
    try {
      await uploadShipmentDocument(shipmentRef, type, file);
      setFor(type, { status: 'done', message: `${file.name} attached` });
      const input = inputRefs.current[type];
      if (input) input.value = '';
      onUploaded?.();
    } catch (err: any) {
      setFor(type, { status: 'error', message: err?.message || 'Upload failed' });
    }
  };

  if (pending.length === 0) {
    return (
      <div className="atl-callout atl-callout--ok">
        <div className="atl-callout-head">
          <Glyph name="check" size={13} />
          Documentation complete
        </div>
        <div className="atl-callout-body">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="nx-meta">
        Attach the document types selected during registration. Files are processed by the NEXUS
        backend, which extracts values and cross-checks them for discrepancies.
      </div>

      <div className="atl-intake">
        {pending.map(type => {
          const st = state[type] || { status: 'idle' };
          const meta = DOCUMENT_TYPES.find(d => d.value === type);
          return (
            <div className="atl-intake-row" key={type}>
              <div className="atl-intake-main">
                <span className="atl-intake-name">{meta?.label || documentLabel(type)}</span>
                {st.status === 'done' && (
                  <span className="atl-intake-note" style={{ color: 'var(--nx-ok)' }}>{st.message}</span>
                )}
                {st.status === 'error' && (
                  <span className="atl-intake-note" style={{ color: 'var(--nx-critical)' }}>{st.message}</span>
                )}
                {st.status === 'idle' && (
                  <span className="atl-intake-note">Not yet attached</span>
                )}
                {st.status === 'uploading' && (
                  <span className="atl-intake-note">Uploading…</span>
                )}
              </div>

              <input
                ref={el => { inputRefs.current[type] = el; }}
                id={`doc-input-${type}`}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.doc,.docx"
                style={{ display: 'none' }}
                onChange={e => handleFile(type, e.target.files?.[0])}
              />

              <label
                htmlFor={`doc-input-${type}`}
                className={`nx-btn nx-btn-sm${st.status === 'uploading' ? '' : st.status === 'done' ? ' nx-btn-ghost' : ''}`}
                style={{ cursor: st.status === 'uploading' ? 'wait' : 'pointer' }}
              >
                {st.status === 'uploading' ? 'Uploading…' : st.status === 'done' ? 'Replace' : 'Choose file'}
              </label>
            </div>
          );
        })}
      </div>

      <div className="nx-meta">
        Supported: PDF, image, or text documents up to the backend upload limit.
      </div>
    </div>
  );
}

/** Small checklist used by the registration form and the document workspace. */
export function DocumentChecklist({
  selected, onToggle, disabled,
}: {
  selected: string[];
  onToggle: (type: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="atl-checklist">
      {DOCUMENT_TYPES.map(doc => {
        const on = selected.includes(doc.value);
        return (
          <button
            key={doc.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            disabled={disabled}
            className={`atl-check${on ? ' is-on' : ''}`}
            onClick={() => onToggle(doc.value)}
          >
            <span className="atl-check-box" aria-hidden="true">
              {on && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.2 5 8.7l4.5-5.4" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="atl-check-label">{doc.label}</span>
            <span className="atl-check-short">{doc.short}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * File selection for the registration form
 * ------------------------------------------------------------------ */

/** Files staged for upload, keyed by document type. */
export type StagedFiles = Record<string, File | undefined>;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Validates a picked file against the same limit the backend enforces.
 * Returns an error string, or null when acceptable.
 */
export function validateFile(file: File): string | null {
  if (file.size === 0) return 'File is empty';
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_UPLOAD_BYTES)}`;
  }
  return null;
}

export interface DocumentFileSetProps {
  files: StagedFiles;
  onPick: (type: string, file: File | undefined) => void;
  disabled?: boolean;
  /** Per-type transient status, e.g. during post-creation upload. */
  status?: Record<string, UploadState>;
}

/**
 * One row per required document type with a real file picker. Used by the
 * registration form so the whole document set can be attached at intake.
 */
export function DocumentFileSet({ files, onPick, disabled, status = {} }: DocumentFileSetProps) {
  const attached = DOCUMENT_TYPES.filter(d => files[d.value]);
  const totalBytes = attached.reduce((sum, d) => sum + (files[d.value]?.size || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="atl-intake">
        {DOCUMENT_TYPES.map(doc => {
          const file = files[doc.value];
          const st = status[doc.value] || { status: 'idle' as const };
          const inputId = `reg-doc-${doc.value}`;
          const busy = st.status === 'uploading';

          return (
            <div className="atl-intake-row" key={doc.value}>
              <div className="atl-intake-main">
                <span className="atl-intake-name">{doc.label}</span>
                {st.status === 'done' && (
                  <span className="atl-intake-note" style={{ color: 'var(--nx-ok)' }}>{st.message || 'Uploaded'}</span>
                )}
                {st.status === 'error' && (
                  <span className="atl-intake-note" style={{ color: 'var(--nx-critical)' }}>{st.message}</span>
                )}
                {st.status === 'idle' && (
                  file ? (
                    <span className="atl-intake-note">
                      {file.name} · {formatBytes(file.size)}
                    </span>
                  ) : (
                    <span className="atl-intake-note">No file selected</span>
                  )
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <input
                  id={inputId}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.doc,.docx"
                  style={{ display: 'none' }}
                  disabled={disabled || busy}
                  onChange={e => {
                    const picked = e.target.files?.[0];
                    onPick(doc.value, picked);
                  }}
                />
                <label
                  htmlFor={inputId}
                  className={`nx-btn nx-btn-sm${file ? ' nx-btn-ghost' : ''}`}
                  style={{ cursor: disabled || busy ? 'not-allowed' : 'pointer', opacity: disabled || busy ? 0.6 : 1 }}
                >
                  {busy ? 'Uploading…' : file ? 'Replace' : 'Choose file'}
                </label>

                {file && !busy && (
                  <button
                    type="button"
                    className="nx-btn nx-btn-sm nx-btn-ghost"
                    aria-label={`Remove ${doc.label} file`}
                    title="Remove"
                    disabled={disabled}
                    onClick={() => onPick(doc.value, undefined)}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="nx-meta">
        {attached.length === 0
          ? 'No files selected. Documents are optional at registration and can be attached later from the shipment dossier.'
          : `${attached.length} of ${DOCUMENT_TYPES.length} attached · ${formatBytes(totalBytes)} total · uploaded immediately after the shipment record is created.`}
      </div>
    </div>
  );
}
