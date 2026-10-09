/**
 * Renders a NEXUS Intelligence response as titled sections instead of one
 * monospace block. All body text is reproduced verbatim from the backend
 * response — see `lib/aiSections.ts` for the parsing contract.
 */
import { useMemo } from 'react';
import { presentAiResponse } from '../lib/aiSections';
import { Glyph } from './ui';

const TONE_ICON = {
  info: 'info',
  evidence: 'layers',
  impact: 'alert',
  action: 'shield',
} as const;

export interface AiResponseProps {
  /** Raw text exactly as returned by the AI endpoint. */
  text: string;
  /** When the response was produced, if known. */
  assessedAt?: string;
  className?: string;
}

export default function AiResponse({ text, assessedAt, className = '' }: AiResponseProps) {
  const parsed = useMemo(() => presentAiResponse(text), [text]);

  if (!parsed.sections.length) {
    return (
      <div className={`atl-ai-block ${className}`}>
        <div className="atl-ai-block-empty">No response content was returned.</div>
      </div>
    );
  }

  // Unrecognised format: show the response exactly as received.
  if (parsed.raw) {
    return (
      <div className={`atl-ai-block ${className}`}>
        {(parsed.product || assessedAt) && (
          <div className="atl-ai-meta">
            {parsed.product && <span className="atl-ai-product">{parsed.product}</span>}
            {assessedAt && <span className="nx-meta">assessed {assessedAt}</span>}
          </div>
        )}
        <pre className="atl-ai-raw">{parsed.original.trim()}</pre>
      </div>
    );
  }

  return (
    <div className={`atl-ai-block ${className}`}>
      {(parsed.product || parsed.title || assessedAt) && (
        <div className="atl-ai-meta">
          {parsed.product && <span className="atl-ai-product">{parsed.product}</span>}
          {parsed.title && <span className="atl-ai-title">{parsed.title}</span>}
          {assessedAt && <span className="nx-meta">assessed {assessedAt}</span>}
        </div>
      )}

      {parsed.sections.map((section, i) => (
        <section className={`atl-ai-section tone-${section.tone}`} key={`${section.label}-${i}`}>
          <header className="atl-ai-section-head">
            <Glyph name={TONE_ICON[section.tone]} size={12} />
            {section.label}
          </header>
          <div className="atl-ai-section-body">{section.body}</div>
        </section>
      ))}
    </div>
  );
}
