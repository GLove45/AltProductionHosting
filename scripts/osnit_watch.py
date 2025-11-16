#!/usr/bin/env python3
"""High-Overwatch OSNIT console program.

This script stitches together a mission profile with streaming OSNIT feeds to
produce a highly verbose situation report with analytics, as requested by Alt
Production Hosting leadership.  The default inputs live under docs/osnit but
custom JSON files can be supplied at runtime.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from textwrap import indent, wrap
from typing import Any, Dict, Iterable, List, Sequence

SEVERITY_WEIGHTS = {
    "critical": 100,
    "high": 80,
    "medium": 55,
    "low": 35,
    "info": 15,
}

DATE_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


@dataclass
class MissionProfile:
    name: str
    statement: str
    objectives: Sequence[Dict[str, str]]
    scope: Dict[str, Any]
    watchlist: Sequence[str]
    critical_assets: Sequence[str]
    thresholds: Dict[str, float]
    reporting: Dict[str, Any]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MissionProfile":
        return cls(
            name=data.get("mission_name", "Unnamed Mission"),
            statement=data.get("statement", ""),
            objectives=data.get("objectives", []),
            scope=data.get("scope", {}),
            watchlist=data.get("watchlist", []),
            critical_assets=data.get("critical_assets", []),
            thresholds=data.get("alert_thresholds", {}),
            reporting=data.get("reporting", {}),
        )


def load_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise SystemExit(f"Unable to load {path}: {exc}") from exc


def parse_timestamp(raw: str) -> datetime:
    try:
        return datetime.strptime(raw, DATE_FORMAT)
    except ValueError:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).replace(tzinfo=None)


def format_table(headers: Sequence[str], rows: Sequence[Sequence[Any]]) -> str:
    widths = [len(h) for h in headers]
    for row in rows:
        for idx, cell in enumerate(row):
            widths[idx] = max(widths[idx], len(str(cell)))

    def fmt_row(row: Sequence[Any]) -> str:
        parts = [str(cell).ljust(widths[idx]) for idx, cell in enumerate(row)]
        return " | ".join(parts)

    rule = "-+-".join("-" * w for w in widths)
    lines = [fmt_row(headers), rule]
    for row in rows:
        lines.append(fmt_row(row))
    return "\n".join(lines)


def wrap_lines(text: str, prefix: str = "    ") -> str:
    wrapped = ["".join(line) for line in wrap(text, width=90)]
    return indent("\n".join(wrapped), prefix)


def severity_score(severity: str, confidence: float) -> float:
    base = SEVERITY_WEIGHTS.get(severity.lower(), 25)
    return round(base * confidence, 2)


def build_watchlist_matrix(watchlist: Sequence[str], feeds: Sequence[Dict[str, Any]]):
    mentions = Counter()
    last_seen: Dict[str, str] = {}
    for feed in feeds:
        ts = feed.get("timestamp", "")
        for name in feed.get("mentions", []):
            for watch in watchlist:
                if name.lower() == watch.lower():
                    mentions[watch] += 1
                    last_seen[watch] = ts
    rows = []
    for watch in watchlist:
        rows.append(
            [
                watch,
                mentions.get(watch, 0),
                last_seen.get(watch, "-"),
            ]
        )
    return rows


def summarize_feeds(feeds: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    per_source = Counter()
    per_severity = Counter()
    tag_counter = Counter()
    locations = Counter()
    timeline: List[datetime] = []
    highest: List[Dict[str, Any]] = []

    for feed in feeds:
        per_source[feed.get("source", "Unknown")] += 1
        per_severity[feed.get("severity", "unknown")] += 1
        tag_counter.update(feed.get("tags", []))
        locations.update(feed.get("locations", []))
        try:
            timeline.append(parse_timestamp(feed["timestamp"]))
        except (KeyError, ValueError):
            continue
        feed["score"] = severity_score(feed.get("severity", "low"), feed.get("confidence", 0))
        highest.append(feed)

    highest.sort(key=lambda item: item.get("score", 0), reverse=True)
    timeline.sort()
    return {
        "per_source": per_source,
        "per_severity": per_severity,
        "tag_counter": tag_counter,
        "locations": locations,
        "timeline": timeline,
        "highest": highest[:5],
        "avg_score": round(
            sum(item.get("score", 0) for item in highest) / max(len(highest), 1), 2
        ),
    }


def analyze_against_thresholds(avg_score: float, thresholds: Dict[str, float]) -> str:
    ladder = sorted(((float(score), level) for level, score in thresholds.items()), reverse=True)
    for score, level in ladder:
        if avg_score >= score:
            return level.upper()
    return "LOW"


def render_actions(feeds: Sequence[Dict[str, Any]], mission: MissionProfile) -> List[str]:
    actions = []
    for feed in feeds:
        desc = f"[{feed['source']}] {feed['summary']}" if feed.get("summary") else feed.get("id")
        targets = [m for m in feed.get("mentions", []) if m in mission.watchlist]
        if feed.get("score", 0) >= mission.thresholds.get("high", 70):
            action = f"Escalate to incident command; watchers implicated: {', '.join(targets) or 'unlisted'}"
        elif feed.get("score", 0) >= mission.thresholds.get("medium", 50):
            action = "Task analyst for corroboration and sensor expansion."
        else:
            action = "Log for pattern analysis and keep under periodic review."
        actions.append(f"- {desc}\n  Recommended: {action}")
    return actions


def describe_scope(mission: MissionProfile) -> str:
    scope_lines = [
        f"Regions of interest : {', '.join(mission.scope.get('regions', [])) or 'Unspecified'}",
        f"Channels monitored  : {', '.join(mission.scope.get('channels', [])) or 'Unspecified'}",
        f"Time horizon (hrs)  : {mission.scope.get('time_horizon_hours', 'N/A')}"
    ]
    return "\n".join(scope_lines)


def print_section(title: str):
    rule = "=" * len(title)
    print(f"\n{title}\n{rule}")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="High-Overwatch OSNIT mission console with verbose analytics"
    )
    parser.add_argument(
        "--mission",
        default="docs/osnit/mission_profile.json",
        type=Path,
        help="Path to the mission profile JSON file",
    )
    parser.add_argument(
        "--feeds",
        default="docs/osnit/sample_feeds.json",
        type=Path,
        help="Path to the OSNIT feed collection JSON file",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=3,
        help="Number of highest scoring events to describe in the dossier section",
    )
    parser.add_argument(
        "--summary-json",
        type=Path,
        help="Optional path to export a compact machine-readable summary",
    )

    args = parser.parse_args(argv)

    mission = MissionProfile.from_dict(load_json(args.mission))
    feeds: List[Dict[str, Any]] = load_json(args.feeds)

    analytics = summarize_feeds(feeds)

    print_section("MISSION DIRECTIVE — KNOW YOUR OBJECTIVE")
    print(mission.name)
    print(wrap_lines(mission.statement))
    for objective in mission.objectives:
        print(f"  • {objective.get('title')}: {objective.get('detail')}")
    print()
    print(describe_scope(mission))

    print_section("SENSOR GRID — DEPLOY & ALIGN OVERWATCH")
    print("Critical assets under guard:")
    for asset in mission.critical_assets:
        print(f"  - {asset}")
    print()
    print("Watchlist readiness matrix:")
    matrix_rows = build_watchlist_matrix(mission.watchlist, feeds)
    print(format_table(["Entity", "Hits", "Last Mention"], matrix_rows))

    print_section("GATHER INTEL — SIGNAL COLLECTION")
    print("Feed volume by source:")
    source_rows = [[src, count] for src, count in analytics["per_source"].most_common()]
    print(format_table(["Source", "Count"], source_rows))
    print()
    print("Severity distribution:")
    severity_rows = [[level, count] for level, count in analytics["per_severity"].most_common()]
    print(format_table(["Severity", "Count"], severity_rows))
    print()
    tag_rows = [[tag, freq] for tag, freq in analytics["tag_counter"].most_common(6)]
    print("Top tags:")
    print(format_table(["Tag", "Frequency"], tag_rows))

    print_section("VERIFY & ASSESS — RISK SCORING")
    print(f"Average weighted score: {analytics['avg_score']}")
    level = analyze_against_thresholds(analytics["avg_score"], mission.thresholds)
    print(f"Threat posture: {level}")
    if analytics["timeline"]:
        start = analytics["timeline"][0].strftime(DATE_FORMAT)
        end = analytics["timeline"][-1].strftime(DATE_FORMAT)
        print(f"Coverage window: {start} → {end}")
    print()
    print("Hot locations:")
    location_rows = [[loc, freq] for loc, freq in analytics["locations"].most_common(5)]
    print(format_table(["Location", "Hits"], location_rows))

    print_section("BUILD DOSSIER — PRIORITIZED EVENTS")
    top = analytics["highest"][: args.top]
    actions = render_actions(top, mission)
    for idx, (feed, recommendation) in enumerate(zip(top, actions), start=1):
        header = f"Case {idx}: {feed['id']} ({feed['severity'].upper()} | score {feed['score']})"
        print(header)
        print("-" * len(header))
        print(wrap_lines(feed.get("summary", "No summary provided.")))
        if feed.get("mentions"):
            print(f"  Mentions: {', '.join(feed['mentions'])}")
        if feed.get("tags"):
            print(f"  Tags    : {', '.join(feed['tags'])}")
        if feed.get("links"):
            print(f"  Links   : {', '.join(feed['links'])}")
        print(recommendation)
        print()

    print_section("DATA & OUTCOME — REPORTING CHANNEL")
    print("Analytics snapshot ready for leadership transmission.")
    print(
        f"Cases reviewed: {len(top)} | Average score: {analytics['avg_score']} | Threat posture: {level}"
    )

    if args.summary_json:
        export = {
            "mission": mission.name,
            "threat_posture": level,
            "avg_score": analytics["avg_score"],
            "cases": [
                {
                    "id": feed["id"],
                    "source": feed["source"],
                    "severity": feed["severity"],
                    "score": feed["score"],
                    "mentions": feed.get("mentions", []),
                }
                for feed in top
            ],
        }
        args.summary_json.write_text(json.dumps(export, indent=2), encoding="utf-8")
        print(f"Summary exported to {args.summary_json}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
