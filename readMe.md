# StreetSafe Server

StreetSafe Server is a Node.js backend API for crime data analysis, educational resources, and emergency services information. Built with Express and PostgreSQL, it provides geospatial crime analytics using H3 hexagonal indexing for precise location-based queries.

## Features

###  User Authentication
###  Crime Data Analytics
###  Map Integration
###  Educational Resources
###  Emergency Services

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with H3 extension for geospatial operations
- **Authentication**: JSON Web Tokens (JWT)
- **Testing**: Jest with comprehensive unit tests (80%+ coverage)
- **Geolocation**: H3 hexagonal indexing, Nominatim geocoding
- **Data Processing**: CSV import tools for emergency services data

## Database Schema

### Core Tables
- `users` - User authentication and profiles
- `crime_areas` - Crime statistics with H3 geospatial indexing
- `educational_resources` - Crime prevention and safety resources
- `emergency_services` - Police, hospital, and fire service locations


## Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **PostgreSQL** (v13+) with H3 extension installed
- **Environment variables** configured in `.env` file

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd streetsafe-server

# Install dependencies
npm install

# Set up environment variables
create .env file 
# .env with your database connection details, port, jwt_secret and node_env
```

### Database Setup

```bash
# Create database schema and seed educational resources
npm run setup-db

# Import emergency services data from CSV files
npm run import
```

### Running the Server

```bash
# Production mode
npm start

# Development mode with auto-reload
npm run dev

# Server runs on http://localhost:3000 (or PORT from .env)
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test graphsTests.js
```

## API Endpoints

### Authentication (`/api/auth`)
```http
POST /api/auth/register     # Register new user
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
GET  /api/auth/profile      # Get user profile (Protected)
```

### Crime Analytics (`/api/graphs`)
```http
GET /api/graphs/totals      # Crime totals by category (bar chart)
GET /api/graphs/trends      # Crime trends over time (line chart)  
GET /api/graphs/proportions # Crime proportions (pie chart)
GET /api/graphs/locations   # Available H3 locations
GET /api/graphs/dates       # Available date range
GET /api/graphs/crime-types # Supported crime categories
```
    **Query Parameters:**
    - `startDate`, `endDate` - Date range filtering (YYYY-MM-DD)
    - `location` - Natural language location (e.g., "London", "Manchester")
    - `radius` - Search radius in kilometers (default: 3km)
    - `crimeTypes` - Comma-separated crime types for filtering
    - `groupBy` - Time grouping: "month" or "year" (trends only)

### Map Data (`/api/map`)
```http
GET /api/map                       # All crime data for map hexagons
GET /api/map/features              # Legacy alias for all crime data
GET /api/map/hex/:h3Index          # Specific hexagon data with emergency services
GET /api/map/hexagon/:h3Index      # Supported alias for specific hexagon data
```

### Educational Resources (`/api/educational`)
```http
GET /api/educational/resources     # Crime prevention resources
?crimeTypes=burglary,violent      # Filter by crime types
```

### Emergency Services (`/api/emerg-services`)
```http
GET /api/emerg-services/closest    # Find nearest emergency services
?h3Index=123456789                # H3 location index
```



## Configuration

### Environment Variables (.env)
```env
# Database
DB_URL=postgresql://user:password@localhost:5432/streetsafe

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=development
```


