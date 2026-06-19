# StreetSafe Server

StreetSafe Server is a Node.js and Express backend for crime data analytics, route planning, educational safety resources, and nearby emergency service lookup. It uses PostgreSQL with H3 geospatial indexing and integrates with Valhalla, Nominatim, Google Places, and Google Geocoding.

## Features

- Cookie-based user authentication with JWT
- Crime analytics endpoints for totals, trends, and proportions
- H3-powered map and hexagon detail data
- Tailored educational resources
- Nearby police and hospital lookup
- Route planning, reverse geocoding, place search, and geocoding
- Startup config validation, `/health` readiness checks, and targeted rate limiting

## Tech Stack

- Backend: Node.js, Express.js
- Database: PostgreSQL with `h3` and `h3_postgis`
- Authentication: JWT in `httpOnly` cookies
- Testing: Jest
- Geospatial: H3, Nominatim, Valhalla
- External APIs: Google Places API, Google Geocoding API

## Database Schema

- `users` - registered users and home H3 cell
- `crime_areas` - aggregated crime data by H3 cell and date
- `educational_sources` - educational and support resources
- `emergency_services` - police and hospital locations

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 13+ with `h3` and `h3_postgis`
- A `.env` file with the required variables below

### Installation

```bash
git clone <repository-url>
cd streetsafe-server
npm install
```

### Environment Variables

These are required at startup:

```env
DB_URL=postgresql://user:password@localhost:5432/streetsafe
JWT_SECRET=your-secret-key
VALHALLA_URL=http://localhost:8002
MAPS_API_KEY=your-google-maps-key
```

These are optional:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URLS=https://streetsafe-client.onrender.com,http://localhost:5173
POLICE_DATA_DIR=..\\police-data
CRIME_H3_RESOLUTION=9
VALHALLA_TILE_URL=
VALHALLA_THREADS=2
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
EXTERNAL_RATE_LIMIT_WINDOW_MS=60000
EXTERNAL_RATE_LIMIT_MAX=30
```

### Database Setup

```bash
npm run setup-db
npm run import
npm run import:crime -- "..\\police-data"
```

The crime importer scans the given folder recursively and only imports `*-street.csv` files from Police.uk downloads.

### Running the Server

```bash
npm start
```

For development:

```bash
npm run dev
```

The app runs on `http://localhost:3000` by default.

### Docker Compose

`docker-compose.yml` starts the API and a Valhalla container together. The app service injects:

- `VALHALLA_URL=http://valhalla:8002`
- `NODE_ENV=production`

Run it with:

```bash
docker compose up --build
```

### Testing

```bash
npm test
npm run coverage
npm test -- graphsTests.js
```

## Health and Readiness

### `GET /health`

Returns backend readiness information for:

- required config presence
- database connectivity

It returns:

- `200` when the app is ready
- `503` when config or database checks are degraded

## API Endpoints

### Authentication (`/api/auth`)

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/profile
```

Notes:

- `register` and `login` are rate limited
- `profile` requires a valid `auth_token` cookie

### Crime Analytics (`/api/graphs`)

```http
GET /api/graphs/totals
GET /api/graphs/trends
GET /api/graphs/proportions
GET /api/graphs/locations
GET /api/graphs/date-range
GET /api/graphs/dates
GET /api/graphs/crime-types
```

Query parameters:

- `startDate`, `endDate`: `YYYY-MM-DD`
- `location`: non-empty natural language place name
- `radius`: positive number in km
- `crimeTypes`: comma-separated values from the supported crime list
- `groupBy`: `month` or `year` for trends

Validation notes:

- invalid dates, radius, groupings, crime types, or locations return `400`
- `/dates` is a compatibility alias for `/date-range`

### Map Data (`/api/map`)

```http
GET /api/map
GET /api/map/features
GET /api/map/hex/:h3Index
GET /api/map/hexagon/:h3Index
```

Notes:

- `/features` is a compatibility alias for `/api/map`
- `/hexagon/:h3Index` is a compatibility alias for `/hex/:h3Index`

### Educational Resources (`/api/educational`)

```http
GET /api/educational
GET /api/educational/resources
GET /api/educational/crime-type/:crimeType
```

Notes:

- `/resources` is a compatibility alias for `/api/educational`
- personalised responses use the authenticated user's H3 area when available

### Emergency Services (`/api/emerg-services`)

```http
GET /api/emerg-services/closest?h3Index=<h3-index>
```

Returns the closest police station and hospital for the provided H3 index.

### Route Planning and Places (`/api/go`)

```http
POST /api/go
POST /api/go/reverse
POST /api/go/search?q=<query>&bias=<lon,lat>
POST /api/go/geocode?place=<place-id>
```

Request notes:

- `POST /api/go` expects `[[lon, lat], [lon, lat]]`
- `POST /api/go/reverse` expects `[lon, lat]`
- `q` is required for `/search`
- `place` is required for `/geocode`
- `bias` must be `lon,lat` if provided

These endpoints are rate limited because they call external services.

## Security and Operational Notes

- CORS is restricted to configured frontend origins plus localhost during development
- Auth cookies are `httpOnly` and switch to `SameSite=None` with `secure=true` in production
- Startup fails fast if required environment variables are missing
- Auth and external-service-heavy routes are rate limited

## Current Test Status

The backend test suite currently covers:

- auth flows
- graph and map controllers/models
- educational resources
- emergency services
- health and env validation
- rate limiting
- route planning and external API wrappers

Run `npm run coverage` for the current local report.
