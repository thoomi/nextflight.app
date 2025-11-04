#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flight Debrief — Improved Version
==================================
Enhancements over original:
- Fixed altitude fallback logic with validation
- Module-level imports (statistics)
- Named constants for all magic numbers
- Improved heading initialization
- Better moving average edge handling
- GPS gap detection
- Comprehensive type hints
- Refactored thermal detection
- Better early exit logic

Usage:
    python flight_debrief_improved.py myflight.igc [--json]
"""
import math
import statistics
import sys
from dataclasses import dataclass
from typing import Optional

# -------------------------------
# Configuration Constants
# -------------------------------

# Thermal Detection
MIN_CLIMB_RATE = 0.4  # m/s - minimum average climb to consider thermal
MIN_TURN_RATE = 5.0  # deg/s - minimum turn rate to detect circling
MIN_THERMAL_DURATION = 18.0  # seconds - minimum time to qualify as thermal
MIN_THERMAL_CLIMB_CHECK = 0.1  # m/s - instant climb threshold for thermal entry

# Smoothing
VARIO_SMOOTH_WINDOW = 5  # points for vario smoothing
TURN_SMOOTH_WINDOW = 5  # points for turn rate smoothing

# Early Exit Detection
STRONG_CLIMB_THRESHOLD = 1.2  # m/s - peak climb considered "strong"
EXIT_CLIMB_THRESHOLD = 0.8  # m/s - exit climb considered "still good"
TIME_SINCE_PEAK_THRESHOLD = 6.0  # seconds - exit too soon after peak

# GPS Quality
MAX_TIME_GAP = 10.0  # seconds - max gap before considering it a signal loss
MAX_SPEED_MPS = 30.0  # m/s - sanity check for paraglider speed
MIN_TRACK_POINTS = 10  # minimum points for valid track

# Analysis
CENTERING_TIP_DISTANCE = "30-50 m"  # advice distance for centering

# -------------------------------
# Data Structures
# -------------------------------


@dataclass
class TrackPoint:
    """Single GPS track point."""

    time_s: float
    lat: float
    lon: float
    alt_m: float
    alt_valid: bool


@dataclass
class ThermalSegment:
    """Detected thermal with metrics."""

    start_idx: int
    end_idx: int
    start_t: float
    end_t: float
    duration_s: float
    avg_climb: float
    max_climb: float
    peak_t: float
    circles: float
    dir_changes: int
    centering_std: float
    center_tip_bearing: float
    center_tip_dir: str
    early_exit: bool
    early_exit_t: Optional[float]


@dataclass
class FlightSummary:
    """Complete flight analysis summary."""

    duration_total: float
    max_alt: Optional[float]
    segments: list[ThermalSegment]
    time_to_first_thermal: Optional[float]
    best: Optional[ThermalSegment]
    gps_gaps: int


# -------------------------------
# Helpers
# -------------------------------


def parse_lat_lon_igc(
    lat_str: str, lat_hem: str, lon_str: str, lon_hem: str
) -> tuple[float, float]:
    """Parse IGC format lat/lon to decimal degrees."""
    # IGC lat: DDMMmmm (deg, minutes*1000), lon: DDDMMmmm
    dd = int(lat_str[0:2])
    mmmmm = int(lat_str[2:7])
    lat = dd + (mmmmm / 1000.0) / 60.0
    if lat_hem.upper() == "S":
        lat = -lat

    ddd = int(lon_str[0:3])
    mmmmmm = int(lon_str[3:8])
    lon = ddd + (mmmmmm / 1000.0) / 60.0
    if lon_hem.upper() == "W":
        lon = -lon

    return lat, lon


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters using Haversine formula."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate bearing from point 1 to point 2 in degrees."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def unwrap_angle_deg(prev: float, curr: float) -> float:
    """Unwrap angle difference to handle 360/0 discontinuity."""
    return (curr - prev + 540.0) % 360.0 - 180.0


def moving_avg(seq: list[float], window: int) -> list[float]:
    """
    Compute moving average with improved edge handling.
    Uses expanding window for first `window-1` points.
    """
    n = len(seq)
    if window <= 1 or window > n:
        return seq[:]

    out = [0.0] * n

    # Handle leading edge with expanding window
    for i in range(min(window, n)):
        out[i] = sum(seq[: i + 1]) / (i + 1)

    # Full window for middle section
    if n >= window:
        s = sum(seq[:window])
        for i in range(window, n):
            s += seq[i] - seq[i - window]
            out[i] = s / window

    return out


def compass_dir_from_bearing(bearing: float) -> str:
    """Convert bearing (0-360) to 8-point compass direction."""
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = int((bearing + 22.5) // 45) % 8
    return dirs[idx]


# -------------------------------
# IGC Parsing
# -------------------------------


def parse_igc(path: str) -> list[TrackPoint]:
    """
    Parse IGC file and return list of track points.
    Includes altitude validation and gap detection preparation.
    """
    points: list[TrackPoint] = []

    with open(path, encoding="latin-1") as f:
        for line in f:
            if not line or line[0] != "B" or len(line) < 35:
                continue

            try:
                HH = int(line[1:3])
                MM = int(line[3:5])
                SS = int(line[5:7])
                la_str, la_h = line[7:14], line[14]
                lo_str, lo_h = line[15:23], line[23]
                p_alt_str = line[25:30]
                g_alt_str = line[30:35]

                la, lo = parse_lat_lon_igc(la_str, la_h, lo_str, lo_h)
                t = HH * 3600 + MM * 60 + SS

                # Improved altitude parsing with validation
                def _parse_alt(s: str) -> Optional[int]:
                    try:
                        val = int(s)
                        # Basic sanity check for altitude
                        return val if -500 <= val <= 10000 else None
                    except (ValueError, TypeError):
                        return None

                g_alt = _parse_alt(g_alt_str)
                p_alt = _parse_alt(p_alt_str)

                # Prefer GPS altitude, fallback to pressure altitude
                # Track validity to handle missing data properly
                if g_alt is not None:
                    alt = float(g_alt)
                    alt_valid = True
                elif p_alt is not None:
                    alt = float(p_alt)
                    alt_valid = True
                else:
                    # Skip points with no valid altitude data
                    continue

                points.append(TrackPoint(time_s=t, lat=la, lon=lo, alt_m=alt, alt_valid=alt_valid))

            except (ValueError, IndexError):
                # Skip malformed lines
                continue

    if not points:
        raise ValueError(f"No valid IGC B-records found in {path}")

    # Unwrap midnight crossings
    unwrapped_times = [points[0].time_s]
    wraps = 0
    for i in range(1, len(points)):
        if points[i].time_s < points[i - 1].time_s - MAX_TIME_GAP:
            wraps += 1
        unwrapped_times.append(points[i].time_s + wraps * 24 * 3600)

    # Normalize to t0 = 0
    t0 = unwrapped_times[0]
    for i, point in enumerate(points):
        point.time_s = unwrapped_times[i] - t0

    return points


# -------------------------------
# Analysis
# -------------------------------


def compute_derived_metrics(
    points: list[TrackPoint],
) -> tuple[list[float], list[float], list[float], list[float], list[float], int]:
    """
    Compute derived metrics: dt, vario, heading, turn_rate, speed.
    Returns tuple of (dt, vario, heading, turn_rate, speed, gap_count).
    """
    n = len(points)
    dt = [0.0] * n
    vario = [0.0] * n
    heading = [0.0] * n
    turn_rate = [0.0] * n
    speed = [0.0] * n
    gap_count = 0

    for i in range(1, n):
        dti = max(1e-6, points[i].time_s - points[i - 1].time_s)
        dt[i] = dti

        # Detect GPS gaps
        if dti > MAX_TIME_GAP:
            gap_count += 1

        # Vario calculation
        dh = points[i].alt_m - points[i - 1].alt_m
        vario[i] = dh / dti

        # Speed calculation
        dist = haversine_m(
            points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon
        )
        speed[i] = dist / dti

        # Sanity check for speed
        if speed[i] > MAX_SPEED_MPS:
            # Likely GPS glitch; don't update heading
            speed[i] = speed[i - 1] if i > 1 else 0.0
            heading[i] = heading[i - 1] if i > 1 else 0.0
            turn_rate[i] = 0.0
            continue

        # Heading calculation
        if dist > 0.5:  # Only calculate heading if moved significantly
            h_curr = bearing_deg(
                points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon
            )
            heading[i] = h_curr

            # Turn rate calculation
            if i > 1:
                h_prev = heading[i - 1]
                dhead = unwrap_angle_deg(h_prev, h_curr)
                turn_rate[i] = dhead / dti
            else:
                turn_rate[i] = 0.0
        else:
            # Not enough movement, keep previous heading
            heading[i] = heading[i - 1] if i > 1 else 0.0
            turn_rate[i] = 0.0

    return dt, vario, heading, turn_rate, speed, gap_count


def detect_thermals(
    points: list[TrackPoint],
    dt: list[float],
    vario_s: list[float],
    turn_s: list[float],
) -> list[ThermalSegment]:
    """
    Detect thermal segments using circling and climb criteria.
    Returns list of detected thermals with metrics.
    """
    n = len(points)
    segments: list[ThermalSegment] = []

    in_thermal = False
    start_idx = 0
    acc_turn = 0.0

    for i in range(1, n):
        turning = abs(turn_s[i]) > MIN_TURN_RATE
        climbing = vario_s[i] > MIN_THERMAL_CLIMB_CHECK

        # Entry condition
        if not in_thermal and turning and climbing:
            in_thermal = True
            start_idx = i
            acc_turn = 0.0

        # Accumulate turn while in thermal
        if in_thermal:
            acc_turn += abs(turn_s[i]) * dt[i]

            # Exit condition
            leaving = (not turning) or (vario_s[i] < 0.0)

            if leaving:
                end_idx = i
                dur = points[end_idx].time_s - points[start_idx].time_s

                # Validate thermal duration
                if dur >= MIN_THERMAL_DURATION:
                    # Calculate segment statistics
                    seg_slice = slice(start_idx, end_idx + 1)
                    seg_vario = vario_s[seg_slice]
                    seg_turn = turn_s[seg_slice]

                    if not seg_vario:  # Safety check
                        in_thermal = False
                        continue

                    avg_vario = sum(seg_vario) / len(seg_vario)
                    avg_turn_abs = sum(abs(x) for x in seg_turn) / len(seg_turn)

                    # Validate thermal quality
                    if avg_vario >= MIN_CLIMB_RATE and avg_turn_abs >= MIN_TURN_RATE:
                        # Find peak climb
                        peak_idx = max(range(start_idx, end_idx + 1), key=lambda k: vario_s[k])
                        peak_t = points[peak_idx].time_s
                        peak_v = vario_s[peak_idx]

                        # Calculate circles
                        circles = acc_turn / 360.0

                        # Centering analysis
                        seg_points = points[seg_slice]
                        la_c = sum(p.lat for p in seg_points) / len(seg_points)
                        lo_c = sum(p.lon for p in seg_points) / len(seg_points)
                        brg_peak = bearing_deg(la_c, lo_c, points[peak_idx].lat, points[peak_idx].lon)
                        dir_label = compass_dir_from_bearing(brg_peak)

                        # Centering quality (stddev of vario)
                        try:
                            centering_std = statistics.pstdev(seg_vario)
                        except statistics.StatisticsError:
                            centering_std = 0.0

                        # Direction changes
                        dir_changes = sum(
                            1
                            for k in range(start_idx + 1, end_idx + 1)
                            if (turn_s[k] > 0) != (turn_s[k - 1] > 0)
                        )

                        # Early exit detection (improved logic)
                        end_v = vario_s[end_idx]
                        time_since_peak = points[end_idx].time_s - peak_t

                        # Exit is "early" if:
                        # 1. Peak was strong AND
                        # 2. (Still climbing well at exit OR left very soon after peak)
                        early_exit = peak_v >= STRONG_CLIMB_THRESHOLD and (
                            end_v >= EXIT_CLIMB_THRESHOLD
                            or time_since_peak < TIME_SINCE_PEAK_THRESHOLD
                        )
                        early_exit_t = points[end_idx].time_s if early_exit else None

                        segments.append(
                            ThermalSegment(
                                start_idx=start_idx,
                                end_idx=end_idx,
                                start_t=points[start_idx].time_s,
                                end_t=points[end_idx].time_s,
                                duration_s=dur,
                                avg_climb=avg_vario,
                                max_climb=peak_v,
                                peak_t=peak_t,
                                circles=circles,
                                dir_changes=dir_changes,
                                centering_std=centering_std,
                                center_tip_bearing=brg_peak,
                                center_tip_dir=dir_label,
                                early_exit=early_exit,
                                early_exit_t=early_exit_t,
                            )
                        )

                in_thermal = False
                acc_turn = 0.0

    return segments


def analyze(points: list[TrackPoint]) -> FlightSummary:
    """
    Perform complete flight analysis.
    Returns FlightSummary with all metrics and detected thermals.
    """
    n = len(points)
    if n < MIN_TRACK_POINTS:
        raise ValueError(f"Track too short: {n} points (minimum {MIN_TRACK_POINTS})")

    # Compute derived metrics
    dt, vario, heading, turn_rate, speed, gap_count = compute_derived_metrics(points)

    # Smooth signals
    vario_s = moving_avg(vario, VARIO_SMOOTH_WINDOW)
    turn_s = moving_avg(turn_rate, TURN_SMOOTH_WINDOW)

    # Detect thermals
    segments = detect_thermals(points, dt, vario_s, turn_s)

    # Summary statistics
    duration_total = points[-1].time_s - points[0].time_s
    max_alt = max(p.alt_m for p in points) if points else None
    time_to_first = segments[0].start_t if segments else None
    best = (
        max(segments, key=lambda s: (s.avg_climb, s.max_climb))
        if segments
        else None
    )

    return FlightSummary(
        duration_total=duration_total,
        max_alt=max_alt,
        segments=segments,
        time_to_first_thermal=time_to_first,
        best=best,
        gps_gaps=gap_count,
    )


# -------------------------------
# Output Formatting
# -------------------------------


def format_time(seconds: Optional[float]) -> str:
    """Format seconds as 'Xm Ys' string."""
    if seconds is None:
        return "-"
    m, s = divmod(int(round(seconds)), 60)
    return f"{m}m {s}s"


def debrief(summary: FlightSummary, as_json: bool = False) -> str:
    """
    Generate human-readable debrief text or JSON output.
    """
    if as_json:
        import json

        # Convert dataclasses to dicts for JSON serialization
        data = {
            "duration_total": summary.duration_total,
            "max_alt": summary.max_alt,
            "time_to_first_thermal": summary.time_to_first_thermal,
            "gps_gaps": summary.gps_gaps,
            "thermals_count": len(summary.segments),
            "segments": [
                {
                    "start_t": seg.start_t,
                    "end_t": seg.end_t,
                    "duration_s": seg.duration_s,
                    "avg_climb": seg.avg_climb,
                    "max_climb": seg.max_climb,
                    "peak_t": seg.peak_t,
                    "circles": seg.circles,
                    "dir_changes": seg.dir_changes,
                    "centering_std": seg.centering_std,
                    "center_tip_bearing": seg.center_tip_bearing,
                    "center_tip_dir": seg.center_tip_dir,
                    "early_exit": seg.early_exit,
                    "early_exit_t": seg.early_exit_t,
                }
                for seg in summary.segments
            ],
            "best": (
                {
                    "avg_climb": summary.best.avg_climb,
                    "max_climb": summary.best.max_climb,
                    "duration_s": summary.best.duration_s,
                }
                if summary.best
                else None
            ),
        }
        return json.dumps(data, indent=2)

    # Human-readable format
    segs = summary.segments
    best = summary.best
    ttf = summary.time_to_first_thermal
    total_dur = summary.duration_total
    max_alt = summary.max_alt

    lines = []
    lines.append("=== Quick Flight Debrief (improved heuristic) ===")
    lines.append(f"Total duration      : {format_time(total_dur)}")
    lines.append(f"Max GPS altitude    : {int(round(max_alt)) if max_alt else '-'} m")
    lines.append(f"Thermals detected   : {len(segs)}")
    lines.append(f"Time to first lift  : {format_time(ttf)}")

    if summary.gps_gaps > 0:
        lines.append(f"⚠ GPS signal gaps   : {summary.gps_gaps}")

    if best:
        lines.append("— Best thermal —")
        lines.append(
            f"  Time window       : {format_time(best.start_t)} → {format_time(best.end_t)}"
        )
        lines.append(
            f"  Peak climb        : {best.max_climb:.2f} m/s at {format_time(best.peak_t)}"
        )
        lines.append(f"  Duration          : {format_time(best.duration_s)}")
        lines.append(f"  Avg climb         : {best.avg_climb:.2f} m/s")
        lines.append(f"  Circles (approx.) : {best.circles:.1f}")
        lines.append(f"  Direction changes : {best.dir_changes}")
        lines.append(f"  Centering quality : σ(vario)={best.centering_std:.2f} m/s")
        lines.append(
            f"  Centering tip     : Nudge {CENTERING_TIP_DISTANCE} toward {best.center_tip_dir} "
            f"(bearing {best.center_tip_bearing:.0f}°) from your circle center."
        )
        if best.early_exit:
            lines.append(
                f"  Early exit?       : Yes — likely around {format_time(best.early_exit_t)}"
            )
        else:
            lines.append("  Early exit?       : No clear signal")
    else:
        lines.append("No clear thermals detected. (Sled ride or thresholds too strict.)")

    lines.append("")
    lines.append("== Coaching ==")

    # What went well
    if best and best.avg_climb > 0.6:
        ww = "You found usable lift and maintained a solid average climb."
    elif ttf is not None and ttf < 300:
        ww = "You found lift quickly after launch — good scanning and line choice."
    else:
        ww = "You kept the flight smooth; building airtime matters."
    lines.append(f"• What went well: {ww}")

    # What to improve
    if best and best.max_climb >= 1.5 and best.duration_s < 70:
        improve = (
            "You likely exited your strongest climb early. "
            "Commit to ~2 more circles when vario ≥ +1.5 m/s."
        )
    elif best and best.centering_std > 0.6 and best.circles >= 1.5:
        improve = (
            f"Centering consistency can improve. "
            f"Drift ~30 m toward {best.center_tip_dir} where lift peaked."
        )
    elif ttf is not None and ttf > 600:
        improve = "It took a while to find first lift. Probe windward edges of terrain triggers earlier."
    else:
        improve = (
            "During climbs, widen slightly when it feels rough; "
            "reassess after one calm circle instead of bailing."
        )
    lines.append(f"• What to improve: {improve}")

    # Safety/Mindset
    mindset = "Turbulence discomfort is normal. Breathe, loosen grip, and re-center before leaving lift."
    lines.append(f"• Safety/Mindset: {mindset}")

    # Next-flight plan
    if best and best.max_climb >= 1.2:
        plan = "When climb ≥ +1.2 m/s, stay for two additional circles before leaving."
    else:
        plan = "Pick one strong trigger; explore thoroughly before moving on."
    lines.append(f"• Next-flight plan: {plan}")

    return "\n".join(lines)


# -------------------------------
# Main
# -------------------------------


def main() -> None:
    """Main entry point for CLI usage."""
    if len(sys.argv) < 2:
        print("Usage: python flight_debrief_improved.py myflight.igc [--json]")
        sys.exit(1)

    path = sys.argv[1]
    as_json = "--json" in sys.argv[2:]

    try:
        points = parse_igc(path)
        summary = analyze(points)
        print(debrief(summary, as_json))
    except Exception as e:
        print(f"Error processing {path}: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
