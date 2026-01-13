# ESPN NCAAB API Documentation

## Base URL
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball
```

---

## Endpoints

### Get Seasons

**Endpoint:** `/seasons`

**Method:** GET

**Description:** Returns a paginated list of all available NCAAB seasons.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |
| `limit` | integer | No | `25` | Number of results per page (pageSize) |
| `page` | integer | No | `1` | Page number for pagination (pageIndex) |

#### Response Structure

```json
{
  "count": 88,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 4,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026?lang=en&region=us"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of seasons available |
| `pageIndex` | integer | Current page number (1-indexed) |
| `pageSize` | integer | Number of items per page |
| `pageCount` | integer | Total number of pages available |
| `items` | array | Array of season reference objects |
| `items[].$ref` | string | URL reference to individual season endpoint |

#### Examples

**Get all seasons (default pagination):**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons?lang=en&region=us
```

**Get 5 seasons per page:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons?lang=en&region=us&limit=5
```

**Get page 2 with 5 seasons per page:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons?lang=en&region=us&limit=5&page=2
```

#### Notes

- Seasons are returned in descending order (most recent first)
- Season data spans from 1939 to 2026 (88 total seasons as of this documentation)
- Each season item contains a `$ref` URL that points to detailed season information
- The API uses 1-based indexing for pages (pageIndex starts at 1)

---

### Get Teams by Season

**Endpoint:** `/seasons/{year}/teams`

**Method:** GET

**Description:** Returns a paginated list of all teams for a specific season.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/{year}/teams
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | Yes | Four-digit year of the season (e.g., 2026) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |
| `limit` | integer | No | `25` | Number of results per page (pageSize) |
| `page` | integer | No | `1` | Page number for pagination (pageIndex) |

#### Response Structure

```json
{
  "count": 1105,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 45,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/1?lang=en&region=us"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of teams in the season |
| `pageIndex` | integer | Current page number (1-indexed) |
| `pageSize` | integer | Number of items per page |
| `pageCount` | integer | Total number of pages available |
| `items` | array | Array of team reference objects |
| `items[].$ref` | string | URL reference to individual team endpoint for that season |

#### Examples

**Get all teams for 2026 season (default pagination):**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams?lang=en&region=us
```

**Get 10 teams per page:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams?lang=en&region=us&limit=10
```

**Get page 3 with 10 teams per page:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams?lang=en&region=us&limit=10&page=3
```

#### Notes

- The 2026 season includes 1,105 teams across all divisions
- Team IDs are integers and may not be sequential (some IDs are skipped)
- Each team item contains a `$ref` URL that points to detailed team information for that specific season
- Team count varies by season

---

### Get Season Types

**Endpoint:** `/seasons/{year}/types`

**Method:** GET

**Description:** Returns available season types (preseason, regular season, postseason, etc.).

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/{year}/types
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | Yes | Four-digit year of the season (e.g., 2026) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |

#### Response Structure

```json
{
  "count": 4,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 1,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/1?lang=en&region=us"
    },
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2?lang=en&region=us"
    }
  ]
}
```

#### Season Type Details

When accessing individual type endpoints (e.g., `/seasons/2026/types/2`), you get:

```json
{
  "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2?lang=en&region=us",
  "id": "2",
  "type": 2,
  "name": "Regular Season",
  "abbreviation": "reg",
  "year": 2026,
  "startDate": "2025-11-03T08:00Z",
  "endDate": "2026-03-17T06:59Z",
  "hasGroups": false,
  "hasStandings": true,
  "hasLegs": false,
  "groups": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups?lang=en&region=us"
  },
  "week": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/weeks/11?lang=en&region=us"
  },
  "weeks": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/weeks?lang=en&region=us"
  },
  "leaders": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/leaders?lang=en&region=us"
  }
}
```

#### Known Season Types

| ID | Name | Abbreviation | Has Standings |
|----|------|--------------|---------------|
| 1 | Preseason | pre | No |
| 2 | Regular Season | reg | Yes |
| 3 | Postseason | post | Varies |
| 4 | Off Season | off | No |

#### Examples

**Get all season types:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types?lang=en&region=us
```

**Get regular season details:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2?lang=en&region=us
```

#### Notes

- Type ID 2 (Regular Season) contains standings and conference groupings
- Each type has associated groups, weeks, and potentially leaders
- The `hasStandings` field indicates whether standings data is available for that type

---

### Get Groups (Divisions/Conferences)

**Endpoint:** `/seasons/{year}/types/{type_id}/groups`

**Method:** GET

**Description:** Returns divisions and conferences for a specific season type.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/{year}/types/{type_id}/groups
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | Yes | Four-digit year of the season (e.g., 2026) |
| `type_id` | integer | Yes | Season type ID (e.g., 2 for Regular Season) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |
| `limit` | integer | No | `25` | Number of results per page (pageSize) |
| `page` | integer | No | `1` | Page number for pagination (pageIndex) |

#### Response Structure

```json
{
  "count": 2,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 1,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/50?lang=en&region=us"
    }
  ]
}
```

#### Group Details

When accessing individual group endpoints (e.g., `/groups/50`), you get:

```json
{
  "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/50?lang=en&region=us",
  "uid": "s:40~l:41~g:50",
  "id": "50",
  "name": "NCAA Division I",
  "abbreviation": "NCAA",
  "shortName": "Division I",
  "midsizeName": "NCAA Division I",
  "isConference": false,
  "slug": "ncaa-division-i",
  "children": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/50/children?lang=en&region=us"
  },
  "standings": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/50/standings?lang=en&region=us"
  },
  "teams": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/50/teams?lang=en&region=us"
  }
}
```

For conferences (e.g., `/groups/1`):

```json
{
  "uid": "s:40~l:41~g:1",
  "id": "1",
  "name": "America East Conference",
  "abbreviation": "aeast",
  "shortName": "Am. East",
  "midsizeName": "America East",
  "isConference": true,
  "logos": [
    {
      "href": "https://a.espncdn.com/i/teamlogos/ncaa_conf/500/america_east.png"
    }
  ],
  "slug": "america-east-conference",
  "parent": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/50?lang=en&region=us"
  },
  "standings": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/1/standings?lang=en&region=us"
  },
  "teams": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/1/teams?lang=en&region=us"
  }
}
```

#### Examples

**Get all groups for regular season:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups?lang=en&region=us
```

**Get Division I details:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/50?lang=en&region=us
```

**Get Division I conferences (children):**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/50/children?lang=en&region=us
```

**Get conference teams:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/1/teams?lang=en&region=us
```

**Get conference standings:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/groups/1/standings?lang=en&region=us
```

#### Notes

- Groups have a hierarchical structure: Division I (group 50) contains conferences as children (31 conferences)
- The `isConference` field distinguishes between divisions and conferences
- Conferences include logo URLs
- Each group/conference has associated teams and standings endpoints
- Standings endpoint returns detailed team records including wins, losses, PPG, OPP PPG, differential, and more

---

### Get Events (Games)

**Endpoint:** `/events`

**Method:** GET

**Description:** Returns games/events for specified date ranges (daily, monthly, or yearly).

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |
| `dates` | string | Yes | - | Date filter in formats: `YYYYMMDD` (day), `YYYYMM` (month), or `YYYY` (year) |
| `limit` | integer | No | `25` | Number of results per page (pageSize) |
| `page` | integer | No | `1` | Page number for pagination (pageIndex) |

#### Date Format Examples

| Format | Example | Description |
|--------|---------|-------------|
| `YYYYMMDD` | `20260112` | Single day - January 12, 2026 |
| `YYYYMM` | `202601` | Full month - January 2026 |
| `YYYY` | `2026` | Full year - All of 2026 |

#### Response Structure

```json
{
  "$meta": {
    "parameters": {
      "seasTypes": ["2"],
      "season": ["2026"],
      "groups": ["50"],
      "dates": ["20260112"]
    }
  },
  "count": 17,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 1,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/401828689?lang=en&region=us"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `$meta` | object | Metadata about the query parameters used |
| `$meta.parameters.seasTypes` | array | Season types included (e.g., ["2"] for Regular Season) |
| `$meta.parameters.season` | array | Season year(s) included |
| `$meta.parameters.groups` | array | Group IDs included |
| `$meta.parameters.dates` | array | Date(s) included in results |
| `count` | integer | Total number of events/games matching the criteria |
| `pageIndex` | integer | Current page number (1-indexed) |
| `pageSize` | integer | Number of items per page |
| `pageCount` | integer | Total number of pages available |
| `items` | array | Array of event reference objects |
| `items[].$ref` | string | URL reference to individual event/game endpoint |

#### Examples

**Get all games for a specific day:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events?lang=en&region=us&dates=20260112
```

**Get all games for January 2026:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events?lang=en&region=us&dates=202601
```

**Get all games for 2026 season:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events?lang=en&region=us&dates=2026
```

**Get 10 games per page with pagination:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events?lang=en&region=us&dates=2026&limit=10&page=2
```

#### Notes

- Example counts (2026 season):
  - Single day (Jan 12): 17 games
  - Single month (January): 166 games
  - Full year (2026): 390 games (so far)
- The API automatically filters by regular season (seasTypes: ["2"]) by default
- Event IDs are unique identifiers for each game
- Each event reference URL provides detailed game information (teams, scores, stats, etc.)

---

### Get Team Events (Games by Team)

**Endpoint:** `/seasons/{year}/teams/{team_id}/events`

**Method:** GET

**Description:** Returns all games/events for a specific team in a season. This is the optimal way to get game IDs for a specific team.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/{year}/teams/{team_id}/events
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | Yes | Four-digit year of the season (e.g., 2026) |
| `team_id` | integer | Yes | ESPN team ID (e.g., 12 for Arizona) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |
| `limit` | integer | No | `25` | Number of results per page (pageSize) |
| `page` | integer | No | `1` | Page number for pagination (pageIndex) |

#### Response Structure

```json
{
  "count": 31,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 2,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/401826885?lang=en&region=us"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of games for the team this season |
| `pageIndex` | integer | Current page number (1-indexed) |
| `pageSize` | integer | Number of items per page |
| `pageCount` | integer | Total number of pages available |
| `items` | array | Array of event reference objects |
| `items[].$ref` | string | URL reference to individual event/game endpoint |

#### Examples

**Get all games for Arizona (team_id: 12) in 2026:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/12/events?lang=en&region=us
```

**Get team events with pagination:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/12/events?lang=en&region=us&limit=10&page=2
```

#### Notes

- This is the **optimal way** to get all game IDs for a specific team
- Includes all games: wins, losses, home, away, and neutral site
- Game order is typically chronological (oldest to newest)
- Can be found via the team endpoint's `events` reference: `/seasons/{year}/teams/{team_id}` → `events.$ref`

---

### Get Game Summary

**Endpoint:** `/summary` (Site API)

**Method:** GET

**Description:** Returns comprehensive game information including boxscore, player statistics, play-by-play, and more.

**Base URL:**
```
https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball
```

**URL:**
```
https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event={event_id}
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event` | integer | Yes | Event/game ID (e.g., 401827612) |

#### Response Structure

The response is a large JSON object containing multiple sections:

```json
{
  "boxscore": {
    "teams": [
      {
        "team": {
          "id": "12",
          "displayName": "Arizona Wildcats",
          "logo": "https://a.espncdn.com/i/teamlogos/ncaa/500/12.png"
        },
        "statistics": [
          {
            "name": "fieldGoalsMade-fieldGoalsAttempted",
            "displayValue": "34-67",
            "label": "FG"
          }
        ],
        "homeAway": "away"
      }
    ],
    "players": [
      {
        "team": { "id": "12" },
        "statistics": [
          {
            "athletes": [
              {
                "athlete": {
                  "displayName": "Player Name"
                },
                "stats": ["35", "18", "7-14", "2-5", "2-2", "8", "2", "1", "1", "0"]
              }
            ]
          }
        ]
      }
    ]
  },
  "header": { /* Game header info */ },
  "plays": { /* Play-by-play data */ },
  "winprobability": { /* Win probability chart */ },
  "gameInfo": { /* Additional game information */ },
  "leaders": { /* Statistical leaders */ },
  "standings": { /* Conference standings */ },
  "broadcasts": { /* TV/streaming info */ }
}
```

#### Key Data Sections

| Section | Description |
|---------|-------------|
| `boxscore.teams` | Team-level statistics (FG%, 3P%, FT%, rebounds, assists, steals, blocks, turnovers, points off turnovers, fast break points, points in paint, fouls, largest lead, lead changes, etc.) |
| `boxscore.players` | Individual player statistics (minutes, points, FG, 3PT, FT, rebounds, assists, turnovers, steals, blocks, etc.) |
| `header` | Game metadata (teams, scores, date, venue, status) |
| `plays` | Play-by-play data for the entire game |
| `winprobability` | Win probability data over time |
| `gameInfo` | Additional information (attendance, officials, etc.) |
| `leaders` | Top performers in key statistical categories |
| `standings` | Current conference standings |
| `broadcasts` | Broadcast and streaming information |

#### Team Statistics Available

- Field Goals Made/Attempted & Percentage
- 3-Point Field Goals Made/Attempted & Percentage
- Free Throws Made/Attempted & Percentage
- Total/Offensive/Defensive Rebounds
- Assists, Steals, Blocks
- Turnovers (Player, Team, Total)
- Technical Fouls, Flagrant Fouls
- Points Off Turnovers
- Fast Break Points
- Points in Paint
- Fouls
- Largest Lead
- Lead Changes
- Lead Percentage

#### Player Statistics Available

- Minutes Played
- Points
- Field Goals Made/Attempted
- 3-Point Field Goals Made/Attempted
- Free Throws Made/Attempted
- Rebounds (Total, Offensive, Defensive)
- Assists
- Turnovers
- Steals
- Blocks
- Personal Fouls

#### Examples

**Get game summary for event 401827612:**
```
GET https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=401827612
```

#### Notes

- This endpoint uses a different base URL (`site.api.espn.com`) compared to other endpoints
- Response size is very large (typically 600KB+) due to comprehensive data
- Contains complete game information including detailed player stats and play-by-play
- Best used when you need full game details, not just basic information
- Event IDs can be obtained from the `/events` endpoint or `/teams/{team_id}/events` endpoint

---

### Get Athletes (Players)

**Endpoint:** `/seasons/{year}/athletes`

**Method:** GET

**Description:** Returns all athletes/players for a specific season.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/{year}/athletes
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | Yes | Four-digit year of the season (e.g., 2026) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |
| `limit` | integer | No | `25` | Number of results per page (pageSize) |
| `page` | integer | No | `1` | Page number for pagination (pageIndex) |

#### Response Structure

```json
{
  "count": 7941,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 318,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/athletes/66696?lang=en&region=us"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of athletes in the season |
| `pageIndex` | integer | Current page number (1-indexed) |
| `pageSize` | integer | Number of items per page |
| `pageCount` | integer | Total number of pages available |
| `items` | array | Array of athlete reference objects |
| `items[].$ref` | string | URL reference to individual athlete endpoint |

#### Athlete Details

When accessing individual athlete endpoints (e.g., `/athletes/66696`), you get:

```json
{
  "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/athletes/66696?lang=en&region=us",
  "id": "66696",
  "uid": "s:40~l:41~a:66696",
  "guid": "6b68c6cb-49a7-663b-4855-26c77399109b",
  "firstName": "Jeff",
  "lastName": "Lowery",
  "fullName": "Jeff Lowery",
  "displayName": "Jeff Lowery",
  "shortName": "J. Lowery",
  "weight": 195.0,
  "displayWeight": "195 lbs",
  "height": 74.0,
  "displayHeight": "6' 2\"",
  "jersey": "11",
  "slug": "jeff-lowery",
  "birthPlace": {
    "city": "Phoenix",
    "state": "AZ",
    "country": "USA"
  },
  "position": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/positions/3?lang=en&region=us",
    "id": "3",
    "name": "Guard",
    "displayName": "Guard",
    "abbreviation": "G"
  },
  "experience": {
    "years": 4,
    "displayValue": "Senior",
    "abbreviation": "SR"
  },
  "status": {
    "id": "2",
    "name": "Inactive",
    "type": "inactive"
  },
  "team": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/2110?lang=en&region=us"
  },
  "college": {
    "$ref": "http://sports.core.api.espn.com/v2/colleges/2253?lang=en&region=us"
  },
  "eventLog": {
    "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/athletes/66696/eventlog?lang=en&region=us"
  }
}
```

#### Athlete Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Athlete ID |
| `uid` | string | Unique identifier (sport~league~athlete) |
| `guid` | string | Global unique identifier |
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `fullName` | string | Full name |
| `displayName` | string | Display name |
| `shortName` | string | Abbreviated name (e.g., "J. Lowery") |
| `weight` | number | Weight in pounds |
| `displayWeight` | string | Formatted weight with unit |
| `height` | number | Height in inches |
| `displayHeight` | string | Formatted height (e.g., "6' 2\"") |
| `jersey` | string | Jersey number |
| `slug` | string | URL-friendly identifier |
| `birthPlace` | object | Birth location (city, state, country) |
| `position` | object | Position info (id, name, abbreviation) |
| `experience` | object | Years of experience and class (FR, SO, JR, SR) |
| `status` | object | Active/inactive status |
| `team` | object | Current team reference |
| `college` | object | College reference |
| `eventLog` | object | Reference to player's game history |

#### Examples

**Get all athletes for 2026 season:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/athletes?lang=en&region=us
```

**Get athletes with pagination:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/athletes?lang=en&region=us&limit=10&page=50
```

**Get specific athlete details:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/athletes/66696?lang=en&region=us
```

#### Notes

- 7,941 total athletes in the 2026 season
- 318 pages with default page size of 25
- Athlete data is season-specific (links to specific season/team)
- Height stored in inches, weight in pounds
- Position IDs: Guard positions typically use id "3"
- Experience displayed as Freshman (FR), Sophomore (SO), Junior (JR), Senior (SR)
- Status indicates if player is active or inactive for the season
- Event log provides link to player's game history

---

### Get Venues

**Endpoint:** `/venues`

**Method:** GET

**Description:** Returns all venues/arenas used in NCAA men's college basketball.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/venues
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |
| `limit` | integer | No | `25` | Number of results per page (pageSize) |
| `page` | integer | No | `1` | Page number for pagination (pageIndex) |

#### Response Structure

```json
{
  "count": 988,
  "pageIndex": 1,
  "pageSize": 10,
  "pageCount": 99,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/venues/1064?lang=en&region=us"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of venues |
| `pageIndex` | integer | Current page number (1-indexed) |
| `pageSize` | integer | Number of items per page |
| `pageCount` | integer | Total number of pages available |
| `items` | array | Array of venue reference objects |
| `items[].$ref` | string | URL reference to individual venue endpoint |

#### Venue Details

When accessing individual venue endpoints (e.g., `/venues/1064`), you get:

```json
{
  "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/venues/1064?lang=en&region=us",
  "id": "1064",
  "guid": "0622eb02-dd5d-3b68-ac13-6b574db7790a",
  "fullName": "McKale Memorial Center",
  "address": {
    "city": "Tucson",
    "state": "AZ"
  },
  "grass": false,
  "indoor": true,
  "images": [
    {
      "href": "https://a.espncdn.com/i/venues/mens-college-basketball/day/1064.jpg",
      "width": 2000,
      "height": 1125,
      "alt": "",
      "rel": ["full", "day"]
    }
  ]
}
```

#### Venue Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Venue ID |
| `guid` | string | Global unique identifier |
| `fullName` | string | Full name of the venue |
| `address` | object | Address information (city, state) |
| `grass` | boolean | Whether venue has grass surface (always false for basketball) |
| `indoor` | boolean | Whether venue is indoors |
| `images` | array | Array of venue images with URLs and dimensions |

#### Examples

**Get all venues:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/venues?lang=en&region=us
```

**Get venues with pagination:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/venues?lang=en&region=us&limit=500
```

**Get specific venue details:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/venues/1064?lang=en&region=us
```

#### Notes

- 988 total venues in the database
- Venues are shared across multiple teams and seasons
- Images provided in high resolution (typically 2000x1125)
- Grass field is always false for basketball arenas
- Indoor field typically true for college basketball
- Venue data is referenced in team and event records

---

### Get Game Odds

**Endpoint:** `/events/{event_id}/competitions/{competition_id}/odds`

**Method:** GET

**Description:** Returns betting odds and lines for a specific game from various providers.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/{event_id}/competitions/{competition_id}/odds
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event_id` | integer | Yes | Event/game ID (e.g., 401827612) |
| `competition_id` | integer | Yes | Competition ID (typically same as event_id) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |

#### Response Structure

```json
{
  "count": 1,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 1,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/401827612/competitions/401827612/odds/100?lang=en&region=us",
      "provider": {
        "id": "100",
        "name": "Draft Kings",
        "priority": 1
      },
      "details": "ARIZ -7.5",
      "overUnder": 157.5,
      "spread": 7.5,
      "overOdds": -110.0,
      "underOdds": -110.0,
      "awayTeamOdds": {
        "favorite": true,
        "underdog": false,
        "moneyLine": -325,
        "spreadOdds": -105.0,
        "open": {
          "pointSpread": {
            "alternateDisplayValue": "-7.5",
            "american": "-7.5"
          },
          "moneyLine": {
            "value": 1.27,
            "decimal": 1.27,
            "fraction": "5/18",
            "american": "-360"
          }
        },
        "close": {
          "pointSpread": {
            "alternateDisplayValue": "-7.5",
            "american": "-7.5"
          },
          "spread": {
            "value": 1.95,
            "american": "-105"
          },
          "moneyLine": {
            "value": 1.3,
            "american": "-325"
          }
        }
      },
      "homeTeamOdds": {
        "favorite": false,
        "underdog": true,
        "moneyLine": 260,
        "spreadOdds": -115.0,
        "open": {
          "pointSpread": {
            "alternateDisplayValue": "+7.5",
            "american": "+7.5"
          },
          "moneyLine": {
            "value": 3.85,
            "american": "+285"
          }
        },
        "close": {
          "pointSpread": {
            "alternateDisplayValue": "+7.5",
            "american": "+7.5"
          },
          "moneyLine": {
            "value": 3.6,
            "american": "+260"
          }
        }
      },
      "moneylineWinner": false,
      "spreadWinner": false,
      "open": {
        "total": {
          "alternateDisplayValue": "150.5",
          "american": "150.5"
        }
      },
      "close": {
        "total": {
          "alternateDisplayValue": "157.5",
          "american": "157.5"
        }
      }
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `provider` | object | Betting provider info (id, name, priority) |
| `details` | string | Brief odds summary (e.g., "ARIZ -7.5") |
| `overUnder` | number | Total points over/under line |
| `spread` | number | Point spread (always positive, sign determined by favorite) |
| `overOdds` | number | Odds for over bet (American format) |
| `underOdds` | number | Odds for under bet (American format) |
| `awayTeamOdds` | object | Away team odds details |
| `homeTeamOdds` | object | Home team odds details |
| `moneylineWinner` | boolean | Whether game resulted in moneyline cover |
| `spreadWinner` | boolean | Whether game resulted in spread cover |
| `open` | object | Opening odds |
| `close` | object | Closing odds |

#### Team Odds Object Structure

| Field | Type | Description |
|-------|------|-------------|
| `favorite` | boolean | Whether team is favorite |
| `underdog` | boolean | Whether team is underdog |
| `moneyLine` | number | Moneyline odds (American format) |
| `spreadOdds` | number | Spread bet odds (American format) |
| `open` | object | Opening odds (pointSpread, moneyLine, spread) |
| `close` | object | Closing odds (pointSpread, moneyLine, spread) |
| `current` | object | Current odds during game |

#### Odds Formats

Each odds value typically includes multiple formats:
- `value` - Decimal odds
- `decimal` - Decimal format (e.g., 1.95)
- `fraction` - Fractional format (e.g., "20/21")
- `american` - American format (e.g., "-105")
- `alternateDisplayValue` - Display string

#### Examples

**Get odds for a specific game:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/401827612/competitions/401827612/odds?lang=en&region=us
```

#### Notes

- Provider ID 100 = Draft Kings (priority 1, typically primary provider)
- Odds include opening, closing, and current (during game) lines
- Point spread always shown as positive number, favorite indicated by separate field
- American odds format: negative = favorite, positive = underdog
- Over/Under line for total points scored by both teams
- Links provided for direct betting on various sportsbooks
- Not all games may have odds data available
- `moneylineWinner` and `spreadWinner` populated after game completion

---

### Get Game Predictor (BPI)

**Endpoint:** `/events/{event_id}/competitions/{competition_id}/predictor`

**Method:** GET

**Description:** Returns ESPN's Basketball Power Index (BPI) predictions and matchup quality metrics for a game.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/{event_id}/competitions/{competition_id}/predictor
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event_id` | integer | Yes | Event/game ID (e.g., 401827612) |
| `competition_id` | integer | Yes | Competition ID (typically same as event_id) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |

#### Response Structure

```json
{
  "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/401827612/competitions/401827612/predictor?lang=en&region=us",
  "name": "Arizona Wildcats at TCU Horned Frogs",
  "shortName": "ARIZ @ TCU",
  "lastModified": "2026-01-10T09:16Z",
  "homeTeam": {
    "team": {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/2628?lang=en&region=us"
    },
    "statistics": [
      {
        "name": "matchupquality",
        "displayName": "MATCHUP QUALITY",
        "description": "A measure of projected competitiveness and excitement in the game, using a 0 to 100 scale, with 100 as the most exciting",
        "value": 83.0517,
        "displayValue": "83.1"
      },
      {
        "name": "teampredwinpct",
        "displayName": "WIN PROB",
        "description": "Team's predicted win percentage in this game at time of given BPI run.",
        "value": 18.06,
        "displayValue": "18.1%"
      },
      {
        "name": "teampredmov",
        "displayName": "PRED PT DIFF",
        "description": "Expected margin of victory for the BPI favorite.",
        "value": -9.4475,
        "displayValue": "-9.4"
      },
      {
        "name": "gameProjection",
        "displayName": "WIN PROB",
        "value": 18.06,
        "displayValue": "18.1"
      }
    ]
  },
  "awayTeam": {
    "team": {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/12?lang=en&region=us"
    },
    "statistics": [
      {
        "name": "matchupquality",
        "value": 83.0517,
        "displayValue": "83.1"
      },
      {
        "name": "teampredwinpct",
        "value": 81.94,
        "displayValue": "81.9%"
      },
      {
        "name": "teampredmov",
        "value": 9.4475,
        "displayValue": "9.4"
      }
    ]
  }
}
```

#### Key Statistics

| Statistic Name | Description | Range/Format |
|----------------|-------------|--------------|
| `matchupquality` | Measure of game competitiveness and excitement | 0-100 (100 = most exciting) |
| `teampredwinpct` | Team's predicted win probability | 0-100% |
| `teampredmov` | Predicted point differential (margin of victory) | +/- points (positive = favored to win) |
| `gameProjection` | Team's win probability (same as teampredwinpct) | 0-100 |
| `opponentpredwinpct` | Opponent's predicted win probability | 0-100% |
| `rawgamescore` | Post-game: Performance vs expectations | Empty pre-game, populated after |
| `teamChanceTie` | Probability of tie (always 0 for basketball) | 0 |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full game matchup name |
| `shortName` | string | Abbreviated matchup (e.g., "ARIZ @ TCU") |
| `lastModified` | timestamp | When predictions were last updated |
| `homeTeam` | object | Home team predictions |
| `awayTeam` | object | Away team predictions |
| `homeTeam.statistics` | array | Array of prediction metrics |
| `awayTeam.statistics` | array | Array of prediction metrics |

#### Examples

**Get predictor for a specific game:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/events/401827612/competitions/401827612/predictor?lang=en&region=us
```

#### Use Cases & Insights

**1. Pre-Game Analysis:**
- Compare BPI win probability vs betting odds
- Identify potential upsets (low win prob favorites)
- Filter for competitive games (matchup quality > 70)

**2. Model Accuracy Tracking:**
- Compare predicted win % vs actual outcomes
- Calculate BPI model calibration over time
- Track prediction errors (predicted margin vs actual)

**3. Value Betting:**
- Find discrepancies between BPI and sportsbook lines
- Identify games where BPI disagrees with market

**4. Matchup Quality:**
```
High Quality (> 70): Competitive, exciting games
Medium Quality (40-70): Moderate competitiveness
Low Quality (< 40): Likely blowout
```

**Example Analysis:**
- Arizona @ TCU: 81.9% win prob, +9.4 predicted margin, 83.1 quality → Competitive game with clear favorite
- NCCU @ Morgan: 57.3% win prob, +1.8 predicted margin, 22.9 quality → Close game between weaker teams

**5. Post-Game Analysis:**
- `rawgamescore` populated after game completion
- Measures team performance vs expectations
- Identifies overperforming/underperforming teams

#### Notes

- Predictions based on ESPN's Basketball Power Index (BPI)
- Updated regularly (check `lastModified` timestamp)
- Win probabilities sum to 100% between teams
- Predicted margin is reciprocal between home/away (one positive, one negative)
- Matchup quality considers both team strength and competitiveness
- Post-game `rawgamescore` compares actual vs expected performance
- Not all games may have predictor data available
- Predictions made before game, useful for comparing vs actual outcomes

---

### Get Rankings

**Endpoint:** `/seasons/{year}/rankings/{ranking_id}`

**Method:** GET

**Description:** Returns weekly poll rankings (AP Top 25 and Coaches Poll) for a specific season.

**URL:**
```
https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/{year}/rankings/{ranking_id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | Yes | Four-digit year of the season (e.g., 2026) |
| `ranking_id` | integer | Yes | Ranking type ID (1 = AP Poll, 2 = Coaches Poll) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | `en` | Language code for response |
| `region` | string | No | `us` | Region code for response |

#### Ranking Types

| ID | Name | Type Code |
|----|------|-----------|
| 1 | AP Top 25 | `ap` |
| 2 | Coaches Poll | `usa` |

#### Response Structure

**List of Available Ranking Types:**
```json
{
  "count": 2,
  "pageIndex": 1,
  "pageSize": 25,
  "pageCount": 1,
  "items": [
    {
      "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/rankings/1?lang=en&region=us"
    }
  ]
}
```

**Specific Ranking Type (shows weeks):**
```json
{
  "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/rankings/1?lang=en&region=us",
  "type": "ap",
  "ranks": {
    "count": 11,
    "pageIndex": 1,
    "pageSize": 25,
    "pageCount": 1,
    "items": [
      {
        "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/weeks/11/rankings/1?lang=en&region=us"
      }
    ]
  }
}
```

**Weekly Rankings Detail:**
```json
{
  "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/weeks/11/rankings/1?lang=en&region=us",
  "type": "ap",
  "headline": "AP Top 25",
  "seasonType": 2,
  "season": 2026,
  "week": 11,
  "date": "2026-01-12T08:00Z",
  "lastUpdated": "2026-01-12T16:14Z",
  "ranks": [
    {
      "current": 1,
      "previous": 1,
      "points": 1524.0,
      "firstPlaceVotes": 60,
      "trend": "-",
      "record": {
        "summary": "16-0",
        "stats": [
          {
            "name": "wins",
            "value": 16
          },
          {
            "name": "losses",
            "value": 0
          }
        ]
      },
      "team": {
        "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/12?lang=en&region=us"
      },
      "date": "2026-01-12T08:00Z"
    }
  ],
  "others": [
    {
      "points": 35.0,
      "team": {
        "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/96?lang=en&region=us"
      }
    }
  ],
  "droppedOut": [
    {
      "team": {
        "$ref": "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/teams/2509?lang=en&region=us"
      }
    }
  ]
}
```

#### Response Fields

**Weekly Rankings Object:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Ranking type code ("ap" or "usa") |
| `headline` | string | Display title (e.g., "AP Top 25") |
| `seasonType` | integer | Season type ID (2 = Regular Season) |
| `season` | integer | Season year |
| `week` | integer | Week number within the season |
| `date` | timestamp | Date of the ranking |
| `lastUpdated` | timestamp | When rankings were last updated |
| `ranks` | array | Array of ranked teams (1-25) |
| `others` | array | Teams receiving votes but not in top 25 |
| `droppedOut` | array | Teams that dropped out of top 25 this week |

**Rank Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `current` | integer | Current rank (1-25) |
| `previous` | integer | Previous week's rank |
| `points` | number | Total voting points received |
| `firstPlaceVotes` | integer | Number of first-place votes |
| `trend` | string | Movement indicator ("-" = no change, "+1" = up 1, "-2" = down 2, etc.) |
| `record` | object | Team's current season record |
| `record.summary` | string | Win-loss record (e.g., "16-0") |
| `record.stats` | array | Detailed win/loss breakdown |
| `team` | object | Team reference |
| `date` | timestamp | Date of this ranking |

**Others Object Fields (Teams Receiving Votes):**

| Field | Type | Description |
|-------|------|-------------|
| `points` | number | Voting points received |
| `team` | object | Team reference |

**Dropped Out Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `team` | object | Team reference |

#### Examples

**Get available ranking types for 2026:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/rankings?lang=en&region=us
```

**Get AP Poll weeks for 2026:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/rankings/1?lang=en&region=us
```

**Get specific week's AP Poll (Week 11):**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/weeks/11/rankings/1?lang=en&region=us
```

**Get Coaches Poll for Week 11:**
```
GET https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/weeks/11/rankings/2?lang=en&region=us
```

#### Notes

- Two ranking types available: AP Top 25 (id=1) and Coaches Poll (id=2)
- Rankings published weekly throughout the season (11 weeks in 2026 season so far)
- Each week includes:
  - Top 25 ranked teams with detailed voting data
  - Teams receiving votes but not in top 25
  - Teams that dropped out from previous week
- Trend indicator shows movement:
  - "-" means no change in rank
  - "+N" means moved up N positions
  - "-N" means moved down N positions
  - "NR" (not ranked) for newly ranked teams
- First place votes show how many voters ranked a team #1
- Points calculated based on voting system (25 points for #1 vote, 24 for #2, etc.)
- Record summary shows current season wins-losses
- Rankings are season and week specific
- `lastUpdated` timestamp shows when rankings were last refreshed
- Weekly rankings allow tracking team movement over time
- Useful for analyzing team strength, momentum, and national perception
- Can compare AP Poll vs Coaches Poll for same week

---
