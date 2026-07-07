/** Darse-Quran office on Google Maps (Jammu & Kashmir). */
export const ACADEMY_LOCATION = {
  name: "DARSE-QURAN",
  label: "DARSE-QURAN, Jammu & Kashmir",
  mapsUrl: "https://maps.app.goo.gl/7kUvxhkrDq1Z22AUA",
  latitude: 34.063839,
  longitude: 74.4468766,
  zoom: 17,
  /** Google Maps place reference (hex CID) for embedded map place info. */
  placeRef: "0x38e1a5d737d3db0d:0x9b0e6f00a4d7f2ae",
  googleKgId: "g/11qh744mzf",
} as const;

/**
 * Official-style embed URL with place reference so marker details load in the iframe.
 * Coordinate-only embeds (?q=lat,lng&output=embed) show "Place info couldn't load" on click.
 */
export function getAcademyLocationEmbedUrl() {
  const placeRef = encodeURIComponent(ACADEMY_LOCATION.placeRef);
  const placeName = encodeURIComponent(`${ACADEMY_LOCATION.name}.`);
  const { latitude, longitude } = ACADEMY_LOCATION;

  return [
    "https://www.google.com/maps/embed?pb=",
    "!1m18!1m12",
    "!1m3!1d3305.2213737182337",
    `!2d${longitude}!3d${latitude}`,
    "!2m3!1f0!2f0!3f0",
    "!3m2!1i1024!2i768!4f13.1",
    "!3m3!1m2",
    `!1s${placeRef}`,
    `!2s${placeName}`,
    "!5e0!3m2!1sen!2sin",
    "!4v1735689600000!5m2!1sen!2sin",
  ].join("");
}
