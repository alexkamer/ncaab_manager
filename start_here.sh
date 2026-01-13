#!/bin/bash
# Safe starter script - Populate seasons only

set -e

echo "=========================================="
echo "NCAA Basketball Database - Step 1: Seasons"
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
if [ ! -f "venv/.installed" ]; then
    echo "Installing dependencies..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    touch venv/.installed
    echo "✓ Dependencies installed"
    echo ""
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
DATABASE_PATH=ncaab.db
ESPN_BASE_URL=https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball
ESPN_SITE_BASE_URL=https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball
RATE_LIMIT=5
DEFAULT_SEASON=2026
EOF
    echo "✓ .env file created with safe rate limit (5 req/sec)"
    echo ""
fi

# Initialize database if needed
if [ ! -f "ncaab.db" ]; then
    echo "Initializing database..."
    python populate_all.py --init
    echo ""
fi

# Populate seasons
echo "=========================================="
echo "Populating Seasons and Season Types"
echo "=========================================="
echo ""
echo "This will:"
echo "- Fetch all 88 seasons (1939-2026)"
echo "- Fetch season types for each season"
echo "- Take approximately 2-3 minutes"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

python populate_seasons.py

echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="
echo ""

# Verify
echo "Checking database..."
SEASON_COUNT=$(sqlite3 ncaab.db "SELECT COUNT(*) FROM seasons;")
TYPE_COUNT=$(sqlite3 ncaab.db "SELECT COUNT(*) FROM season_types;")

echo "✓ Seasons populated: $SEASON_COUNT"
echo "✓ Season types populated: $TYPE_COUNT"

echo ""
echo "Recent seasons:"
sqlite3 ncaab.db "SELECT year, display_name FROM seasons ORDER BY year DESC LIMIT 5;"

echo ""
echo "Season types for 2026:"
sqlite3 ncaab.db "SELECT type_name, start_date, end_date FROM season_types WHERE season_id = 2026;"

echo ""
echo "=========================================="
echo "Step 1 Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Populate venues (independent, ~5 min):"
echo "   python populate_venues.py"
echo ""
echo "2. Populate teams for 2026 (test with 50 teams first):"
echo "   python populate_teams.py 2026 50"
echo ""
echo "3. See full guide:"
echo "   cat STEP_BY_STEP.md"
echo ""
