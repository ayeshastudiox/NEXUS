/**
 * Verified signal derivation.
 * ----------------------------------------------------------------------------
 * The backend exposes alerts whose `message` is seeded demo prose. Some of those
 * strings state numbers that contradict the live risk engine (for example a
 * risk score of 78 where the engine returns 65, or a 21-hour ETA shift where the
 * engine reports a ~69-hour schedule slip). `seed.py` is read-only, so the
 * correction belongs here, on the client.
 *
 * Rules:
 *  - Alert identity is preserved exactly: id, type, shipment_id, created_at.
 *  - The *claim* is recomputed only from live values already fetched by the page.
 *  - `created_at` is labelled as when the alert was raised; any value we compute
 *    now is labelled as a current assessment, never presented as the alert time.
 *  - When a fact cannot be established from available data, the message is
 *    neutral and states that it is unverified. No replacement value is invented.
 */
import type { IconName } from '../components/ui';

export type SignalTone = 'critical' | 'high' | 'warn' | 'info' | 'ok' | 'neutral';

export interface RawAlert {
  id?: number;
  shipment_id?: number | null;
  type?: string;
  message?: string;
  created_at?: string;
}

export interface SignalShipment {
  id?: number;
  shipment_ref?: string;
  risk_level?: string;
  risk_score?: number | null;
  delay_hours?: number | null;
  status?: string;
  has_discrepancy?: boolean;
  has_active_disruption?: boolean;
}

export interface VerifiedSignal {
  key: string;
  /** Preserved from the alert record. */
  id?: number;
  type: string;
  createdAt?: string;
  /** When this assessment was produced (client clock). */
  assessedAt: string;
  /** Human label for the alert category. */
  label: string;
  /** Live, verified statement. */
  message: string;
  /** True when the statement is a neutral fallback rather than a live fact. */
  unverified: boolean;
  /** True when the backend's original text disagreed with live data. */
  corrected: boolean;
  tone: SignalTone;
  icon: IconName;
  shipmentRef?: string;
}

/** Risk level → signal tone. Local so this module stays UI-agnostic. */
function toneForRisk(level?: string): SignalTone {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL': return 'critical';
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'warn';
    case 'LOW': return 'ok';
    default: return 'neutral';
  }
}

const SIGNAL_META: Record<string, { label: string; icon: IconName; tone: SignalTone }> = {
  HIGH_RISK: { label: 'Risk', icon: 'risk', tone: 'high' },
  DOCUMENT_ALERT: { label: 'Document', icon: 'documents', tone: 'warn' },
  DELAY_ALERT: { label: 'Delay', icon: 'clock', tone: 'warn' },
  DISRUPTION_ALERT: { label: 'Disruption', icon: 'alert', tone: 'critical' },
};

const FALLBACK_META = { label: 'Alert', icon: 'bolt' as IconName, tone: 'neutral' as SignalTone };

/**
 * Detect whether the alert's stored prose carries a figure that disagrees with
 * live data. Used only to decide whether to show the "corrected" marker — the
 * stored text is never displayed as current truth either way.
 */
function storedFigureDisagrees(raw: string, value: number): boolean {
  const match = raw.match(/(\d+(?:\.\d+)?)\s*\/\s*100|(\d+(?:\.\d+)?)\s*(?:hour|hours|h\b)/i);
  if (!match) return false;
  const found = Number(match[1] ?? match[2]);
  if (!Number.isFinite(found)) return false;
  return found !== value;
}

/**
 * Build verified signals from alerts plus whatever live shipment data the page
 * already has. Purely a presentation transform — no fetching, no mutation.
 */
export function deriveSignals(
  alerts: RawAlert[],
  shipments: SignalShipment[],
  now: Date = new Date()
): VerifiedSignal[] {
  const assessedAt = now.toISOString();
  const byId = new Map<number, SignalShipment>();
  shipments.forEach(s => { if (typeof s.id === 'number') byId.set(s.id, s); });

  // Disruption-linked shipments, counted from real flags rather than prose.
  const disruptionLinked = shipments.filter(s => s.has_active_disruption).length;

  return alerts.map((raw, index) => {
    const type = (raw.type || 'UNKNOWN').toUpperCase();
    const meta = SIGNAL_META[type] || FALLBACK_META;
    const stored = raw.message || '';
    const shipment = raw.shipment_id != null ? byId.get(raw.shipment_id) : undefined;
    const ref = shipment?.shipment_ref;

    let message: string;
    let tone = meta.tone;
    let unverified = false;
    let corrected = false;

    switch (type) {
      case 'HIGH_RISK': {
        if (shipment && shipment.risk_score != null) {
          tone = toneForRisk(shipment.risk_level);
          message =
            `${ref} currently assessed at ${shipment.risk_score}/100 ` +
            `(${(shipment.risk_level || 'UNASSESSED').toUpperCase()}) by the risk engine.`;
          corrected = storedFigureDisagrees(stored, shipment.risk_score);
        } else {
          unverified = true;
          message = ref
            ? `${ref} risk alert raised. Current score could not be retrieved.`
            : 'Risk alert raised. Current score could not be retrieved.';
        }
        break;
      }

      case 'DOCUMENT_ALERT': {
        if (shipment) {
          if (shipment.has_discrepancy) {
            message = `${ref} has a recorded cross-document discrepancy awaiting reconciliation.`;
          } else {
            message = `No open discrepancy is currently recorded for ${ref}.`;
          }
        } else {
          unverified = true;
          message = 'Document alert raised. Current document state could not be retrieved.';
        }
        break;
      }

      case 'DELAY_ALERT': {
        if (shipment && shipment.delay_hours != null) {
          message =
            `${ref} currently carries an additional predicted delay of ` +
            `${shipment.delay_hours} h beyond its current ETA.`;
          corrected = storedFigureDisagrees(stored, shipment.delay_hours);
        } else {
          unverified = true;
          message = ref
            ? `Delay alert raised for ${ref}. Current delay estimate could not be retrieved.`
            : 'Delay alert raised. Current delay estimate could not be retrieved.';
        }
        break;
      }

      case 'DISRUPTION_ALERT': {
        // Counted from shipment flags, so no prose figure is trusted.
        tone = 'warn';
        message =
          disruptionLinked > 0
            ? `Rotterdam congestion is currently linked to ${disruptionLinked} shipment${disruptionLinked === 1 ? '' : 's'}.`
            : 'Rotterdam congestion is active. No shipments are currently linked to it.';
        corrected = /\d+\s+shipments?/i.test(stored);
        break;
      }

      default: {
        unverified = true;
        message = 'Alert raised. No live assessment is available for this category.';
      }
    }

    return {
      key: `${raw.id ?? 'x'}-${index}`,
      id: raw.id,
      type,
      createdAt: raw.created_at,
      assessedAt,
      label: meta.label,
      message,
      unverified,
      corrected,
      tone,
      icon: meta.icon,
      shipmentRef: ref,
    };
  });
}

/** Format an ISO timestamp for the signal stream. */
export function signalTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
