"""
Configuration settings for NCAA Basketball database population.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Get the directory where this config file is located
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from .env file in the same directory
env_path = BASE_DIR / '.env'
load_dotenv(dotenv_path=env_path)

# Database Configuration
DATABASE_PATH = os.getenv('DATABASE_PATH', 'ncaab.db')
DATABASE_TYPE = os.getenv('DATABASE_TYPE', 'sqlite')

# PostgreSQL Configuration (if used)
DATABASE_HOST = os.getenv('DATABASE_HOST', 'localhost')
DATABASE_PORT = os.getenv('DATABASE_PORT', '5432')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'ncaab')
DATABASE_USER = os.getenv('DATABASE_USER', '')
DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD', '')

# API Configuration
ESPN_BASE_URL = os.getenv(
    'ESPN_BASE_URL',
    'https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball'
)
ESPN_SITE_BASE_URL = os.getenv(
    'ESPN_SITE_BASE_URL',
    'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball'
)

# Rate Limiting
RATE_LIMIT = int(os.getenv('RATE_LIMIT', 10))  # requests per second

# Default Season
DEFAULT_SEASON = int(os.getenv('DEFAULT_SEASON', 2026))

# Query Parameters
DEFAULT_LANG = 'en'
DEFAULT_REGION = 'us'
