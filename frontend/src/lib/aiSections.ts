/**
 * NEXUS Intelligence response presentation.
 * ----------------------------------------------------------------------------
 * The AI endpoint returns plain text whose structure varies by query type
 * (`backend/app/ai/analyst.py` emits different templates for risk, ETA,
 * optimisation, delay, document and status questions). Rendering it as one
 * monospace block is hard to read.
 *
 * This module splits that text on the uppercase headers the backend already
 * emits, so it can be presented as titled sections. It is a pure formatter:
 *
 *  - No text is rewritten, summarised, reordered or inferred.
 *  - Every character of the backend response appears in exactly one section.
 *  - Headers the mapper does not recognise become their own section with their
 *    own label, so nothing is dropped.
 *  - If no headers are found at all, the whole response is returned as a single
 *    raw section and rendered verbatim.
 *  - Section *labels* come from a presentation map; the body is untouched.
 */

export interface AiSection {
  /** Presentation label for the group. */
  label: string;
  /** Verbatim backend text for this group. */
  body: string;
  tone: 'info' | 'evidence' | 'impact' | 'action';
}

export interface AiPresentation {
  /** Product line, e.g. "NEXUS INTELLIGENCE". Absent if the backend omits it. */
  product?: string;
  /** Document heading, e.g. "RISK ASSESSMENT — NX-1042". */
  title?: string;
  sections: AiSection[];
  /** True when no header structure was detected and `raw` should be shown as-is. */
  raw: boolean;
  /** The complete original text, always available as a fallback. */
  original: string;
}

/** Backend header → presentation label + tone. */
const HEADER_MAP: Record<string, { label: string; tone: AiSection['tone'] }> = {
  ASSESSMENT: { label: 'Analysis', tone: 'info' },
  'CURRENT SITUATION': { label: 'Current situation', tone: 'info' },
  'KEY RISK FACTORS': { label: 'Relevant evidence', tone: 'evidence' },
  'ACTIVE DISRUPTIONS': { label: 'Relevant evidence', tone: 'evidence' },
  'DISCREPANCIES FOUND': { label: 'Relevant evidence', tone: 'evidence' },
  'FACTORS AFFECTING ETA': { label: 'Relevant evidence', tone: 'evidence' },
  'DELAY FACTORS': { label: 'Relevant evidence', tone: 'evidence' },
  'COMPLIANCE RISK': { label: 'Operational impact', tone: 'impact' },
  'IMPACT ASSESSMENT': { label: 'Operational impact', tone: 'impact' },
  CONFIDENCE: { label: 'Confidence', tone: 'info' },
  'COMPLIANCE STATUS': { label: 'Compliance status', tone: 'info' },
  'RISK OVERVIEW': { label: 'Risk overview', tone: 'evidence' },
  'RECOMMENDED ACTION': { label: 'Recommended actions', tone: 'action' },
  'RECOMMENDED ACTIONS': { label: 'Recommended actions', tone: 'action' },
  SUMMARY: { label: 'Summary', tone: 'action' },
  ETA: { label: 'Estimated arrival', tone: 'info' },
  'ESTIMATED ARRIVAL': { label: 'Estimated arrival', tone: 'info' },
};

const PRODUCT_NAMES = new Set(['NEXUS INTELLIGENCE', 'NEXUS']);

/** Header matcher: a line of uppercase words, optionally followed by " — detail". */
const HEADER_RE = /^([A-Z][A-Z0-9'’/&.\- ]*[A-Z0-9)])(?:\s+—\s+(.+))?$/;

function looksLikeHeader(line: string): boolean {
  if (line.length === 0 || line.length > 72) return false;
  if (!/[A-Z]/.test(line)) return false;
  // Reject lines that are mostly lowercase prose.
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (letters.length === 0) return false;
  const upper = line.replace(/[^A-Z]/g, '').length;
  return upper / letters.length > 0.8;
}

function titleCaseHeader(header: string): string {
  const lower = header.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Parse a backend response into presentation sections.
 * Pure and synchronous — no clock or network access.
 */
export function presentAiResponse(text: string): AiPresentation {
  const original = text ?? '';
  const trimmed = original.trim();
  if (!trimmed) {
    return { sections: [], raw: true, original };
  }

  const lines = original.split(/\r?\n/);

  let product: string | undefined;
  let title: string | undefined;

  // Find the first header line; everything before it is preamble, but the
  // backend always starts with the product name so this is predictable.
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (PRODUCT_NAMES.has(line)) {
      product = line;
      start = i + 1;
    } else {
      start = i;
    }
    break;
  }

  // The line immediately after the product is the document title, if it is a
  // header and not one of the known section labels.
  if (product) {
    for (let i = start; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const isHeader = looksLikeHeader(line) && HEADER_RE.test(line);
      if (isHeader && !HEADER_MAP[line]) {
        title = line;
        start = i + 1;
      }
      break;
    }
  }

  // Group the remainder by header.
  const groups: { header: string | null; lines: string[] }[] = [];
  let current: { header: string | null; lines: string[] } = { header: null, lines: [] };

  for (let i = start; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const match = line.match(HEADER_RE);

    if (line && match && looksLikeHeader(line)) {
      if (current.header !== null || current.lines.some(l => l.trim())) {
        groups.push(current);
      }
      // A header may carry an inline qualifier: "RISK ASSESSMENT — NX-1042".
      current = { header: match[1].trim(), lines: match[2] ? [match[2].trim()] : [] };
    } else {
      current.lines.push(raw);
    }
  }
  if (current.header !== null || current.lines.some(l => l.trim())) groups.push(current);

  const structured = groups.some(g => g.header !== null);

  if (!structured) {
    return {
      product,
      title,
      raw: true,
      original,
      sections: [{ label: 'Response', body: trimmed, tone: 'info' }],
    };
  }

  const sections: AiSection[] = [];
  for (const g of groups) {
    const body = g.lines.join('\n').trim();
    if (!body && !g.header) continue;

    if (!g.header) {
      // Preamble before any header — keep it, unlabelled content is still content.
      if (body) sections.push({ label: title ? 'Current situation' : 'Overview', body, tone: 'info' });
      continue;
    }

    const mapped = HEADER_MAP[g.header];
    sections.push({
      label: mapped ? mapped.label : titleCaseHeader(g.header),
      body,
      tone: mapped ? mapped.tone : 'info',
    });
  }

  return {
    product,
    title,
    raw: false,
    original,
    sections: sections.filter(s => s.body.length > 0 || s.label.length > 0),
  };
}
