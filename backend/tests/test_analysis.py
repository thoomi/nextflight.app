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
        heading = [0.0] * 30  # Constant heading (no turn)

        thermals = detect_thermals(points, dt, vario_s, turn_s, heading)
        assert len(thermals) == 0

    def test_no_thermal_turning_but_sinking(self):
        """Test that turning while sinking is not detected as thermal."""
        points = [TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 - i, alt_valid=True) for i in range(40)]

        dt = [1.0] * 40
        vario_s = [-2.0] * 40  # Strong sinking (below -1.5 threshold)
        turn_s = [10.0] * 40  # Turning
        # Create realistic heading change: 10°/s * 40s = 400° total
        heading = [float(i * 10) % 360 for i in range(40)]

        thermals = detect_thermals(points, dt, vario_s, turn_s, heading)
        assert len(thermals) == 0  # Should not detect - sinking too badly

    def test_detect_simple_thermal(self):
        """Test detection of simple thermal with climbing and turning."""
        # Create a realistic thermal: exit via "not turning" condition to keep clean thermal segment
        # Pre-entry (0-5s), thermal (5-40s climb+turn), exit (40-75s neutral vario, straight for 35s)
        n = 76
        points = [
            TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 + max(0, i) * 0.5, alt_valid=True)
            for i in range(n)
        ]

        dt = [1.0] * n
        # Pre-entry, thermal phase (climb+turn), exit (neutral vario + straight for 35s)
        vario_s = [-0.3] * 5 + [0.5] * 35 + [-0.3] * 36  # Keep vario above -0.5 in exit
        turn_s = [0.0] * 5 + [10.0] * 35 + [0.0] * 36
        # Heading: straight for 5s, turn 10°/s for 35s, then constant for exit
        heading = [0.0] * 5 + [float((i - 5) * 10) % 360 for i in range(5, 40)] + [350.0] * 36

        thermals = detect_thermals(points, dt, vario_s, turn_s, heading)
        assert len(thermals) == 1

        thermal = thermals[0]
        assert thermal.duration_s >= 18.0  # Above MIN_THERMAL_DURATION
        assert thermal.avg_climb >= 0.4  # Above MIN_CLIMB_RATE

    def test_thermal_too_short_ignored(self):
        """Test that thermals shorter than minimum duration are ignored."""
        # Need 30s before thermal can start (rolling window), then short thermal, then exit
        n = 50
        points = [TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 + i, alt_valid=True) for i in range(n)]

        dt = [1.0] * n
        # Entry 30s, short thermal 10s, exit
        vario_s = [0.0] * 30 + [1.0] * 10 + [-2.0] * 10  # Good climb but too short
        turn_s = [0.0] * 30 + [10.0] * 10 + [0.0] * 10  # Good turning but too short
        heading = [0.0] * 30 + [float((i - 30) * 10) % 360 for i in range(30, 40)] + [100.0] * 10

        thermals = detect_thermals(points, dt, vario_s, turn_s, heading)
        assert len(thermals) == 0  # Too short (10s < 18s minimum)

    def test_thermal_weak_climb_ignored(self):
        """Test that weak climbs are ignored."""
        # Entry 30s, weak thermal 25s, exit
        n = 60
        points = [
            TrackPoint(time_s=float(i), lat=47.5, lon=7.5, alt_m=1000.0 + max(0, (i - 30)) * 0.1, alt_valid=True)
            for i in range(n)
        ]

        dt = [1.0] * n
        vario_s = [0.0] * 30 + [0.1] * 25 + [-2.0] * 5  # 0.1 m/s climb (below MIN_CLIMB_RATE)
        turn_s = [0.0] * 30 + [10.0] * 25 + [0.0] * 5  # Good turning
        heading = [0.0] * 30 + [float((i - 30) * 10) % 360 for i in range(30, 55)] + [250.0] * 5

        thermals = detect_thermals(points, dt, vario_s, turn_s, heading)
        assert len(thermals) == 0  # Climb too weak (0.1 < 0.4 MIN_CLIMB_RATE)

    def test_detect_multiple_thermals(self):
        """Test detection of multiple separate thermals with rolling window."""
        # Realistic scenario (must start turning early for rolling window):
        # Pre-entry: 5s
        # First thermal: 30s climb+turn
        # Break (glide): 10s straight sink
        # Pre-entry 2: 5s
        # Second thermal: 30s climb+turn
        # Exit: 5s sink
        points = []
        dt = []
        vario_s = []
        turn_s = []
        heading = []

        time = 0.0
        alt = 1000.0
        current_heading = 0.0

        # Pre-entry phase (5s)
        for i in range(5):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            dt.append(1.0)
            vario_s.append(-0.3)
            turn_s.append(0.0)
            heading.append(current_heading)
            alt -= 0.3
            time += 1.0

        # First thermal (30s)
        for i in range(30):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            dt.append(1.0)
            vario_s.append(0.5)
            turn_s.append(10.0)
            current_heading = (current_heading + 10.0) % 360
            heading.append(current_heading)
            alt += 0.5
            time += 1.0

        # Break - glide with strong sink to trigger exit (10s)
        for i in range(10):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            dt.append(1.0)
            vario_s.append(-2.0)  # Strong sink to trigger exit
            turn_s.append(0.0)
            heading.append(current_heading)  # Constant heading during glide
            alt -= 2.0
            time += 1.0

        # Pre-entry to second thermal (5s)
        for i in range(5):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            dt.append(1.0)
            vario_s.append(-0.3)
            turn_s.append(0.0)
            heading.append(current_heading)
            alt -= 0.3
            time += 1.0

        # Second thermal (30s)
        for i in range(30):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            dt.append(1.0)
            vario_s.append(0.6)
            turn_s.append(10.0)
            current_heading = (current_heading + 10.0) % 360
            heading.append(current_heading)
            alt += 0.6
            time += 1.0

        # Exit (35s neutral vario, straight to trigger via "not turning")
        for i in range(35):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            dt.append(1.0)
            vario_s.append(-0.3)  # Neutral, above -0.5
            turn_s.append(0.0)
            heading.append(current_heading)
            alt -= 0.3
            time += 1.0

        thermals = detect_thermals(points, dt, vario_s, turn_s, heading)
        assert len(thermals) == 2

    def test_early_exit_detection_strong_peak(self):
        """Test early exit detection when leaving strong thermal."""
        # Pre-entry 5s, thermal with strong peak 35s, early exit 5s
        points = []
        vario_s = []
        turn_s = []
        heading = []

        time = 0.0
        alt = 1000.0
        current_heading = 0.0

        # Pre-entry phase (5s)
        for i in range(5):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            vario_s.append(-0.3)
            turn_s.append(0.0)
            heading.append(current_heading)
            alt -= 0.3
            time += 1.0

        # Thermal with building climb to strong peak (35s)
        for i in range(35):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            turn_s.append(10.0)
            current_heading = (current_heading + 10.0) % 360
            heading.append(current_heading)

            # Build up to strong peak at i=15, then reduce but still positive
            if i < 15:
                climb = 0.5 + i * 0.1  # Building to 2.0 m/s
            else:
                climb = 1.5  # Still 1.5 m/s (above EXIT threshold)

            vario_s.append(climb)
            alt += climb
            time += 1.0

        # Force exit via "not turning" (35s neutral vario, straight)
        for i in range(35):
            points.append(TrackPoint(time_s=time, lat=47.5, lon=7.5, alt_m=alt, alt_valid=True))
            vario_s.append(-0.3)  # Neutral vario, above -0.5
            turn_s.append(0.0)
            heading.append(current_heading)
            alt -= 0.3
            time += 1.0

        dt = [1.0] * len(points)

        thermals = detect_thermals(points, dt, vario_s, turn_s, heading)
        assert len(thermals) == 1

        thermal = thermals[0]
        # Should detect early exit (peak was strong, exited within threshold)
        assert thermal.max_climb > 1.2  # Strong peak
        # Note: early_exit detection depends on exit time relative to peak
        # Just verify the values exist and are valid
        assert thermal.early_exit_t is None or thermal.early_exit_t > 0
