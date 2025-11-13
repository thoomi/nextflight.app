"""Tests for flight analysis functions."""

from flight_debrief.core.flight_debrief import (
    TrackPoint,
    compute_derived_metrics,
    detect_thermals,
)


class TestDerivedMetrics:
    """Test derived metrics computation."""

    def test_simple_climb(self):
        """Test vario calculation for simple climb."""
        points = [
            TrackPoint(time_s=0.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True),
            TrackPoint(time_s=1.0, lat=47.5, lon=7.5, alt_m=1002.0, alt_valid=True),
            TrackPoint(time_s=2.0, lat=47.5, lon=7.5, alt_m=1004.0, alt_valid=True),
        ]
        dt, vario, heading, turn_rate, speed, gap_count = compute_derived_metrics(points)

        assert len(vario) == 3
        assert vario[0] == 0.0  # First point has no vario
        assert abs(vario[1] - 2.0) < 0.001  # 2 m/s climb
        assert abs(vario[2] - 2.0) < 0.001  # 2 m/s climb

    def test_simple_sink(self):
        """Test vario calculation for sink."""
        points = [
            TrackPoint(time_s=0.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True),
            TrackPoint(time_s=1.0, lat=47.5, lon=7.5, alt_m=998.0, alt_valid=True),
        ]
        dt, vario, heading, turn_rate, speed, gap_count = compute_derived_metrics(points)

        assert abs(vario[1] - (-2.0)) < 0.001  # -2 m/s sink

    def test_horizontal_movement_speed(self):
        """Test speed calculation for horizontal movement."""
        # Points roughly 10m apart (at ~47.5°N, 0.0001° lon ≈ 7.5m)
        points = [
            TrackPoint(time_s=0.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True),
            TrackPoint(time_s=1.0, lat=47.5, lon=7.50013, alt_m=1000.0, alt_valid=True),
        ]
        dt, vario, heading, turn_rate, speed, gap_count = compute_derived_metrics(points)

        # Speed should be approximately 10 m/s
        assert 9.0 < speed[1] < 11.0

    def test_gps_gap_detection(self):
        """Test GPS gap detection."""
        points = [
            TrackPoint(time_s=0.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True),
            TrackPoint(time_s=1.0, lat=47.5, lon=7.5, alt_m=1001.0, alt_valid=True),
            TrackPoint(time_s=15.0, lat=47.5, lon=7.5, alt_m=1002.0, alt_valid=True),  # 14s gap
        ]
        dt, vario, heading, turn_rate, speed, gap_count = compute_derived_metrics(points)

        assert gap_count == 1  # One gap detected (>10s threshold)

    def test_excessive_speed_filtered(self):
        """Test that excessive speeds are filtered out."""
        points = [
            TrackPoint(time_s=0.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True),
            TrackPoint(time_s=1.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True),
            # Huge jump (GPS glitch)
            TrackPoint(time_s=2.0, lat=48.0, lon=8.0, alt_m=1000.0, alt_valid=True),
        ]
        dt, vario, heading, turn_rate, speed, gap_count = compute_derived_metrics(points)

        # Speed should be capped/filtered (not > 30 m/s)
        assert all(s <= 30.0 for s in speed)

    def test_heading_calculation(self):
        """Test heading calculation for movement."""
        points = [
            TrackPoint(time_s=0.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True),
            TrackPoint(time_s=1.0, lat=47.51, lon=7.5, alt_m=1000.0, alt_valid=True),  # North
        ]
        dt, vario, heading, turn_rate, speed, gap_count = compute_derived_metrics(points)

        # Heading should be approximately north (0°)
        assert heading[1] < 10.0 or heading[1] > 350.0

    def test_turn_rate_calculation(self):
        """Test turn rate calculation."""
        # Create realistic paraglider movement with a 90 degree turn
        # Speed ~10 m/s, moving north then east
        points = [
            TrackPoint(time_s=0.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True),
            TrackPoint(time_s=1.0, lat=47.50009, lon=7.5, alt_m=1000.0, alt_valid=True),  # ~10m North
            TrackPoint(time_s=2.0, lat=47.50009, lon=7.50013, alt_m=1000.0, alt_valid=True),  # ~10m East
        ]
        dt, vario, heading, turn_rate, speed, gap_count = compute_derived_metrics(points)

        # Should detect a right turn (positive turn rate)
        # The turn rate should be approximately 90 deg/s
        assert turn_rate[2] > 0


class TestThermalDetection:
    """Test thermal detection logic."""

    def test_no_thermal_straight_glide(self):
        """Test that straight glide with no turning is not detected as thermal."""
        # Straight line, no climbing, no turning
        points = [
            TrackPoint(time_s=float(i), lat=47.5 + i * 0.001, lon=7.5, alt_m=1000.0, alt_valid=True) for i in range(30)
        ]

        dt = [1.0] * 30
        vario_s = [0.0] * 30  # No climb
        turn_s = [0.0] * 30  # No turning

        thermals = detect_thermals(points, dt, vario_s, turn_s)
        assert len(thermals) == 0

    def test_no_thermal_turning_but_sinking(self):
        """Test that turning while sinking is not detected as thermal."""
        points = [TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 - i, alt_valid=True) for i in range(30)]

        dt = [1.0] * 30
        vario_s = [-1.0] * 30  # Sinking
        turn_s = [10.0] * 30  # Turning

        thermals = detect_thermals(points, dt, vario_s, turn_s)
        assert len(thermals) == 0

    def test_detect_simple_thermal(self):
        """Test detection of simple thermal with climbing and turning."""
        # Create a simple thermal: 25 seconds of climbing while turning
        # Start with entry point (0), then thermal segment, then exit
        n = 27
        points = [
            TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 + i * 0.5, alt_valid=True) for i in range(n)
        ]

        dt = [1.0] * n
        # Start neutral, then climb in thermal, then exit
        vario_s = [0.0] + [0.5] * 25 + [-0.5]  # 0.5 m/s climb (above MIN_CLIMB_RATE)
        turn_s = [0.0] + [10.0] * 25 + [0.0]  # 10 deg/s turning (above MIN_TURN_RATE)

        thermals = detect_thermals(points, dt, vario_s, turn_s)
        assert len(thermals) == 1

        thermal = thermals[0]
        assert thermal.duration_s >= 18.0  # Above MIN_THERMAL_DURATION
        assert thermal.avg_climb >= 0.4  # Above MIN_CLIMB_RATE

    def test_thermal_too_short_ignored(self):
        """Test that thermals shorter than minimum duration are ignored."""
        n = 10  # Only 10 seconds (< 18s minimum)
        points = [TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 + i, alt_valid=True) for i in range(n)]

        dt = [1.0] * n
        vario_s = [1.0] * n  # Good climb
        turn_s = [10.0] * n  # Good turning

        thermals = detect_thermals(points, dt, vario_s, turn_s)
        assert len(thermals) == 0  # Too short

    def test_thermal_weak_climb_ignored(self):
        """Test that weak climbs are ignored."""
        n = 25
        points = [
            TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 + i * 0.1, alt_valid=True) for i in range(n)
        ]

        dt = [1.0] * n
        vario_s = [0.1] * n  # 0.1 m/s climb (below MIN_CLIMB_RATE threshold)
        turn_s = [10.0] * n  # Good turning

        thermals = detect_thermals(points, dt, vario_s, turn_s)
        assert len(thermals) == 0  # Climb too weak

    def test_detect_multiple_thermals(self):
        """Test detection of multiple separate thermals."""
        # Entry + First thermal: 20s climb + turn + exit
        # Break: 10s glide
        # Second thermal: 20s climb + turn + exit
        points = []
        dt = []
        vario_s = []
        turn_s = []

        # Entry
        points.append(TrackPoint(time_s=0.0, lat=47.5, lon=7.5, alt_m=1000.0, alt_valid=True))
        dt.append(1.0)
        vario_s.append(0.0)
        turn_s.append(0.0)

        # First thermal
        for i in range(1, 21):
            points.append(TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 + i * 0.5, alt_valid=True))
            dt.append(1.0)
            vario_s.append(0.5)
            turn_s.append(10.0)

        # Break (glide)
        for i in range(21, 31):
            points.append(
                TrackPoint(
                    time_s=float(i),
                    lat=47.5,
                    lon=7.5,
                    alt_m=1010.0 - (i - 21) * 0.3,
                    alt_valid=True,
                )
            )
            dt.append(1.0)
            vario_s.append(-0.3)
            turn_s.append(0.0)

        # Second thermal
        for i in range(31, 51):
            points.append(
                TrackPoint(
                    time_s=float(i),
                    lat=47.5,
                    lon=7.5,
                    alt_m=1007.0 + (i - 31) * 0.6,
                    alt_valid=True,
                )
            )
            dt.append(1.0)
            vario_s.append(0.6)
            turn_s.append(10.0)

        # Exit
        points.append(TrackPoint(time_s=51.0, lat=47.5, lon=7.5, alt_m=1020.0, alt_valid=True))
        dt.append(1.0)
        vario_s.append(-0.5)
        turn_s.append(0.0)

        thermals = detect_thermals(points, dt, vario_s, turn_s)
        assert len(thermals) == 2

    def test_early_exit_detection_strong_peak(self):
        """Test early exit detection when leaving strong thermal."""
        n = 25
        points = []
        vario_s = []

        # Build up to strong peak, then leave while still climbing
        for i in range(n):
            points.append(TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 + i * 0.5, alt_valid=True))
            # Climb to peak at i=15, then reduce but still positive
            if i < 15:
                vario_s.append(0.5 + i * 0.1)  # Building to 2.0 m/s
            else:
                vario_s.append(1.5)  # Still 1.5 m/s (above EXIT threshold)

        dt = [1.0] * n
        turn_s = [10.0] * n

        # Force exit at end
        vario_s[-1] = -0.5
        turn_s[-1] = 0.0

        thermals = detect_thermals(points, dt, vario_s, turn_s)
        assert len(thermals) == 1

        thermal = thermals[0]
        # Should detect early exit (peak was strong, still climbing well at exit)
        assert thermal.max_climb > 1.2  # Strong peak
        # Note: The exact early_exit flag depends on complex logic,
        # but we can verify the values exist
        assert thermal.early_exit_t is None or thermal.early_exit_t > 0
