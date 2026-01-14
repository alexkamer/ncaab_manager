"""
ESPN API client for fetching NCAA Basketball data.
"""
import time
import requests
from typing import Optional, Dict, List, Any
from tqdm import tqdm
import threading
import config


class ESPNAPIClient:
    """Client for interacting with ESPN NCAA Basketball API."""

    def __init__(self, rate_limit: Optional[int] = None):
        """Initialize API client.

        Args:
            rate_limit: Maximum requests per second (default from config)
        """
        self.base_url = config.ESPN_BASE_URL
        self.site_base_url = config.ESPN_SITE_BASE_URL
        self.rate_limit = rate_limit or config.RATE_LIMIT
        self.last_request_time = 0
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'NCAA Basketball Database Population Script'
        })
        # Thread safety for rate limiting
        self._rate_limit_lock = threading.Lock()

    def _rate_limit_wait(self):
        """Wait if necessary to respect rate limit (thread-safe)."""
        with self._rate_limit_lock:
            if self.rate_limit > 0:
                min_interval = 1.0 / self.rate_limit
                elapsed = time.time() - self.last_request_time
                if elapsed < min_interval:
                    time.sleep(min_interval - elapsed)
            self.last_request_time = time.time()

    def _make_request(self, url: str, params: Optional[Dict] = None) -> Dict:
        """Make HTTP request with rate limiting and error handling.

        Args:
            url: Full URL to request
            params: Query parameters

        Returns:
            JSON response as dictionary

        Raises:
            requests.RequestException: On HTTP errors
        """
        self._rate_limit_wait()

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching {url}: {e}")
            raise

    def get_paginated(self, endpoint: str, params: Optional[Dict] = None,
                     show_progress: bool = True) -> List[Dict]:
        """Fetch all pages of a paginated endpoint.

        Args:
            endpoint: API endpoint path (e.g., '/seasons') or full URL
            params: Query parameters
            show_progress: Show progress bar

        Returns:
            List of all items from all pages
        """
        params = params or {}
        params.setdefault('lang', config.DEFAULT_LANG)
        params.setdefault('region', config.DEFAULT_REGION)

        # Construct full URL if endpoint is just a path
        if endpoint.startswith('http'):
            url = endpoint
        else:
            url = f"{self.base_url}{endpoint}"

        all_items = []
        page = 1

        # Get first page to determine total
        first_response = self._make_request(url, {**params, 'page': page})

        total_count = first_response.get('count', 0)
        page_size = first_response.get('pageSize', 25)
        page_count = first_response.get('pageCount', 1)

        # Add items from first page
        items = first_response.get('items', [])
        all_items.extend(items)

        # Fetch remaining pages
        if page_count > 1:
            if show_progress:
                pbar = tqdm(total=total_count, initial=len(items),
                           desc=f"Fetching pages", unit="items")

            for page in range(2, page_count + 1):
                response = self._make_request(url, {**params, 'page': page})
                items = response.get('items', [])
                all_items.extend(items)

                if show_progress:
                    pbar.update(len(items))

            if show_progress:
                pbar.close()

        return all_items

    def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Get data from an endpoint.

        Args:
            endpoint: API endpoint path (e.g., '/seasons')
            params: Query parameters

        Returns:
            JSON response
        """
        params = params or {}
        params.setdefault('lang', config.DEFAULT_LANG)
        params.setdefault('region', config.DEFAULT_REGION)

        url = f"{self.base_url}{endpoint}"
        return self._make_request(url, params)

    def get_from_ref(self, ref_url: str) -> Dict:
        """Get data from a $ref URL.

        Args:
            ref_url: Full reference URL

        Returns:
            JSON response
        """
        return self._make_request(ref_url)

    def get_site_api(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Get data from the site API (e.g., game summaries).

        Args:
            endpoint: API endpoint path (e.g., '/summary')
            params: Query parameters

        Returns:
            JSON response
        """
        url = f"{self.site_base_url}{endpoint}"
        return self._make_request(url, params)

    # Convenience methods for common endpoints

    def get_seasons(self, limit: int = 1000) -> List[Dict]:
        """Get all seasons.

        Args:
            limit: Maximum items per page

        Returns:
            List of season references
        """
        return self.get_paginated('/seasons', {'limit': limit})

    def get_season_teams(self, year: int, limit: int = 1000) -> List[Dict]:
        """Get all teams for a season.

        Args:
            year: Season year
            limit: Maximum items per page

        Returns:
            List of team references
        """
        return self.get_paginated(f'/seasons/{year}/teams', {'limit': limit})

    def get_season_types(self, year: int) -> Dict:
        """Get season types for a year.

        Args:
            year: Season year

        Returns:
            Season types data
        """
        return self.get(f'/seasons/{year}/types')

    def get_groups(self, year: int, type_id: int = 2) -> List[Dict]:
        """Get groups/conferences for a season type.

        Args:
            year: Season year
            type_id: Season type ID (default 2 = Regular Season)

        Returns:
            List of group references
        """
        return self.get_paginated(f'/seasons/{year}/types/{type_id}/groups')

    def get_events(self, dates: str, limit: int = 1000, groups: int = 52) -> List[Dict]:
        """Get events/games for a date range.

        Args:
            dates: Date string (YYYYMMDD, YYYYMM, or YYYY)
            limit: Maximum items per page
            groups: Group ID filter (default 52 = Division I, omit for Top 25 only)

        Returns:
            List of event references
        """
        params = {'dates': dates, 'limit': limit}
        if groups:
            params['groups'] = groups
        return self.get_paginated('/events', params)

    def get_team_events(self, year: int, team_id: int, limit: int = 1000) -> List[Dict]:
        """Get all events for a team in a season.

        Args:
            year: Season year
            team_id: Team ID
            limit: Maximum items per page

        Returns:
            List of event references
        """
        return self.get_paginated(
            f'/seasons/{year}/teams/{team_id}/events',
            {'limit': limit}
        )

    def get_game_summary(self, event_id: int) -> Dict:
        """Get comprehensive game summary.

        Args:
            event_id: Event/game ID

        Returns:
            Game summary data
        """
        return self.get_site_api('/summary', {'event': event_id})

    def get_athletes(self, year: int, limit: int = 1000) -> List[Dict]:
        """Get all athletes for a season.

        Args:
            year: Season year
            limit: Maximum items per page

        Returns:
            List of athlete references
        """
        return self.get_paginated(f'/seasons/{year}/athletes', {'limit': limit})

    def get_venues(self, limit: int = 1000) -> List[Dict]:
        """Get all venues.

        Args:
            limit: Maximum items per page

        Returns:
            List of venue references
        """
        return self.get_paginated('/venues', {'limit': limit})

    def get_game_odds(self, event_id: int) -> Dict:
        """Get odds for a game.

        Args:
            event_id: Event/game ID

        Returns:
            Odds data
        """
        return self.get(
            f'/events/{event_id}/competitions/{event_id}/odds'
        )

    def get_game_predictor(self, event_id: int) -> Dict:
        """Get BPI predictions for a game.

        Args:
            event_id: Event/game ID

        Returns:
            Predictor data
        """
        return self.get(
            f'/events/{event_id}/competitions/{event_id}/predictor'
        )

    def get_rankings(self, year: int, ranking_id: int,
                    type_id: int = 2, week: Optional[int] = None) -> Dict:
        """Get rankings for a season.

        Args:
            year: Season year
            ranking_id: Ranking type ID (1=AP Poll, 2=Coaches Poll)
            type_id: Season type ID (default 2 = Regular Season)
            week: Specific week number (optional)

        Returns:
            Rankings data
        """
        if week:
            return self.get(
                f'/seasons/{year}/types/{type_id}/weeks/{week}/rankings/{ranking_id}'
            )
        else:
            return self.get(f'/seasons/{year}/rankings/{ranking_id}')


if __name__ == '__main__':
    # Test API client
    client = ESPNAPIClient()

    print("Testing API client...")
    print("\n1. Fetching seasons...")
    seasons = client.get_seasons(limit=5)
    print(f"   Found {len(seasons)} seasons (limited to 5)")

    print("\n2. Fetching teams for 2026...")
    teams = client.get_season_teams(2026, limit=10)
    print(f"   Found {len(teams)} teams (limited to 10)")

    print("\nAPI client test completed!")
