/**
 * NEXUS location catalog.
 * ----------------------------------------------------------------------------
 * The backend accepts arbitrary places: `ShipmentCreate` takes
 * `origin_name: str` plus `origin_lat`/`origin_lng` floats, and the only
 * validation is that the coordinates are inside valid lat/lng bounds
 * (`routers/shipments.py:104`). There is no hub registry the API requires, so
 * this catalog is a frontend reference set rather than a closed enumeration.
 *
 * A city, a seaport and an airport are deliberately distinct records with
 * distinct coordinates — "Karachi", "Port of Karachi", "Port Qasim" and
 * "Jinnah International Airport" are four different places, and the first is
 * offset from the coastline while the port sits on the harbour.
 *
 * Coordinates are real published positions. Values shared with the project's
 * seeded route waypoints (Shanghai, Rotterdam, Singapore, Hamburg, Dubai,
 * London, Hong Kong, Frankfurt, Karachi, Lahore, Islamabad, Peshawar, Multan)
 * match them exactly so newly created shipments are geometrically consistent
 * with the existing demo dataset.
 */

export type LocationKind = 'CITY' | 'SEAPORT' | 'AIRPORT' | 'RAIL' | 'ROAD';

export interface NexusLocation {
  /** Stored in the shipment record. Must stay stable and unambiguous. */
  name: string;
  city: string;
  country: string;
  kind: LocationKind;
  lat: number;
  lng: number;
  /** Extra searchable terms — former spellings, common short forms. */
  aliases?: string[];
}

export const KIND_LABEL: Record<LocationKind, string> = {
  CITY: 'City',
  SEAPORT: 'Seaport',
  AIRPORT: 'Airport',
  RAIL: 'Rail',
  ROAD: 'Road',
};

/* ------------------------------------------------------------------ *
 * Pakistan
 * ------------------------------------------------------------------ */

const PAKISTAN: NexusLocation[] = [
  { name: 'Karachi, Pakistan', city: 'Karachi', country: 'Pakistan', kind: 'CITY', lat: 24.8607, lng: 67.0011, aliases: ['khi'] },
  { name: 'Port of Karachi, Pakistan', city: 'Karachi', country: 'Pakistan', kind: 'SEAPORT', lat: 24.8420, lng: 66.9850, aliases: ['karachi port', 'kpt', 'west wharf'] },
  { name: 'Port Qasim, Pakistan', city: 'Karachi', country: 'Pakistan', kind: 'SEAPORT', lat: 24.7900, lng: 67.3400, aliases: ['bin qasim', 'pq', 'muhammad bin qasim port'] },
  { name: 'Gwadar Port, Pakistan', city: 'Gwadar', country: 'Pakistan', kind: 'SEAPORT', lat: 25.1216, lng: 62.3254, aliases: ['gwadar', 'deep sea port'] },
  { name: 'Jinnah International Airport, Pakistan', city: 'Karachi', country: 'Pakistan', kind: 'AIRPORT', lat: 24.9065, lng: 67.1608, aliases: ['khi airport', 'quaid e azam airport', 'jinnah airport'] },
  { name: 'Lahore, Pakistan', city: 'Lahore', country: 'Pakistan', kind: 'CITY', lat: 31.5204, lng: 74.3587, aliases: ['lhr'] },
  { name: 'Allama Iqbal International Airport, Pakistan', city: 'Lahore', country: 'Pakistan', kind: 'AIRPORT', lat: 31.5216, lng: 74.4036, aliases: ['lahore airport', 'lhr airport'] },
  { name: 'Lahore Station, Pakistan', city: 'Lahore', country: 'Pakistan', kind: 'RAIL', lat: 31.5497, lng: 74.3436, aliases: ['lahore railway', 'lahore junction'] },
  { name: 'Islamabad, Pakistan', city: 'Islamabad', country: 'Pakistan', kind: 'CITY', lat: 33.6844, lng: 73.0479, aliases: ['isb'] },
  { name: 'Islamabad Checkpoint, Pakistan', city: 'Islamabad', country: 'Pakistan', kind: 'ROAD', lat: 33.6844, lng: 73.0479, aliases: ['islamabad road', 'islamabad dry port'] },
  { name: 'Islamabad International Airport, Pakistan', city: 'Islamabad', country: 'Pakistan', kind: 'AIRPORT', lat: 33.5607, lng: 72.8516, aliases: ['isb airport', 'new islamabad airport', 'gandhara airport'] },
  { name: 'Rawalpindi, Pakistan', city: 'Rawalpindi', country: 'Pakistan', kind: 'CITY', lat: 33.5651, lng: 73.0169, aliases: ['pindi'] },
  { name: 'Sialkot, Pakistan', city: 'Sialkot', country: 'Pakistan', kind: 'CITY', lat: 32.4945, lng: 74.5229, aliases: [] },
  { name: 'Sialkot International Airport, Pakistan', city: 'Sialkot', country: 'Pakistan', kind: 'AIRPORT', lat: 32.5356, lng: 74.3639, aliases: ['sialkot airport', 'skz'] },
  { name: 'Faisalabad, Pakistan', city: 'Faisalabad', country: 'Pakistan', kind: 'CITY', lat: 31.4180, lng: 73.0790, aliases: ['lyallpur'] },
  { name: 'Faisalabad International Airport, Pakistan', city: 'Faisalabad', country: 'Pakistan', kind: 'AIRPORT', lat: 31.3650, lng: 72.9948, aliases: ['faisalabad airport', 'lyp'] },
  { name: 'Multan, Pakistan', city: 'Multan', country: 'Pakistan', kind: 'CITY', lat: 30.1575, lng: 71.5249, aliases: [] },
  { name: 'Multan Checkpoint, Pakistan', city: 'Multan', country: 'Pakistan', kind: 'ROAD', lat: 30.1575, lng: 71.5249, aliases: ['multan dry port'] },
  { name: 'Peshawar, Pakistan', city: 'Peshawar', country: 'Pakistan', kind: 'CITY', lat: 34.0151, lng: 71.5249, aliases: [] },
  { name: 'Peshawar Station, Pakistan', city: 'Peshawar', country: 'Pakistan', kind: 'RAIL', lat: 34.0151, lng: 71.5249, aliases: ['peshawar railway', 'peshawar cantonment station'] },
  { name: 'Bacha Khan International Airport, Pakistan', city: 'Peshawar', country: 'Pakistan', kind: 'AIRPORT', lat: 33.9939, lng: 71.5146, aliases: ['peshawar airport', 'pew'] },
  { name: 'Quetta, Pakistan', city: 'Quetta', country: 'Pakistan', kind: 'CITY', lat: 30.1798, lng: 66.9750, aliases: [] },
  { name: 'Quetta International Airport, Pakistan', city: 'Quetta', country: 'Pakistan', kind: 'AIRPORT', lat: 30.2514, lng: 66.9378, aliases: ['quetta airport', 'uzb'] },
  { name: 'Karachi Station, Pakistan', city: 'Karachi', country: 'Pakistan', kind: 'RAIL', lat: 24.8607, lng: 67.0011, aliases: ['karachi cantt station', 'karachi city station'] },
  { name: 'Hyderabad, Pakistan', city: 'Hyderabad', country: 'Pakistan', kind: 'CITY', lat: 25.3960, lng: 68.3578, aliases: [] },
];

/* ------------------------------------------------------------------ *
 * International
 * ------------------------------------------------------------------ */

const INTERNATIONAL: NexusLocation[] = [
  // --- East Asia ---
  { name: 'Shanghai, China', city: 'Shanghai', country: 'China', kind: 'CITY', lat: 31.2304, lng: 121.4737, aliases: ['sha'] },
  { name: 'Port of Shanghai, China', city: 'Shanghai', country: 'China', kind: 'SEAPORT', lat: 30.6260, lng: 122.0640, aliases: ['yangshan', 'shanghai port'] },
  { name: 'Shanghai Pudong International Airport, China', city: 'Shanghai', country: 'China', kind: 'AIRPORT', lat: 31.1443, lng: 121.8083, aliases: ['pvg', 'pudong airport'] },
  { name: 'Ningbo, China', city: 'Ningbo', country: 'China', kind: 'CITY', lat: 29.8683, lng: 121.5440, aliases: ['ningbo zhoushan'] },
  { name: 'Port of Ningbo-Zhoushan, China', city: 'Ningbo', country: 'China', kind: 'SEAPORT', lat: 29.8683, lng: 121.9000, aliases: ['ningbo port'] },
  { name: 'Qingdao, China', city: 'Qingdao', country: 'China', kind: 'CITY', lat: 36.0671, lng: 120.3826, aliases: [] },
  { name: 'Port of Qingdao, China', city: 'Qingdao', country: 'China', kind: 'SEAPORT', lat: 36.0671, lng: 120.3200, aliases: [] },
  { name: 'Tianjin, China', city: 'Tianjin', country: 'China', kind: 'CITY', lat: 39.3434, lng: 117.3616, aliases: ['tianjin xingang'] },
  { name: 'Port of Tianjin, China', city: 'Tianjin', country: 'China', kind: 'SEAPORT', lat: 38.9800, lng: 117.7300, aliases: ['xingang'] },
  { name: 'Shenzhen, China', city: 'Shenzhen', country: 'China', kind: 'CITY', lat: 22.5431, lng: 114.0579, aliases: ['yantian'] },
  { name: 'Port of Shenzhen (Yantian), China', city: 'Shenzhen', country: 'China', kind: 'SEAPORT', lat: 22.5700, lng: 114.2700, aliases: ['yantian port', 'shekou'] },
  { name: 'Hong Kong, China', city: 'Hong Kong', country: 'China', kind: 'CITY', lat: 22.3193, lng: 114.1694, aliases: ['hkg'] },
  { name: 'Port of Hong Kong, China', city: 'Hong Kong', country: 'China', kind: 'SEAPORT', lat: 22.3100, lng: 114.1600, aliases: ['kwai tsing', 'hong kong terminal'] },
  { name: 'Hong Kong International Airport, China', city: 'Hong Kong', country: 'China', kind: 'AIRPORT', lat: 22.3080, lng: 113.9185, aliases: ['hkg airport', 'chek lap kok'] },
  { name: 'Busan, South Korea', city: 'Busan', country: 'South Korea', kind: 'SEAPORT', lat: 35.1796, lng: 129.0756, aliases: ['pusan', 'pusan port', 'busan port'] },
  { name: 'Tokyo, Japan', city: 'Tokyo', country: 'Japan', kind: 'CITY', lat: 35.6762, lng: 139.6503, aliases: ['tyo'] },
  { name: 'Port of Tokyo, Japan', city: 'Tokyo', country: 'Japan', kind: 'SEAPORT', lat: 35.6100, lng: 139.7800, aliases: [] },
  { name: 'Port of Yokohama, Japan', city: 'Yokohama', country: 'Japan', kind: 'SEAPORT', lat: 35.4500, lng: 139.6600, aliases: ['yokohama'] },
  { name: 'Narita International Airport, Japan', city: 'Tokyo', country: 'Japan', kind: 'AIRPORT', lat: 35.7720, lng: 140.3929, aliases: ['nrt', 'tokyo narita'] },

  // --- Southeast Asia ---
  { name: 'Singapore, Singapore', city: 'Singapore', country: 'Singapore', kind: 'CITY', lat: 1.3521, lng: 103.8198, aliases: ['sin'] },
  { name: 'Port of Singapore, Singapore', city: 'Singapore', country: 'Singapore', kind: 'SEAPORT', lat: 1.2644, lng: 103.8200, aliases: ['psa', 'tuas'] },
  { name: 'Changi Airport, Singapore', city: 'Singapore', country: 'Singapore', kind: 'AIRPORT', lat: 1.3644, lng: 103.9915, aliases: ['sin airport', 'changi'] },
  { name: 'Port Klang, Malaysia', city: 'Port Klang', country: 'Malaysia', kind: 'SEAPORT', lat: 3.0000, lng: 101.4000, aliases: ['klang', 'pelabuhan klang'] },
  { name: 'Tanjung Pelepas, Malaysia', city: 'Tanjung Pelepas', country: 'Malaysia', kind: 'SEAPORT', lat: 1.3625, lng: 103.5489, aliases: ['ptp', 'johor'] },
  { name: 'Laem Chabang, Thailand', city: 'Laem Chabang', country: 'Thailand', kind: 'SEAPORT', lat: 13.0820, lng: 100.8900, aliases: ['bangkok port'] },
  { name: 'Jakarta, Indonesia', city: 'Jakarta', country: 'Indonesia', kind: 'CITY', lat: -6.2088, lng: 106.8456, aliases: ['jkt'] },
  { name: 'Tanjung Priok, Indonesia', city: 'Jakarta', country: 'Indonesia', kind: 'SEAPORT', lat: -6.1040, lng: 106.8840, aliases: ['jakarta port'] },
  { name: 'Ho Chi Minh City, Vietnam', city: 'Ho Chi Minh City', country: 'Vietnam', kind: 'CITY', lat: 10.8231, lng: 106.6297, aliases: ['saigon', 'hcmc'] },
  { name: 'Cat Lai Terminal, Vietnam', city: 'Ho Chi Minh City', country: 'Vietnam', kind: 'SEAPORT', lat: 10.7600, lng: 106.7900, aliases: ['cat lai', 'saigon port'] },
  { name: 'Manila, Philippines', city: 'Manila', country: 'Philippines', kind: 'CITY', lat: 14.5995, lng: 120.9842, aliases: ['mnl'] },

  // --- South Asia ---
  { name: 'Mumbai, India', city: 'Mumbai', country: 'India', kind: 'CITY', lat: 19.0760, lng: 72.8777, aliases: ['bombay', 'bom'] },
  { name: 'Jawaharlal Nehru Port (Nhava Sheva), India', city: 'Mumbai', country: 'India', kind: 'SEAPORT', lat: 18.9500, lng: 72.9500, aliases: ['jnpt', 'nhava sheva', 'mumbai port'] },
  { name: 'Chhatrapati Shivaji Maharaj International Airport, India', city: 'Mumbai', country: 'India', kind: 'AIRPORT', lat: 19.0896, lng: 72.8656, aliases: ['bom airport', 'mumbai airport'] },
  { name: "Mundra Port, India", city: 'Mundra', country: 'India', kind: 'SEAPORT', lat: 22.8395, lng: 69.7210, aliases: ['mundra'] },
  { name: 'Colombo, Sri Lanka', city: 'Colombo', country: 'Sri Lanka', kind: 'SEAPORT', lat: 6.9271, lng: 79.8612, aliases: ['colombo port'] },
  { name: 'Chattogram, Bangladesh', city: 'Chattogram', country: 'Bangladesh', kind: 'SEAPORT', lat: 22.3569, lng: 91.7832, aliases: ['chittagong', 'chittagong port'] },

  // --- Middle East ---
  { name: 'Dubai, United Arab Emirates', city: 'Dubai', country: 'United Arab Emirates', kind: 'CITY', lat: 25.2048, lng: 55.2708, aliases: ['dxb', 'uae'] },
  { name: 'Jebel Ali Port, United Arab Emirates', city: 'Dubai', country: 'United Arab Emirates', kind: 'SEAPORT', lat: 25.0100, lng: 55.0600, aliases: ['jebel ali', 'jafza', 'dubai port'] },
  { name: 'Dubai International Airport, United Arab Emirates', city: 'Dubai', country: 'United Arab Emirates', kind: 'AIRPORT', lat: 25.2532, lng: 55.3657, aliases: ['dxb airport', 'dubai airport'] },
  { name: 'Abu Dhabi, United Arab Emirates', city: 'Abu Dhabi', country: 'United Arab Emirates', kind: 'CITY', lat: 24.4539, lng: 54.3773, aliases: ['auh'] },
  { name: 'Khalifa Port, United Arab Emirates', city: 'Abu Dhabi', country: 'United Arab Emirates', kind: 'SEAPORT', lat: 24.8100, lng: 54.6700, aliases: ['taweelah', 'khalifa'] },
  { name: 'Doha, Qatar', city: 'Doha', country: 'Qatar', kind: 'CITY', lat: 25.2854, lng: 51.5310, aliases: ['doh'] },
  { name: 'Hamad Port, Qatar', city: 'Doha', country: 'Qatar', kind: 'SEAPORT', lat: 25.0200, lng: 51.6100, aliases: ['hamad'] },
  { name: 'Hamad International Airport, Qatar', city: 'Doha', country: 'Qatar', kind: 'AIRPORT', lat: 25.2731, lng: 51.6080, aliases: ['doh airport', 'doha airport'] },
  { name: 'Jeddah, Saudi Arabia', city: 'Jeddah', country: 'Saudi Arabia', kind: 'SEAPORT', lat: 21.4858, lng: 39.1925, aliases: ['jeddah islamic port', 'jed'] },
  { name: 'King Abdullah Port, Saudi Arabia', city: 'Rabigh', country: 'Saudi Arabia', kind: 'SEAPORT', lat: 22.3900, lng: 39.0800, aliases: ['king abdullah port', 'kaec'] },
  { name: 'Salalah, Oman', city: 'Salalah', country: 'Oman', kind: 'SEAPORT', lat: 16.9400, lng: 54.0000, aliases: ['salalah port'] },
  { name: 'Muscat, Oman', city: 'Muscat', country: 'Oman', kind: 'CITY', lat: 23.5880, lng: 58.3829, aliases: ['mct'] },
  { name: 'Sohar Port, Oman', city: 'Sohar', country: 'Oman', kind: 'SEAPORT', lat: 24.5000, lng: 56.6100, aliases: ['sohar'] },
  { name: 'Bandar Abbas, Iran', city: 'Bandar Abbas', country: 'Iran', kind: 'SEAPORT', lat: 27.1865, lng: 56.2808, aliases: ['shahid rajaee'] },
  { name: 'Istanbul, Türkiye', city: 'Istanbul', country: 'Türkiye', kind: 'CITY', lat: 41.0082, lng: 28.9784, aliases: ['istanbul', 'turkey', 'ist'] },
  { name: 'Ambarli Port, Türkiye', city: 'Istanbul', country: 'Türkiye', kind: 'SEAPORT', lat: 40.9700, lng: 28.6900, aliases: ['ambarli', 'istanbul port'] },
  { name: 'Mersin Port, Türkiye', city: 'Mersin', country: 'Türkiye', kind: 'SEAPORT', lat: 36.8000, lng: 34.6400, aliases: ['mersin'] },

  // --- Europe ---
  { name: 'Rotterdam, Netherlands', city: 'Rotterdam', country: 'Netherlands', kind: 'CITY', lat: 51.9225, lng: 4.4792, aliases: ['rtm'] },
  { name: 'Port of Rotterdam, Netherlands', city: 'Rotterdam', country: 'Netherlands', kind: 'SEAPORT', lat: 51.9500, lng: 4.1400, aliases: ['maasvlakte', 'europoort', 'rotterdam port'] },
  { name: 'Amsterdam, Netherlands', city: 'Amsterdam', country: 'Netherlands', kind: 'CITY', lat: 52.3676, lng: 4.9041, aliases: ['ams'] },
  { name: 'Amsterdam Airport Schiphol, Netherlands', city: 'Amsterdam', country: 'Netherlands', kind: 'AIRPORT', lat: 52.3105, lng: 4.7683, aliases: ['ams airport', 'schiphol'] },
  { name: 'Antwerp, Belgium', city: 'Antwerp', country: 'Belgium', kind: 'CITY', lat: 51.2194, lng: 4.4025, aliases: ['antwerpen', 'anr'] },
  { name: 'Port of Antwerp-Bruges, Belgium', city: 'Antwerp', country: 'Belgium', kind: 'SEAPORT', lat: 51.2700, lng: 4.3200, aliases: ['antwerp port', 'deurganckdock'] },
  { name: 'Hamburg, Germany', city: 'Hamburg', country: 'Germany', kind: 'CITY', lat: 53.5511, lng: 9.9937, aliases: ['ham'] },
  { name: 'Port of Hamburg, Germany', city: 'Hamburg', country: 'Germany', kind: 'SEAPORT', lat: 53.5300, lng: 9.9200, aliases: ['hamburg port', 'altenwerder'] },
  { name: 'Frankfurt, Germany', city: 'Frankfurt', country: 'Germany', kind: 'CITY', lat: 50.1109, lng: 8.6821, aliases: ['fra'] },
  { name: 'Frankfurt Airport, Germany', city: 'Frankfurt', country: 'Germany', kind: 'AIRPORT', lat: 50.0379, lng: 8.5622, aliases: ['fra airport', 'frankfurt cargo'] },
  { name: 'Bremerhaven, Germany', city: 'Bremerhaven', country: 'Germany', kind: 'SEAPORT', lat: 53.5400, lng: 8.5800, aliases: ['bremen', 'bremerhaven port'] },
  { name: 'Felixstowe, United Kingdom', city: 'Felixstowe', country: 'United Kingdom', kind: 'SEAPORT', lat: 51.9617, lng: 1.3513, aliases: ['felixstowe port'] },
  { name: 'London, United Kingdom', city: 'London', country: 'United Kingdom', kind: 'CITY', lat: 51.5074, lng: -0.1278, aliases: ['lon', 'uk'] },
  { name: 'Port of London, United Kingdom', city: 'London', country: 'United Kingdom', kind: 'SEAPORT', lat: 51.5000, lng: 0.4500, aliases: ['tilbury', 'london gateway'] },
  { name: 'Heathrow Airport, United Kingdom', city: 'London', country: 'United Kingdom', kind: 'AIRPORT', lat: 51.4700, lng: -0.4543, aliases: ['lhr airport', 'heathrow'] },
  { name: 'Southampton, United Kingdom', city: 'Southampton', country: 'United Kingdom', kind: 'SEAPORT', lat: 50.9000, lng: -1.4000, aliases: ['southampton port'] },
  { name: 'Le Havre, France', city: 'Le Havre', country: 'France', kind: 'SEAPORT', lat: 49.4900, lng: 0.1100, aliases: ['le havre port'] },
  { name: 'Marseille, France', city: 'Marseille', country: 'France', kind: 'SEAPORT', lat: 43.2965, lng: 5.3698, aliases: ['fos', 'marseille port'] },
  { name: 'Valencia, Spain', city: 'Valencia', country: 'Spain', kind: 'SEAPORT', lat: 39.4699, lng: -0.3763, aliases: ['valencia port'] },
  { name: 'Algeciras, Spain', city: 'Algeciras', country: 'Spain', kind: 'SEAPORT', lat: 36.1300, lng: -5.4400, aliases: ['algeciras port'] },
  { name: 'Barcelona, Spain', city: 'Barcelona', country: 'Spain', kind: 'SEAPORT', lat: 41.3500, lng: 2.1700, aliases: ['barcelona port'] },
  { name: 'Genoa, Italy', city: 'Genoa', country: 'Italy', kind: 'SEAPORT', lat: 44.4072, lng: 8.9340, aliases: ['genova', 'genoa port'] },
  { name: 'Gioia Tauro, Italy', city: 'Gioia Tauro', country: 'Italy', kind: 'SEAPORT', lat: 38.4500, lng: 15.9000, aliases: [] },
  { name: 'Piraeus, Greece', city: 'Piraeus', country: 'Greece', kind: 'SEAPORT', lat: 37.9475, lng: 23.6367, aliases: ['athens port', 'piraeus port'] },
  { name: 'Gdansk, Poland', city: 'Gdansk', country: 'Poland', kind: 'SEAPORT', lat: 54.4000, lng: 18.6700, aliases: ['gdansk port'] },
  { name: 'Gothenburg, Sweden', city: 'Gothenburg', country: 'Sweden', kind: 'SEAPORT', lat: 57.7000, lng: 11.9400, aliases: ['goteborg'] },
  { name: 'Moscow, Russia', city: 'Moscow', country: 'Russia', kind: 'CITY', lat: 55.7558, lng: 37.6173, aliases: ['mow'] },

  // --- Africa ---
  { name: 'Port Said, Egypt', city: 'Port Said', country: 'Egypt', kind: 'SEAPORT', lat: 31.2653, lng: 32.3019, aliases: ['suez canal', 'port said'] },
  { name: 'Alexandria, Egypt', city: 'Alexandria', country: 'Egypt', kind: 'SEAPORT', lat: 31.2001, lng: 29.9187, aliases: ['alexandria port'] },
  { name: 'Suez, Egypt', city: 'Suez', country: 'Egypt', kind: 'SEAPORT', lat: 29.9668, lng: 32.5498, aliases: ['suez port'] },
  { name: 'Mombasa, Kenya', city: 'Mombasa', country: 'Kenya', kind: 'SEAPORT', lat: -4.0435, lng: 39.6682, aliases: ['mombasa port'] },
  { name: 'Djibouti, Djibouti', city: 'Djibouti', country: 'Djibouti', kind: 'SEAPORT', lat: 11.5950, lng: 43.1480, aliases: ['doraleh'] },
  { name: 'Durban, South Africa', city: 'Durban', country: 'South Africa', kind: 'SEAPORT', lat: -29.8587, lng: 31.0218, aliases: ['durban port'] },
  { name: 'Cape Town, South Africa', city: 'Cape Town', country: 'South Africa', kind: 'SEAPORT', lat: -33.9249, lng: 18.4241, aliases: ['cape town port'] },
  { name: 'Lagos, Nigeria', city: 'Lagos', country: 'Nigeria', kind: 'CITY', lat: 6.5244, lng: 3.3792, aliases: ['los'] },
  { name: 'Apapa Port, Nigeria', city: 'Lagos', country: 'Nigeria', kind: 'SEAPORT', lat: 6.4478, lng: 3.3646, aliases: ['apapa', 'lagos port'] },
  { name: 'Tanger Med, Morocco', city: 'Tangier', country: 'Morocco', kind: 'SEAPORT', lat: 35.8850, lng: -5.5000, aliases: ['tanger med', 'tangier'] },

  // --- Americas ---
  { name: 'New York, United States', city: 'New York', country: 'United States', kind: 'CITY', lat: 40.7128, lng: -74.0060, aliases: ['nyc', 'new york city'] },
  { name: 'Port of New York and New Jersey, United States', city: 'New York', country: 'United States', kind: 'SEAPORT', lat: 40.6700, lng: -74.1000, aliases: ['port newark', 'elizabeth terminal', 'ny nj port'] },
  { name: 'John F. Kennedy International Airport, United States', city: 'New York', country: 'United States', kind: 'AIRPORT', lat: 40.6413, lng: -73.7781, aliases: ['jfk', 'jfk airport'] },
  { name: 'Los Angeles, United States', city: 'Los Angeles', country: 'United States', kind: 'CITY', lat: 34.0522, lng: -118.2437, aliases: ['la', 'lax'] },
  { name: 'Port of Los Angeles, United States', city: 'Los Angeles', country: 'United States', kind: 'SEAPORT', lat: 33.7405, lng: -118.2775, aliases: ['san pedro', 'la port'] },
  { name: 'Port of Long Beach, United States', city: 'Long Beach', country: 'United States', kind: 'SEAPORT', lat: 33.7542, lng: -118.2165, aliases: ['long beach port'] },
  { name: 'Los Angeles International Airport, United States', city: 'Los Angeles', country: 'United States', kind: 'AIRPORT', lat: 33.9416, lng: -118.4085, aliases: ['lax airport'] },
  { name: 'Houston, United States', city: 'Houston', country: 'United States', kind: 'SEAPORT', lat: 29.7500, lng: -95.0000, aliases: ['houston port', 'bayport'] },
  { name: 'Savannah, United States', city: 'Savannah', country: 'United States', kind: 'SEAPORT', lat: 32.0809, lng: -81.0912, aliases: ['savannah port', 'garden city terminal'] },
  { name: 'Oakland, United States', city: 'Oakland', country: 'United States', kind: 'SEAPORT', lat: 37.7950, lng: -122.2790, aliases: ['oakland port', 'san francisco bay'] },
  { name: 'Seattle, United States', city: 'Seattle', country: 'United States', kind: 'SEAPORT', lat: 47.6062, lng: -122.3321, aliases: ['tacoma', 'seattle port'] },
  { name: 'Miami, United States', city: 'Miami', country: 'United States', kind: 'SEAPORT', lat: 25.7617, lng: -80.1918, aliases: ['portmiami'] },
  { name: 'Chicago, United States', city: 'Chicago', country: 'United States', kind: 'RAIL', lat: 41.8781, lng: -87.6298, aliases: ['chicago rail', 'intermodal'] },
  { name: 'Vancouver, Canada', city: 'Vancouver', country: 'Canada', kind: 'SEAPORT', lat: 49.2827, lng: -123.1207, aliases: ['vancouver port', 'prince rupert'] },
  { name: 'Montreal, Canada', city: 'Montreal', country: 'Canada', kind: 'SEAPORT', lat: 45.5019, lng: -73.5674, aliases: ['montreal port'] },
  { name: 'Santos, Brazil', city: 'Santos', country: 'Brazil', kind: 'SEAPORT', lat: -23.9608, lng: -46.3336, aliases: ['santos port', 'sao paulo port'] },
  { name: 'Sao Paulo, Brazil', city: 'Sao Paulo', country: 'Brazil', kind: 'CITY', lat: -23.5505, lng: -46.6333, aliases: ['são paulo', 'sao paulo'] },
  { name: 'Manzanillo, Mexico', city: 'Manzanillo', country: 'Mexico', kind: 'SEAPORT', lat: 19.0500, lng: -104.3000, aliases: ['manzanillo port'] },
  { name: 'Balboa, Panama', city: 'Balboa', country: 'Panama', kind: 'SEAPORT', lat: 8.9500, lng: -79.5600, aliases: ['panama canal', 'balboa port'] },
  { name: 'Cartagena, Colombia', city: 'Cartagena', country: 'Colombia', kind: 'SEAPORT', lat: 10.3910, lng: -75.5144, aliases: ['cartagena port'] },
  { name: 'Callao, Peru', city: 'Callao', country: 'Peru', kind: 'SEAPORT', lat: -12.0500, lng: -77.1500, aliases: ['lima port', 'callao'] },

  // --- Oceania ---
  { name: 'Sydney, Australia', city: 'Sydney', country: 'Australia', kind: 'CITY', lat: -33.8688, lng: 151.2093, aliases: ['syd'] },
  { name: 'Port Botany, Australia', city: 'Sydney', country: 'Australia', kind: 'SEAPORT', lat: -33.9600, lng: 151.2200, aliases: ['sydney port', 'port botany'] },
  { name: 'Melbourne, Australia', city: 'Melbourne', country: 'Australia', kind: 'SEAPORT', lat: -37.8136, lng: 144.9631, aliases: ['melbourne port'] },
  { name: 'Auckland, New Zealand', city: 'Auckland', country: 'New Zealand', kind: 'SEAPORT', lat: -36.8485, lng: 174.7633, aliases: ['auckland port'] },
];

/** Full catalog: Pakistan first so domestic hubs surface early. */
export const LOCATIONS: NexusLocation[] = [...PAKISTAN, ...INTERNATIONAL];

/**
 * Shown when the field is opened with no query. A deliberately short list of
 * the network's principal gateways, not the whole catalog.
 */
export const FEATURED_LOCATION_NAMES = [
  'Karachi, Pakistan',
  'Port Qasim, Pakistan',
  'Port of Karachi, Pakistan',
  'Gwadar Port, Pakistan',
  'Lahore, Pakistan',
  'Islamabad, Pakistan',
  'Shanghai, China',
  'Port of Shanghai, China',
  'Singapore, Singapore',
  'Port of Singapore, Singapore',
  'Rotterdam, Netherlands',
  'Port of Rotterdam, Netherlands',
  'Jebel Ali Port, United Arab Emirates',
  'Hamburg, Germany',
];

export const FEATURED_LOCATIONS: NexusLocation[] = FEATURED_LOCATION_NAMES
  .map(n => LOCATIONS.find(l => l.name === n))
  .filter((l): l is NexusLocation => Boolean(l));

export function findLocation(name: string): NexusLocation | undefined {
  return LOCATIONS.find(l => l.name === name);
}

/**
 * Ranked, case-insensitive search across city, country, facility name and
 * aliases. Lower score sorts first:
 *   0 exact facility name      3 place name starts with the query
 *   1 starts with the query    4 query appears anywhere
 *   2 alias starts with it
 */
export function searchLocations(query: string, limit = 12): NexusLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return FEATURED_LOCATIONS.slice(0, limit);

  const scored: { loc: NexusLocation; score: number }[] = [];
  for (const loc of LOCATIONS) {
    const name = loc.name.toLowerCase();
    const city = loc.city.toLowerCase();
    const country = loc.country.toLowerCase();
    const aliases = (loc.aliases || []).map(a => a.toLowerCase());

    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (aliases.some(a => a.startsWith(q))) score = 2;
    else if (city.startsWith(q) || country.startsWith(q)) score = 3;
    else if (
      name.includes(q) ||
      city.includes(q) ||
      country.includes(q) ||
      aliases.some(a => a.includes(q))
    ) score = 4;

    if (score >= 0) scored.push({ loc, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    // Prefer the plain city record over a facility when ranks tie.
    const kindRank = (k: LocationKind) => (k === 'CITY' ? 0 : k === 'SEAPORT' ? 1 : k === 'AIRPORT' ? 2 : 3);
    const diff = kindRank(a.loc.kind) - kindRank(b.loc.kind);
    if (diff !== 0) return diff;
    return a.loc.name.localeCompare(b.loc.name);
  });

  return scored.slice(0, limit).map(s => s.loc);
}

/** Total matches for a query, so the UI can say how many were withheld. */
export function countLocations(query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return FEATURED_LOCATIONS.length;
  return LOCATIONS.filter(loc => {
    const fields = [loc.name, loc.city, loc.country, ...(loc.aliases || [])].map(s => s.toLowerCase());
    return fields.some(f => f.includes(q));
  }).length;
}

/**
 * Mode suggestion from the two endpoint kinds. A seaport implies ocean, an
 * airport implies air; anything else returns null so the operator's explicit
 * choice is left untouched.
 */
export function suggestMode(origin?: NexusLocation, destination?: NexusLocation): 'OCEAN' | 'AIR' | null {
  const kinds = [origin?.kind, destination?.kind];
  if (kinds.includes('SEAPORT') && kinds.includes('AIRPORT')) return null;
  if (kinds.includes('AIRPORT')) return 'AIR';
  if (kinds.includes('SEAPORT')) return 'OCEAN';
  return null;
}
