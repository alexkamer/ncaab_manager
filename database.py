"""
Database connection and initialization utilities.
"""
import sqlite3
from typing import Optional
import config


class Database:
    """Database connection manager."""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize database connection.

        Args:
            db_path: Path to SQLite database file. Uses config default if None.
        """
        self.db_path = db_path or config.DATABASE_PATH
        self.conn = None
        self.cursor = None

    def connect(self):
        """Establish database connection."""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        self.cursor = self.conn.cursor()
        return self.conn

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None
            self.cursor = None

    def execute(self, query: str, params: tuple = ()):
        """Execute a query.

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            Cursor object
        """
        if not self.conn:
            self.connect()
        return self.cursor.execute(query, params)

    def executemany(self, query: str, params: list):
        """Execute a query with multiple parameter sets.

        Args:
            query: SQL query string
            params: List of parameter tuples

        Returns:
            Cursor object
        """
        if not self.conn:
            self.connect()
        return self.cursor.executemany(query, params)

    def commit(self):
        """Commit current transaction."""
        if self.conn:
            self.conn.commit()

    def rollback(self):
        """Rollback current transaction."""
        if self.conn:
            self.conn.rollback()

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()


def initialize_database(db_path: Optional[str] = None, schema_path: str = 'database_schema.sql'):
    """Initialize database with schema.

    Args:
        db_path: Path to SQLite database file
        schema_path: Path to SQL schema file
    """
    db = Database(db_path)

    try:
        db.connect()

        # Read schema file
        with open(schema_path, 'r') as f:
            schema = f.read()

        # Execute schema (split by semicolon for multiple statements)
        # Note: SQLite executescript doesn't support parameter substitution
        db.conn.executescript(schema)
        db.commit()

        print(f"✓ Database initialized successfully at: {db.db_path}")

    except Exception as e:
        print(f"✗ Error initializing database: {e}")
        raise
    finally:
        db.close()


if __name__ == '__main__':
    # Initialize database when run directly
    initialize_database()
