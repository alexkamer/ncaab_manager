#!/bin/bash
# Quick start script for NCAA Basketball Database

set -e  # Exit on error

echo "=================================="
echo "NCAA Basketball Database Setup"
echo "=================================="
echo ""

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not found"
    exit 1
fi

echo "✓ Python 3 found"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "✓ Dependencies installed"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created (edit it to customize settings)"
fi

# Initialize database
if [ ! -f "ncaab.db" ]; then
    echo ""
    echo "Initializing database..."
    python populate_all.py --init
    echo "✓ Database initialized"
else
    echo ""
    echo "✓ Database already exists (skipping initialization)"
fi

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Activate the virtual environment:"
echo "   source venv/bin/activate"
echo ""
echo "2. Run a quick test population:"
echo "   python populate_all.py --quick"
echo ""
echo "3. Or populate a full season:"
echo "   python populate_all.py --season 2026"
echo ""
echo "For more options, see README.md or run:"
echo "   python populate_all.py --help"
echo ""
