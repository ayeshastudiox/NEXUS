/**
 * NEXUS icon set — single source for navigation and intelligence UI.
 * All icons share one geometry contract (24x24 viewBox, stroke-based)
 * so they stay visually consistent at any size.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

function Svg({ size = 18, className, style, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* --- Navigation --- */
export const IconOverview = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Svg>
);

export const IconCommand = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
  </Svg>
);

export const IconNetwork = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="2.2" />
    <circle cx="5" cy="18" r="2.2" />
    <circle cx="19" cy="18" r="2.2" />
    <path d="M10.6 6.8 6.4 15.9M13.4 6.8l4.2 9.1M7.2 18h9.6" />
  </Svg>
);

export const IconShipments = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 19.5h19" />
    <path d="M4 19.5V9.2l8-5.7 8 5.7v10.3" />
    <rect x="9" y="12.5" width="6" height="7" rx="1" />
  </Svg>
);

export const IconExceptions = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4.2M12 16.9h.01" />
  </Svg>
);

export const IconDocuments = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 2.8H7a2 2 0 0 0-2 2v14.4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.8Z" />
    <path d="M14 2.8v5h5" />
    <path d="M9 13h6M9 16.5h4" />
  </Svg>
);

export const IconIntelligence = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8a7.2 7.2 0 0 0-4.2 13.1v2.4a1.4 1.4 0 0 0 1.4 1.4h5.6a1.4 1.4 0 0 0 1.4-1.4v-2.4A7.2 7.2 0 0 0 12 2.8Z" />
    <path d="M9.6 19.7v1.1a1.4 1.4 0 0 0 1.4 1.4h2a1.4 1.4 0 0 0 1.4-1.4v-1.1" />
    <path d="M12 7.2v4.4M10.4 9.4 12 11l1.6-1.6" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H8a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Svg>
);

/* --- Interface --- */
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </Svg>
);

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 4.2a2.2 2.2 0 1 1 4 0 7 7 0 0 1 4 6.3v3a3 3 0 0 0 1.8 2.7H4.2A3 3 0 0 0 6 13.5v-3a7 7 0 0 1 4-6.3" />
    <path d="M9.4 19.5a2.8 2.8 0 0 0 5.2 0" />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 20.5H5.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2H9" />
    <path d="m15.5 16.5 4.5-4.5-4.5-4.5M20 12H9" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

/* --- Intelligence / domain --- */
export const IconRisk = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 4 6.6v5c0 4.7 3.3 8.3 8 9.6 4.7-1.3 8-4.9 8-9.6v-5Z" />
    <path d="M12 8.6v4.2M12 15.8h.01" />
  </Svg>
);

export const IconRoute = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="6" r="2.4" />
    <circle cx="18" cy="18" r="2.4" />
    <path d="M6 8.4v4.1a3.5 3.5 0 0 0 3.5 3.5H15" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </Svg>
);

export const IconWave = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 20.5c.8.6 1.6 1 2.6 1 2.5 0 2.5-2.2 5-2.2 1.4 0 2 .6 2.6 1.1.7.5 1.3 1.1 2.7 1.1 2.5 0 2.5-2.2 5-2.2.5 0 1 .1 1.4.3" />
    <path d="M5.4 15.6 12 4.2l6.6 11.4" />
    <path d="M8.4 15.6h7.2" />
  </Svg>
);

export const IconPlane = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17.6 19.4 15.9 11l3.4-3.4c1.5-1.5 2-3.4 1.5-4.4-1-.5-2.9 0-4.4 1.5L13 8.1 4.6 6.4a1 1 0 0 0-1 .5l-.4.6a1 1 0 0 0 .3 1.3L9 11.6l-2 3H4.5L3.5 15.6l3 2 2 3 .9-1v-2.6l3-2 2.8 5.5c.2.5.8.7 1.3.5l.6-.3c.4-.3.6-.8.5-1.3Z" />
  </Svg>
);

export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 18V6.5a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 3 6.5V17a1 1 0 0 0 1 1h1.5" />
    <path d="M14.5 18H9.5" />
    <path d="M18.5 18H20a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.2-.6l-3.5-4.4a1 1 0 0 0-.8-.4H14" />
    <circle cx="7" cy="18" r="1.9" />
    <circle cx="18" cy="18" r="1.9" />
  </Svg>
);

export const IconTrain = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="3.5" width="15" height="13" rx="2" />
    <path d="M4.5 11h15" />
    <path d="M12 3.5v7.5" />
    <path d="m8.5 19.5-1.5 2.5M15.5 19.5l1.5 2.5" />
    <path d="M8 15.5h.01M16 15.5h.01" />
  </Svg>
);

export const IconPackage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 15.6V8.4a1.7 1.7 0 0 0-.9-1.5l-6.7-3.8a1.7 1.7 0 0 0-1.8 0L4.4 6.9a1.7 1.7 0 0 0-.9 1.5v7.2a1.7 1.7 0 0 0 .9 1.5l6.7 3.8a1.7 1.7 0 0 0 1.8 0l6.7-3.8a1.7 1.7 0 0 0 .9-1.5Z" />
    <path d="m3.8 7.4 8.2 4.6 8.2-4.6M12 21v-9" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.2V12l3.2 1.9" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </Svg>
);

export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.2 2.7 2.7L16 9.5" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4.2M12 16.9h.01" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);

export const IconBolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.4 2.5 4.6 13.4h6.2l-.8 8.1 8.8-10.9h-6.2Z" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 4 6.6v5c0 4.7 3.3 8.3 8 9.6 4.7-1.3 8-4.9 8-9.6v-5Z" />
    <path d="m8.8 12 2.2 2.2 4.2-4.4" />
  </Svg>
);

export const IconTarget = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
);

export const IconLayers = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 9 4.7-9 4.7-9-4.7Z" />
    <path d="m3.5 12.4 8.5 4.4 8.5-4.4" />
    <path d="m3.5 16.6 8.5 4.4 8.5-4.4" />
  </Svg>
);

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 3.5 10.8 13.2M20.5 3.5l-6.2 17-3.5-7.3-7.3-3.5Z" />
  </Svg>
);
