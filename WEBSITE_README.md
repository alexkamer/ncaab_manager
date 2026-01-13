# NCAA Basketball Website

A modern web application for viewing NCAA Men's College Basketball data, including live scores, team stats, player profiles, and rankings.

## Architecture

- **Backend**: FastAPI (Python) - REST API serving data from SQLite database
- **Frontend**: Next.js 15 (React + TypeScript) - Server-side rendered web application
- **Styling**: Tailwind CSS - Responsive, modern UI

## Quick Start

### 1. Start the Backend API Server

```bash
# From the project root
cd api
python main.py
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 2. Start the Frontend Server

```bash
# From the project root
cd frontend
npm run dev
```

The website will be available at `http://localhost:3000`

## Features

### Home Page (`/`)
- Live game scores
- Recent games with team logos and final scores
- AP Poll Top 10 rankings
- Quick links to teams, players, and rankings

### Teams Page (`/teams`)
- Browse all NCAA teams organized by conference
- Team logos and venue information
- Search and filter capabilities

### Team Detail Page (`/teams/[id]`)
- Complete team information
- Full roster with player details
- Recent games and results
- Team statistics

### Players Page (`/players`)
- Browse all active players
- Player stats: height, weight, position, class
- Linked to team pages

### Rankings Page (`/rankings`)
- AP Poll rankings
- Full Top 25 with records
- First place votes and points
- Trend indicators (up/down/unchanged)

## API Endpoints

### Games
- `GET /api/games` - List games with filters (season, team_id, date range)
- `GET /api/games/{event_id}` - Game details with statistics

### Teams
- `GET /api/teams` - List all teams
- `GET /api/teams/{team_id}` - Team details with roster and schedule

### Players
- `GET /api/players` - List all players
- `GET /api/players/{athlete_id}` - Player details with game-by-game stats

### Rankings
- `GET /api/rankings` - Current AP Poll or other rankings
- `GET /api/conferences` - List of conferences
- `GET /api/standings` - Conference standings

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLite** - Lightweight database (ncaab.db)
- **uvicorn** - ASGI server
- **CORS** - Enabled for local development

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Server Components** - Default for better performance
- **Turbopack** - Fast bundler for development

## Project Structure

```
ncaab_manager/
├── api/
│   ├── main.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with navigation
│   │   ├── page.tsx         # Home page
│   │   ├── teams/
│   │   │   ├── page.tsx     # Teams list
│   │   │   └── [id]/
│   │   │       └── page.tsx # Team detail
│   │   ├── players/
│   │   │   └── page.tsx     # Players list
│   │   └── rankings/
│   │       └── page.tsx     # Rankings page
│   ├── public/              # Static assets
│   └── package.json         # npm dependencies
├── ncaab.db                 # SQLite database
├── database_schema.sql      # Database schema
└── populate_*.py            # Data population scripts
```

## Development

### Backend Development

```bash
cd api
python main.py
```

Changes to `main.py` require restarting the server.

### Frontend Development

```bash
cd frontend
npm run dev
```

Next.js will auto-reload on file changes.

## Configuration

### Environment Variables

Create `.env` file in `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Data Updates

To update the database with fresh data from ESPN:

```bash
# From project root
python populate_all.py
```

This will:
1. Update seasons and season types
2. Refresh teams and venues
3. Fetch latest games and scores
4. Update player rosters
5. Retrieve current rankings

## Deployment

### Backend Deployment
- Can be deployed to any platform supporting Python (AWS, Heroku, Railway, etc.)
- Requires Python 3.8+
- Expose port 8000 (or configure as needed)

### Frontend Deployment
- Deploy to Vercel (recommended for Next.js)
- Or any platform supporting Node.js
- Set environment variable: `NEXT_PUBLIC_API_URL` to your backend URL

## Troubleshooting

### "No games found"
- Ensure the API server is running on port 8000
- Check that the database exists: `ncaab.db`
- Verify data is populated: `python populate_all.py`

### API Connection Errors
- Frontend can't reach backend: Check CORS settings in `api/main.py`
- Verify API_BASE URL in frontend pages matches your API server

### Missing Data
- Run population scripts to fetch data from ESPN
- Check `.env` file for correct configuration
- Verify database has data: `sqlite3 ncaab.db "SELECT COUNT(*) FROM events;"`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is for educational purposes and uses publicly available data from ESPN's API.

## Credits

- Data source: ESPN API
- Built with FastAPI, Next.js, and Tailwind CSS
