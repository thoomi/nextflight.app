"""Tests for IGC parsing and helper functions."""

from flight_debrief.core.flight_debrief import (
    bearing_deg,
    compass_dir_from_bearing,
    haversine_m,
    moving_avg,
    parse_lat_lon_igc,
    unwrap_angle_deg,
)


class TestLatLonParsing:
    """Test IGC latitude/longitude parsing."""

    def test_parse_north_east(self):
        """Test parsing northern and eastern coordinates."""
        lat, lon = parse_lat_lon_igc("4758123", "N", "00743456", "E")
        assert abs(lat - 47.96872) < 0.0001
        assert abs(lon - 7.72427) < 0.0001

    def test_parse_south_west(self):
        """Test parsing southern and western coordinates."""
        lat, lon = parse_lat_lon_igc("3330000", "S", "15145000", "W")
        assert abs(lat - (-33.5)) < 0.0001
        assert abs(lon - (-151.75)) < 0.0001

    def test_parse_equator_prime_meridian(self):
        """Test parsing coordinates at equator and prime meridian."""
        lat, lon = parse_lat_lon_igc("0000000", "N", "00000000", "E")
        assert lat == 0.0
        assert lon == 0.0


class TestHaversine:
    """Test haversine distance calculation."""

    def test_same_point(self):
        """Test distance between same point is zero."""
        dist = haversine_m(47.5, 7.5, 47.5, 7.5)
        assert dist == 0.0

    def test_known_distance(self):
        """Test known distance between two points."""
        # Freiburg to Basel (roughly 52km)
        lat1, lon1 = 47.9990, 7.8421
        lat2, lon2 = 47.5596, 7.5886
        dist = haversine_m(lat1, lon1, lat2, lon2)
        # Should be around 52km
        assert 50000 < dist < 55000

    def test_small_distance(self):
        """Test small distance calculation accuracy."""
        # Points 100m apart approximately
        lat1, lon1 = 47.5, 7.5
        lat2, lon2 = 47.5, 7.50133  # ~100m at this latitude
        dist = haversine_m(lat1, lon1, lat2, lon2)
        assert 90 < dist < 110


class TestBearing:
    """Test bearing calculation."""

    def test_bearing_north(self):
        """Test bearing directly north."""
        bearing = bearing_deg(47.5, 7.5, 47.6, 7.5)
        assert abs(bearing - 0.0) < 1.0

    def test_bearing_east(self):
        """Test bearing directly east."""
        bearing = bearing_deg(47.5, 7.5, 47.5, 7.6)
        assert abs(bearing - 90.0) < 1.0

    def test_bearing_south(self):
        """Test bearing directly south."""
        bearing = bearing_deg(47.6, 7.5, 47.5, 7.5)
        assert abs(bearing - 180.0) < 1.0

    def test_bearing_west(self):
        """Test bearing directly west."""
        bearing = bearing_deg(47.5, 7.6, 47.5, 7.5)
        assert abs(bearing - 270.0) < 1.0

    def test_bearing_range(self):
        """Test bearing is always in range [0, 360)."""
        bearing = bearing_deg(47.5, 7.5, 47.4, 7.4)
        assert 0 <= bearing < 360


class TestUnwrapAngle:
    """Test angle unwrapping for turn rate calculation."""

    def test_no_wrap(self):
        """Test angles without discontinuity."""
        assert unwrap_angle_deg(45.0, 50.0) == 5.0
        assert unwrap_angle_deg(180.0, 190.0) == 10.0

    def test_wrap_360_to_0(self):
        """Test unwrapping across 360/0 boundary."""
        assert abs(unwrap_angle_deg(350.0, 10.0) - 20.0) < 0.001

    def test_wrap_0_to_360(self):
        """Test unwrapping backwards across boundary."""
        assert abs(unwrap_angle_deg(10.0, 350.0) - (-20.0)) < 0.001

    def test_negative_turn(self):
        """Test negative (left) turns."""
        assert unwrap_angle_deg(100.0, 80.0) == -20.0


class TestMovingAverage:
    """Test moving average smoothing."""

    def test_window_1_no_change(self):
        """Test window size 1 returns original sequence."""
        data = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = moving_avg(data, 1)
        assert result == data

    def test_simple_average(self):
        """Test simple moving average calculation."""
        data = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = moving_avg(data, 3)
        # First point: avg of [1.0] = 1.0
        # Second point: avg of [1.0, 2.0] = 1.5
        # Third point: avg of [1.0, 2.0, 3.0] = 2.0
        # Fourth point: avg of [2.0, 3.0, 4.0] = 3.0
        # Fifth point: avg of [3.0, 4.0, 5.0] = 4.0
        assert abs(result[0] - 1.0) < 0.001
        assert abs(result[1] - 1.5) < 0.001
        assert abs(result[2] - 2.0) < 0.001
        assert abs(result[3] - 3.0) < 0.001
        assert abs(result[4] - 4.0) < 0.001

    def test_window_larger_than_data(self):
        """Test window larger than data length."""
        data = [1.0, 2.0, 3.0]
        result = moving_avg(data, 10)
        assert result == data

    def test_empty_data(self):
        """Test with empty data."""
        result = moving_avg([], 3)
        assert result == []


class TestCompassDirection:
    """Test compass direction conversion."""

    def test_cardinal_directions(self):
        """Test cardinal directions."""
        assert compass_dir_from_bearing(0.0) == "N"
        assert compass_dir_from_bearing(90.0) == "E"
        assert compass_dir_from_bearing(180.0) == "S"
        assert compass_dir_from_bearing(270.0) == "W"

    def test_intercardinal_directions(self):
        """Test intercardinal directions."""
        assert compass_dir_from_bearing(45.0) == "NE"
        assert compass_dir_from_bearing(135.0) == "SE"
        assert compass_dir_from_bearing(225.0) == "SW"
        assert compass_dir_from_bearing(315.0) == "NW"

    def test_boundary_cases(self):
        """Test directions near boundaries."""
        assert compass_dir_from_bearing(359.0) == "N"
        assert compass_dir_from_bearing(1.0) == "N"
        assert compass_dir_from_bearing(22.4) == "N"
        assert compass_dir_from_bearing(22.6) == "NE"
