# NEXUS — Autonomous Logistics Intelligence

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m app.database.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo Flow

1. Open the Command Center at http://localhost:5173
2. Search for `NX-1042` in the search bar
3. View the Shipment Intelligence page with interactive map, risk breakdown, document intelligence, and AI analyst
4. Try asking the AI: "Why is NX-1042 high risk?"
5. Check the Exception Center at /exceptions
6. View Network Intelligence at /network

## API Endpoints

- `GET /api/shipments` - List all shipments
- `GET /api/shipments/search?q=` - Search shipments
- `GET /api/shipments/:id` - Get shipment detail
- `GET /api/shipments/:id/risk` - Get risk assessment
- `GET /api/shipments/:id/delay` - Get delay estimate
- `GET /api/shipments/:id/documents` - Get documents
- `POST /api/shipments/:id/documents` - Upload document
- `GET /api/disruptions` - List disruptions
- `GET /api/exceptions` - Get exceptions
- `GET /api/alerts` - Get alerts
- `GET /api/insights` - Get AI insights
- `GET /api/network/hubs` - Get network hubs
- `POST /api/ai/query` - Ask AI question
- `GET /api/metrics` - Get dashboard metrics

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Leaflet
- **AI:** OpenAI-compatible API (Alibaba Cloud Qwen)