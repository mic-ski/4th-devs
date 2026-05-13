// The Haversine formula calculates the "as the crow flies" distance between
// two points on a sphere (the Earth) given their latitude and longitude.
//
// Why not just subtract the coordinates?
// Latitude and longitude are angles, not distances. One degree of latitude is
// always ~111 km, but one degree of longitude shrinks as you move toward the
// poles. Haversine accounts for the Earth's curvature correctly.
//
// This module has no dependencies — it is pure maths.

const EARTH_RADIUS_KM = 6371;

// toRadians() converts degrees (the usual way to express lat/lon) into
// radians (what JavaScript's Math functions expect).
//
// Parameter: degrees — number
// Returns:   number (radians)
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// haversineDistance() returns the straight-line distance in kilometres
// between two geographic points.
//
// Parameters:
//   lat1, lon1 — numbers, latitude and longitude of point 1 (in degrees)
//   lat2, lon2 — numbers, latitude and longitude of point 2 (in degrees)
//
// Returns: number — distance in kilometres
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // The 'a' variable is the square of half the chord length between the points.
  // It combines the latitude difference and the longitude difference,
  // corrected for where on the globe we are (via Math.cos).
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  // 'c' is the angular distance in radians (the central angle).
  // atan2 is used instead of asin for numerical stability near the poles.
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};
