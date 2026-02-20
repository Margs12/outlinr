// data.js — loads world-atlas TopoJSON, converts each country feature to a
// normalised SVG path string, and returns a flat country array.
//
// Data sources (vendored locally — no CDN dependency at runtime):
//   • world-atlas v2  : data/countries-50m.json  (npm:world-atlas@2)
//   • topojson-client : vendor/topojson-client.js (npm:topojson-client@3.1.0)

import { feature } from '../vendor/topojson-client.js';

// fetch() resolves this relative to the document's base URL (not the module's location),
// so './data/...' works correctly from both index.html and test.html at the project root.
const WORLD_ATLAS_URL = './data/countries-50m.json';

// ISO 3166-1 numeric code → { name, aliases[] }
// Aliases are alternative names a player might type (common names,
// former names, abbreviations, native-language names).
const COUNTRY_INFO = {
  4:   { name: 'Afghanistan',                       aliases: [] },
  8:   { name: 'Albania',                           aliases: [] },
  12:  { name: 'Algeria',                           aliases: [] },
  24:  { name: 'Angola',                            aliases: [] },
  32:  { name: 'Argentina',                         aliases: [] },
  36:  { name: 'Australia',                         aliases: ['aussie'] },
  40:  { name: 'Austria',                           aliases: ['osterreich', 'österreich'] },
  50:  { name: 'Bangladesh',                        aliases: [] },
  56:  { name: 'Belgium',                           aliases: [] },
  64:  { name: 'Bhutan',                            aliases: [] },
  68:  { name: 'Bolivia',                           aliases: [] },
  70:  { name: 'Bosnia and Herzegovina',            aliases: ['bosnia', 'herzegovina', 'bih'] },
  72:  { name: 'Botswana',                          aliases: [] },
  76:  { name: 'Brazil',                            aliases: ['brasil'] },
  84:  { name: 'Belize',                            aliases: [] },
  90:  { name: 'Solomon Islands',                   aliases: ['solomons'] },
  96:  { name: 'Brunei',                            aliases: ['brunei darussalam'] },
  100: { name: 'Bulgaria',                          aliases: [] },
  104: { name: 'Myanmar',                           aliases: ['burma'] },
  108: { name: 'Burundi',                           aliases: [] },
  116: { name: 'Cambodia',                          aliases: ['kampuchea'] },
  120: { name: 'Cameroon',                          aliases: [] },
  124: { name: 'Canada',                            aliases: [] },
  132: { name: 'Cape Verde',                        aliases: ['cabo verde'] },
  140: { name: 'Central African Republic',          aliases: ['car'] },
  144: { name: 'Sri Lanka',                         aliases: ['ceylon', 'lanka'] },
  148: { name: 'Chad',                              aliases: [] },
  152: { name: 'Chile',                             aliases: [] },
  156: { name: 'China',                             aliases: ['prc', "people's republic of china"] },
  170: { name: 'Colombia',                          aliases: [] },
  174: { name: 'Comoros',                           aliases: [] },
  178: { name: 'Republic of the Congo',             aliases: ['congo republic', 'congo-brazzaville', 'congo brazzaville'] },
  180: { name: 'Democratic Republic of the Congo',  aliases: ['drc', 'zaire', 'congo', 'congo-kinshasa', 'democratic republic of congo'] },
  188: { name: 'Costa Rica',                        aliases: [] },
  191: { name: 'Croatia',                           aliases: ['hrvatska'] },
  192: { name: 'Cuba',                              aliases: [] },
  196: { name: 'Cyprus',                            aliases: [] },
  203: { name: 'Czech Republic',                    aliases: ['czechia', 'czech'] },
  204: { name: 'Benin',                             aliases: ['dahomey'] },
  208: { name: 'Denmark',                           aliases: ['danmark'] },
  214: { name: 'Dominican Republic',                aliases: [] },
  218: { name: 'Ecuador',                           aliases: [] },
  222: { name: 'El Salvador',                       aliases: [] },
  226: { name: 'Equatorial Guinea',                 aliases: [] },
  231: { name: 'Ethiopia',                          aliases: ['abyssinia'] },
  232: { name: 'Eritrea',                           aliases: [] },
  233: { name: 'Estonia',                           aliases: ['eesti'] },
  238: { name: 'Falkland Islands',                  aliases: ['malvinas', 'falklands'] },
  242: { name: 'Fiji',                              aliases: [] },
  246: { name: 'Finland',                           aliases: ['suomi'] },
  250: { name: 'France',                            aliases: [] },
  262: { name: 'Djibouti',                          aliases: [] },
  266: { name: 'Gabon',                             aliases: [] },
  268: { name: 'Georgia',                           aliases: [] },
  270: { name: 'Gambia',                            aliases: ['the gambia'] },
  276: { name: 'Germany',                           aliases: ['deutschland'] },
  288: { name: 'Ghana',                             aliases: [] },
  300: { name: 'Greece',                            aliases: ['hellas', 'ellada'] },
  304: { name: 'Greenland',                         aliases: ['kalaallit nunaat'] },
  320: { name: 'Guatemala',                         aliases: [] },
  324: { name: 'Guinea',                            aliases: [] },
  328: { name: 'Guyana',                            aliases: [] },
  332: { name: 'Haiti',                             aliases: [] },
  340: { name: 'Honduras',                          aliases: [] },
  348: { name: 'Hungary',                           aliases: ['magyarország', 'magyarorszag'] },
  356: { name: 'India',                             aliases: ['bharat'] },
  360: { name: 'Indonesia',                         aliases: [] },
  364: { name: 'Iran',                              aliases: ['persia'] },
  368: { name: 'Iraq',                              aliases: [] },
  372: { name: 'Ireland',                           aliases: ['eire', 'republic of ireland'] },
  376: { name: 'Israel',                            aliases: [] },
  380: { name: 'Italy',                             aliases: ['italia'] },
  384: { name: 'Ivory Coast',                       aliases: ["cote d'ivoire", "côte d'ivoire", 'cote divoire', 'ci'] },
  388: { name: 'Jamaica',                           aliases: [] },
  392: { name: 'Japan',                             aliases: ['nippon', 'nihon'] },
  398: { name: 'Kazakhstan',                        aliases: ['kazakh', 'qazaqstan'] },
  400: { name: 'Jordan',                            aliases: [] },
  404: { name: 'Kenya',                             aliases: [] },
  408: { name: 'North Korea',                       aliases: ['dprk', "democratic people's republic of korea"] },
  410: { name: 'South Korea',                       aliases: ['korea', 'republic of korea', 'rok'] },
  414: { name: 'Kuwait',                            aliases: [] },
  417: { name: 'Kyrgyzstan',                        aliases: ['kyrgyz republic', 'kirghizstan'] },
  418: { name: 'Laos',                              aliases: ['lao'] },
  422: { name: 'Lebanon',                           aliases: [] },
  426: { name: 'Lesotho',                           aliases: [] },
  428: { name: 'Latvia',                            aliases: ['latvija'] },
  434: { name: 'Libya',                             aliases: [] },
  440: { name: 'Lithuania',                         aliases: ['lietuva'] },
  442: { name: 'Luxembourg',                        aliases: [] },
  450: { name: 'Madagascar',                        aliases: [] },
  454: { name: 'Malawi',                            aliases: ['nyasaland'] },
  458: { name: 'Malaysia',                          aliases: [] },
  466: { name: 'Mali',                              aliases: [] },
  478: { name: 'Mauritania',                        aliases: [] },
  484: { name: 'Mexico',                            aliases: ['méxico', 'mexico'] },
  496: { name: 'Mongolia',                          aliases: [] },
  498: { name: 'Moldova',                           aliases: ['republic of moldova'] },
  504: { name: 'Morocco',                           aliases: ['maroc', 'al-maghrib'] },
  508: { name: 'Mozambique',                        aliases: [] },
  516: { name: 'Namibia',                           aliases: ['south west africa'] },
  524: { name: 'Nepal',                             aliases: [] },
  528: { name: 'Netherlands',                       aliases: ['holland', 'nederland'] },
  540: { name: 'New Caledonia',                     aliases: [] },
  548: { name: 'Vanuatu',                           aliases: ['new hebrides'] },
  554: { name: 'New Zealand',                       aliases: ['nz', 'aotearoa'] },
  558: { name: 'Nicaragua',                         aliases: [] },
  562: { name: 'Niger',                             aliases: [] },
  566: { name: 'Nigeria',                           aliases: [] },
  578: { name: 'Norway',                            aliases: ['norge'] },
  586: { name: 'Pakistan',                          aliases: [] },
  591: { name: 'Panama',                            aliases: [] },
  598: { name: 'Papua New Guinea',                  aliases: ['png'] },
  600: { name: 'Paraguay',                          aliases: [] },
  604: { name: 'Peru',                              aliases: [] },
  608: { name: 'Philippines',                       aliases: ['pilipinas'] },
  616: { name: 'Poland',                            aliases: ['polska'] },
  620: { name: 'Portugal',                          aliases: [] },
  624: { name: 'Guinea-Bissau',                     aliases: ['guinea bissau'] },
  626: { name: 'Timor-Leste',                       aliases: ['east timor', 'timor leste'] },
  634: { name: 'Qatar',                             aliases: [] },
  642: { name: 'Romania',                           aliases: ['românia', 'romania'] },
  643: { name: 'Russia',                            aliases: ['russian federation'] },
  646: { name: 'Rwanda',                            aliases: [] },
  678: { name: 'São Tomé and Príncipe',             aliases: ['sao tome and principe', 'sao tome'] },
  682: { name: 'Saudi Arabia',                      aliases: ['ksa'] },
  686: { name: 'Senegal',                           aliases: [] },
  694: { name: 'Sierra Leone',                      aliases: [] },
  703: { name: 'Slovakia',                          aliases: ['slovak republic'] },
  705: { name: 'Slovenia',                          aliases: [] },
  706: { name: 'Somalia',                           aliases: [] },
  710: { name: 'South Africa',                      aliases: ['rsa'] },
  716: { name: 'Zimbabwe',                          aliases: ['rhodesia'] },
  724: { name: 'Spain',                             aliases: ['españa', 'espana'] },
  728: { name: 'South Sudan',                       aliases: [] },
  729: { name: 'Sudan',                             aliases: [] },
  740: { name: 'Suriname',                          aliases: ['surinam'] },
  748: { name: 'Eswatini',                          aliases: ['swaziland'] },
  752: { name: 'Sweden',                            aliases: ['sverige'] },
  756: { name: 'Switzerland',                       aliases: ['helvetia', 'swiss'] },
  760: { name: 'Syria',                             aliases: [] },
  762: { name: 'Tajikistan',                        aliases: [] },
  764: { name: 'Thailand',                          aliases: ['siam', 'muang thai'] },
  768: { name: 'Togo',                              aliases: [] },
  780: { name: 'Trinidad and Tobago',               aliases: ['trinidad', 'tobago'] },
  788: { name: 'Tunisia',                           aliases: [] },
  792: { name: 'Turkey',                            aliases: ['türkiye', 'turkiye'] },
  795: { name: 'Turkmenistan',                      aliases: [] },
  800: { name: 'Uganda',                            aliases: [] },
  804: { name: 'Ukraine',                           aliases: ['ukraina'] },
  784: { name: 'United Arab Emirates',              aliases: ['uae', 'emirates'] },
  807: { name: 'North Macedonia',                   aliases: ['macedonia', 'fyrom'] },
  818: { name: 'Egypt',                             aliases: ['misr', 'arab republic of egypt'] },
  826: { name: 'United Kingdom',                    aliases: ['uk', 'great britain', 'britain', 'england'] },
  834: { name: 'Tanzania',                          aliases: [] },
  840: { name: 'United States',                     aliases: ['usa', 'united states of america', 'us', 'america'] },
  854: { name: 'Burkina Faso',                      aliases: ['upper volta'] },
  858: { name: 'Uruguay',                           aliases: [] },
  860: { name: 'Uzbekistan',                        aliases: [] },
  862: { name: 'Venezuela',                         aliases: [] },
  704: { name: 'Vietnam',                           aliases: ['viet nam'] },
  887: { name: 'Yemen',                             aliases: [] },
  894: { name: 'Zambia',                            aliases: [] },
};

// ── Difficulty tiers ─────────────────────────────────────────────────────────
// Easy = globally recognisable shapes most players will know.
// Hard = everything else (smaller/less-known countries).

const EASY_IDS = new Set([
  32,   // Argentina
  36,   // Australia
  76,   // Brazil
  124,  // Canada
  152,  // Chile
  156,  // China
  192,  // Cuba
  246,  // Finland
  250,  // France
  276,  // Germany
  300,  // Greece
  304,  // Greenland
  356,  // India
  360,  // Indonesia
  364,  // Iran
  372,  // Ireland
  380,  // Italy
  392,  // Japan
  408,  // North Korea
  450,  // Madagascar
  458,  // Malaysia
  484,  // Mexico
  496,  // Mongolia
  578,  // Norway
  818,  // Egypt
  604,  // Peru
  608,  // Philippines
  616,  // Poland
  620,  // Portugal
  682,  // Saudi Arabia
  410,  // South Korea
  710,  // South Africa
  724,  // Spain
  752,  // Sweden
  764,  // Thailand
  792,  // Turkey
  804,  // Ukraine
  826,  // United Kingdom
  840,  // United States
  704,  // Vietnam
]);

// Countries where distant overseas territories make the mainland appear tiny.
// For these, only the largest polygon (by bounding-box area) is displayed.
const MAINLAND_ONLY_IDS = new Set([
  36,   // Australia     — Heard Island, Cocos Islands, Christmas Island, Norfolk Island
  152,  // Chile         — Easter Island, Juan Fernández Islands
  208,  // Denmark       — Faroe Islands
  250,  // France        — French Guiana, Martinique, Guadeloupe, Réunion, etc.
  578,  // Norway        — Svalbard
  620,  // Portugal      — Azores, Madeira
  710,  // South Africa  — Marion Island, Prince Edward Islands
  724,  // Spain         — Canary Islands
  840,  // United States — Alaska, Hawaii
]);

// ── SVG path generation ───────────────────────────────────────────────────────

/**
 * For a MultiPolygon feature, return a new feature containing only the
 * mainland polygon. Uses bbox_area × point_count as a combined score so
 * that neither degenerate convex-hull polygons (large bbox, few points)
 * nor tiny islands (small bbox, many points) win over the actual mainland.
 * Safe to call on a Polygon feature — returns it unchanged.
 */
export function keepLargestPolygon(feat) {
  const { type, coordinates } = feat.geometry;
  if (type !== 'MultiPolygon') return feat;

  let largest = coordinates[0];
  let bestScore = 0;

  for (const polygon of coordinates) {
    const ring = polygon[0];
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const area  = (maxLon - minLon) * (maxLat - minLat);
    const score = area * ring.length;
    if (score > bestScore) { bestScore = score; largest = polygon; }
  }

  return { ...feat, geometry: { type: 'Polygon', coordinates: largest } };
}

/**
 * Convert a GeoJSON feature's geometry to a normalised SVG path string
 * that fits inside a 200×200 viewBox with padding, preserving aspect ratio.
 *
 * @param {GeoJSON.Feature} feat
 * @returns {string} SVG path `d` attribute value
 */
export function featureToSvgPath(feat) {
  const { type, coordinates } = feat.geometry;

  // Collect all rings from Polygon or MultiPolygon
  let allRings;
  if (type === 'Polygon') {
    allRings = coordinates;
  } else if (type === 'MultiPolygon') {
    allRings = coordinates.flat(1);
  } else {
    return '';
  }

  // Filter rings that contain any non-finite coordinate (guards against
  // malformed data in the TopoJSON)
  const validRings = allRings.filter(ring =>
    ring.every(([lon, lat]) => isFinite(lon) && isFinite(lat))
  );
  if (validRings.length === 0) return '';

  // Bounding box across all valid rings
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const ring of validRings) {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  const lonRange = maxLon - minLon || 1;
  const latRange = maxLat - minLat || 1;

  // Countries whose bounding box spans > 180° are crossing the antimeridian
  // (e.g. Kiribati, Fiji). The naive bounding box becomes ~360° wide and the
  // shape renders as an invisible sliver. Skip them entirely.
  if (lonRange > 180) return '';

  // Cosine correction: at high latitudes a degree of longitude is shorter
  // than a degree of latitude, so we compress the x-axis by cos(centreLatitude).
  // Without this, Canada/Greenland/Russia appear far too wide.
  const centreLat = (minLat + maxLat) / 2;
  const lonScale  = Math.cos((centreLat * Math.PI) / 180);
  const correctedLonRange = lonRange * lonScale || 1;

  // Fit within a 200×200 viewBox with 15px padding on each side (170px draw area)
  // while preserving the corrected geographic aspect ratio.
  const drawArea = 170;
  const scale = Math.min(drawArea / correctedLonRange, drawArea / latRange);
  const projW  = correctedLonRange * scale;
  const projH  = latRange * scale;

  // Skip anything that still renders too small to be recognisable
  if (projW < 4 || projH < 4) return '';

  // Centre the projected shape in the viewBox
  const offsetX = (200 - projW) / 2;
  const offsetY = (200 - projH) / 2;

  const project = ([lon, lat]) => [
    (lon - minLon) * lonScale * scale + offsetX, // Apply cosine correction to x
    (maxLat - lat) * scale + offsetY,            // Flip Y: SVG Y grows downward
  ];

  return validRings
    .map(ring =>
      ring
        .map(([lon, lat], i) => {
          const [x, y] = project([lon, lat]);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ') + ' Z'
    )
    .join(' ');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch and process world country data.
 * Returns an array of country objects ready for use by game.js.
 *
 * @returns {Promise<Array<{id:number, name:string, aliases:string[], svgPath:string}>>}
 */
export async function loadCountries() {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 10_000);

  let response;
  try {
    response = await fetch(WORLD_ATLAS_URL, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('World atlas load timed out (>10 s). Check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`World atlas fetch failed (HTTP ${response.status})`);
  }

  const topology = await response.json();
  const collection = feature(topology, topology.objects.countries);

  const countries = [];
  const seenIds   = new Set(); // Guard against duplicate features in the TopoJSON

  for (const feat of collection.features) {
    if (!feat.id || !feat.geometry) continue;

    const id   = parseInt(feat.id, 10);
    if (seenIds.has(id)) continue; // Skip duplicate entries (e.g. territory features)
    const info = COUNTRY_INFO[id];
    if (!info) continue; // Not in our name list — skip

    const processedFeat = MAINLAND_ONLY_IDS.has(id) ? keepLargestPolygon(feat) : feat;
    const svgPath = featureToSvgPath(processedFeat);
    if (!svgPath) continue; // Degenerate geometry — skip

    seenIds.add(id);
    countries.push({
      id,
      name:    info.name,
      aliases: info.aliases,
      svgPath,
      tier:    EASY_IDS.has(id) ? 'easy' : 'hard',
    });
  }

  if (countries.length === 0) {
    throw new Error('No country data could be parsed from the world atlas.');
  }

  return countries;
}
