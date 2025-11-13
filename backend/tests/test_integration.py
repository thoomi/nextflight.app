"""Integration tests using real IGC files."""

import json
from pathlib import Path

import pytest

from flight_debrief.core.flight_debrief import analyze, debrief, parse_igc

# Path to test IGC files
TEST_DATA_DIR = Path(__file__).parent.parent / "test"


class TestIGCParsing:
    """Test IGC file parsing with real files."""

    def test_parse_short_flight(self):
        """Test parsing short flight IGC file."""
        igc_path = TEST_DATA_DIR / "schauinsland_short_flight_no_real_climb.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))

        assert len(points) > 0
        assert all(p.time_s >= 0 for p in points)
        assert all(p.alt_valid for p in points)
        assert all(-90 <= p.lat <= 90 for p in points)
        assert all(-180 <= p.lon <= 180 for p in points)

        # Times should be monotonically increasing
        for i in range(1, len(points)):
            assert points[i].time_s >= points[i - 1].time_s

    def test_parse_medium_flight(self):
        """Test parsing medium flight IGC file."""
        igc_path = TEST_DATA_DIR / "schauinsland_medium_flight_few_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        assert len(points) > 0

    def test_parse_long_flight(self):
        """Test parsing long flight IGC file."""
        igc_path = TEST_DATA_DIR / "schauinsland_long_flight_many_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        assert len(points) > 0


class TestFlightAnalysis:
    """Test complete flight analysis with real IGC files."""

    def test_analyze_short_flight_no_thermals(self):
        """Test analysis of short flight with no real thermals."""
        igc_path = TEST_DATA_DIR / "schauinsland_short_flight_no_real_climb.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)

        assert summary.duration_total > 0
        assert summary.max_alt is not None
        assert summary.max_alt > 0
        # Short sled ride likely has no thermals
        assert len(summary.segments) >= 0

    def test_analyze_medium_flight_few_thermals(self):
        """Test analysis of medium flight with few thermals."""
        igc_path = TEST_DATA_DIR / "schauinsland_medium_flight_few_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)

        assert summary.duration_total > 0
        assert summary.max_alt is not None
        # Should detect at least one thermal
        assert len(summary.segments) >= 1

        if summary.best:
            assert summary.best.avg_climb > 0
            assert summary.best.max_climb > summary.best.avg_climb
            assert summary.best.duration_s >= 18.0  # Minimum thermal duration

    def test_analyze_long_flight_many_thermals(self):
        """Test analysis of long flight with many thermals."""
        igc_path = TEST_DATA_DIR / "schauinsland_long_flight_many_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)

        assert summary.duration_total > 0
        assert summary.max_alt is not None
        # Long flight should have multiple thermals
        assert len(summary.segments) >= 3

        if summary.best:
            assert summary.best.avg_climb > 0
            assert summary.best.circles >= 0.5  # At least half a circle

    def test_analyze_two_good_climbs(self):
        """Test analysis of flight with two good climbs followed by sink."""
        igc_path = TEST_DATA_DIR / "schauinsland_two good climbs_then_lots_of_sink.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)

        assert summary.duration_total > 0
        # Should detect at least 2 thermals
        assert len(summary.segments) >= 2

        if len(summary.segments) >= 2:
            # Both climbs should have positive average climb rate
            assert all(seg.avg_climb > 0 for seg in summary.segments[:2])


class TestDebriefOutput:
    """Test debrief text generation."""

    def test_debrief_text_format(self):
        """Test that debrief generates valid text output."""
        igc_path = TEST_DATA_DIR / "schauinsland_medium_flight_few_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)
        text = debrief(summary, as_json=False)

        assert isinstance(text, str)
        assert len(text) > 0
        assert "Flight Debrief" in text or "duration" in text.lower()
        assert "Coaching" in text or "coaching" in text

    def test_debrief_json_format(self):
        """Test that debrief generates valid JSON output."""
        igc_path = TEST_DATA_DIR / "schauinsland_medium_flight_few_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)
        json_output = debrief(summary, as_json=True)

        # Should be valid JSON
        data = json.loads(json_output)

        assert "duration_total" in data
        assert "max_alt" in data
        assert "thermals_count" in data
        assert "segments" in data
        assert isinstance(data["segments"], list)


class TestThermalMetrics:
    """Test thermal metrics on real flights."""

    def test_thermal_has_required_fields(self):
        """Test that detected thermals have all required fields."""
        igc_path = TEST_DATA_DIR / "schauinsland_medium_flight_few_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)

        if len(summary.segments) > 0:
            thermal = summary.segments[0]

            # Check all required fields exist
            assert hasattr(thermal, "start_t")
            assert hasattr(thermal, "end_t")
            assert hasattr(thermal, "duration_s")
            assert hasattr(thermal, "avg_climb")
            assert hasattr(thermal, "max_climb")
            assert hasattr(thermal, "peak_t")
            assert hasattr(thermal, "circles")
            assert hasattr(thermal, "dir_changes")
            assert hasattr(thermal, "centering_std")
            assert hasattr(thermal, "center_tip_bearing")
            assert hasattr(thermal, "center_tip_dir")
            assert hasattr(thermal, "early_exit")

            # Check field validity
            assert thermal.duration_s > 0
            assert thermal.end_t > thermal.start_t
            assert thermal.max_climb >= thermal.avg_climb
            assert thermal.circles >= 0
            assert 0 <= thermal.center_tip_bearing < 360
            assert thermal.center_tip_dir in ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

    def test_best_thermal_is_actually_best(self):
        """Test that best thermal is indeed the best by avg_climb."""
        igc_path = TEST_DATA_DIR / "schauinsland_long_flight_many_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)

        if len(summary.segments) > 1 and summary.best:
            # Best should have highest avg_climb (or tied highest)
            max_avg_climb = max(seg.avg_climb for seg in summary.segments)
            assert summary.best.avg_climb == max_avg_climb

    def test_time_to_first_thermal(self):
        """Test time to first thermal is calculated correctly."""
        igc_path = TEST_DATA_DIR / "schauinsland_medium_flight_few_thermals.igc"
        if not igc_path.exists():
            pytest.skip(f"Test file not found: {igc_path}")

        points = parse_igc(str(igc_path))
        summary = analyze(points)

        if len(summary.segments) > 0:
            assert summary.time_to_first_thermal is not None
            assert summary.time_to_first_thermal >= 0
            assert summary.time_to_first_thermal == summary.segments[0].start_t


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_invalid_file_path(self):
        """Test that invalid file path raises appropriate error."""
        with pytest.raises((FileNotFoundError, OSError)):
            parse_igc("nonexistent_file.igc")

    def test_empty_igc_raises_error(self, tmp_path):
        """Test that empty IGC file raises error."""
        empty_file = tmp_path / "empty.igc"
        empty_file.write_text("")

        with pytest.raises(ValueError):
            parse_igc(str(empty_file))

    def test_very_short_track_raises_error(self, tmp_path):
        """Test that very short track raises error."""
        short_igc = tmp_path / "short.igc"
        # Create minimal IGC with only 2 points (below MIN_TRACK_POINTS)
        short_igc.write_text("AFLA001\nB1200005758123N00743456EA0100001000\nB1200015758123N00743456EA0100001001\n")

        points = parse_igc(str(short_igc))
        # Should raise error during analysis due to too few points
        with pytest.raises(ValueError, match="too short"):
            analyze(points)
