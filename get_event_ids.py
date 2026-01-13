"""
Get list of event IDs for a given date range.
"""
from api_client import ESPNAPIClient


def get_event_ids(dates: str):
    """Get all event IDs for a date range.

    Args:
        dates: Date string (YYYYMMDD, YYYYMM, or YYYY)

    Returns:
        List of event IDs
    """
    client = ESPNAPIClient()

    print(f"\nFetching events for {dates}...")
    event_refs = client.get_events(dates, limit=1000, groups=50)

    print(f"Found {len(event_refs)} events")

    # Extract event IDs from references
    event_ids = []
    for ref_obj in event_refs:
        ref_url = ref_obj.get('$ref', '')
        # Extract ID from URL like: .../events/401234567
        if ref_url:
            event_id = ref_url.split('/')[-1]
            # Remove query parameters if present
            event_id = event_id.split('?')[0]
            event_ids.append(event_id)

    return event_ids


def main(dates: str, output_file: str = None):
    """Main function to get event IDs.

    Args:
        dates: Date string - YYYYMMDD (day), YYYYMM (month), or YYYY (year)
        output_file: Optional file to save IDs to (one per line)
    """
    event_ids = get_event_ids(dates)

    if output_file:
        with open(output_file, 'w') as f:
            for event_id in event_ids:
                f.write(f"{event_id}\n")
        print(f"\n✓ Saved {len(event_ids)} event IDs to {output_file}")
    else:
        print("\nEvent IDs:")
        for event_id in event_ids:
            print(event_id)

    print(f"\nSample summary URL:")
    if event_ids:
        print(f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event={event_ids[0]}")


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python get_event_ids.py <dates> [output_file]")
        print("  dates: YYYYMMDD (day), YYYYMM (month), or YYYY (year)")
        print("  output_file: Optional file to save IDs (one per line)")
        print()
        print("Examples:")
        print("  python get_event_ids.py 2026")
        print("  python get_event_ids.py 202601")
        print("  python get_event_ids.py 202601 events_jan2026.txt")
        sys.exit(1)

    dates = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    main(dates=dates, output_file=output_file)
