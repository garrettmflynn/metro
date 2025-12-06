/**
 * E Line Station Configuration
 *
 * HOW TO UPDATE STATION DATA:
 *
 * 1. Station IDs: These are Metro's official GTFS stop IDs. If Metro updates
 *    their GTFS feed with new IDs, update the 'id' field for affected stations.
 *    Find current IDs at: https://developer.metro.net/gtfs-schedule-data/
 *
 * 2. Sequence Numbers (seq): Represent the order of stops from east to west.
 *    - seq 1 = East LA (eastern terminus)
 *    - seq 28 = Santa Monica (western terminus)
 *    If a new station is added between existing stations, you'll need to
 *    renumber all subsequent stations and update TOTAL_STOPS.
 *
 * 3. Distance (miles): Cumulative track distance from East LA station.
 *    Used for proportional station positioning on the minimap.
 *    Metro publishes approximate distances; update if official data changes.
 *
 * 4. Adding a New Station:
 *    - Add entry to ALL_STATIONS in correct sequence order
 *    - Add entry to E_LINE_STOPS with matching id, name, seq, distance
 *    - Update TOTAL_STOPS count
 *    - Renumber seq for all stations after the new one
 *
 * 5. Removing a Station:
 *    - Remove from both ALL_STATIONS and E_LINE_STOPS
 *    - Renumber seq for remaining stations
 *    - Update TOTAL_STOPS count
 *
 * Note: E_LINE_STOPS uses full official names; ALL_STATIONS uses shorter display names.
 *
 * ROUTE CONFIG FORMAT (in routes/*.json):
 *
 * {
 *   "displayName": "Route Name",
 *   "stations": { "west": "stationId", "east": "stationId" },
 *   "view": { "padding": 3 }  // OR { "start": "stationId", "end": "stationId" }
 * }
 *
 * - stations.west: westbound station of interest (toward Santa Monica)
 * - stations.east: eastbound station of interest (toward East LA)
 * - view.padding: number of stops to show before/after highlighted stations
 * - view.start/end: explicit station IDs for visible range boundaries
 *
 * Examples:
 *   { "stations": { "west": "80133", "east": "80125" }, "view": { "padding": 3 } }
 *   { "stations": { "west": "80133", "east": "80125" }, "view": { "start": "80401", "end": "80139" } }
 */

// All E Line stations with their IDs, sequence numbers, and cumulative distance (miles from East LA)
// Distances are approximate based on Metro's published data
export const ALL_STATIONS = [
  { id: '80401', name: 'East LA', seq: 1, distance: 0 },
  { id: '80402', name: 'Maravilla', seq: 2, distance: 0.5 },
  { id: '80403', name: 'Indiana', seq: 3, distance: 1.1 },
  { id: '80404', name: 'Soto', seq: 4, distance: 1.7 },
  { id: '80405', name: 'Mariachi Plaza', seq: 5, distance: 2.3 },
  { id: '80406', name: 'Pico/Aliso', seq: 6, distance: 2.9 },
  { id: '80407', name: 'Little Tokyo', seq: 7, distance: 3.5 },
  { id: '81401', name: 'Union Station', seq: 8, distance: 4.2 },
  { id: '81403', name: 'Historic Broadway', seq: 9, distance: 4.6 },
  { id: '81404', name: 'Grand Av Arts', seq: 10, distance: 5.0 },
  { id: '80122', name: '7th/Metro', seq: 11, distance: 5.5 },
  { id: '80123', name: 'Pico', seq: 12, distance: 6.1 },
  { id: '80124', name: 'LATTC', seq: 13, distance: 6.7 },
  { id: '80125', name: 'USC', seq: 14, distance: 7.3 },
  { id: '80126', name: 'Vermont', seq: 15, distance: 8.0 },
  { id: '80127', name: 'Western', seq: 16, distance: 8.8 },
  { id: '80128', name: 'Crenshaw', seq: 17, distance: 9.6 },
  { id: '80129', name: 'Farmdale', seq: 18, distance: 10.2 },
  { id: '80130', name: 'La Brea', seq: 19, distance: 10.9 },
  { id: '80131', name: 'La Cienega', seq: 20, distance: 11.8 },
  { id: '80132', name: 'Culver City', seq: 21, distance: 12.7 },
  { id: '80133', name: 'Palms', seq: 22, distance: 13.5 },
  { id: '80134', name: 'Rancho Park', seq: 23, distance: 14.3 },
  { id: '80135', name: 'Sepulveda', seq: 24, distance: 15.0 },
  { id: '80136', name: 'Bundy', seq: 25, distance: 15.8 },
  { id: '80137', name: 'Bergamot', seq: 26, distance: 16.5 },
  { id: '80138', name: '17th/SMC', seq: 27, distance: 17.1 },
  { id: '80139', name: 'Santa Monica', seq: 28, distance: 17.6 }
]

// E Line stop lookup by ID (for GTFS data) - includes distance for position calculations
export const E_LINE_STOPS = {
  '80401': { name: 'East LA Civic Center', seq: 1, distance: 0 },
  '80402': { name: 'Maravilla', seq: 2, distance: 0.5 },
  '80403': { name: 'Indiana', seq: 3, distance: 1.1 },
  '80404': { name: 'Soto', seq: 4, distance: 1.7 },
  '80405': { name: 'Mariachi Plaza', seq: 5, distance: 2.3 },
  '80406': { name: 'Pico/Aliso', seq: 6, distance: 2.9 },
  '80407': { name: 'Little Tokyo/Arts District', seq: 7, distance: 3.5 },
  '81401': { name: 'Union Station', seq: 8, distance: 4.2 },
  '81403': { name: 'Historic Broadway', seq: 9, distance: 4.6 },
  '81404': { name: 'Grand Av Arts/Bunker Hill', seq: 10, distance: 5.0 },
  '80122': { name: '7th St/Metro Center', seq: 11, distance: 5.5 },
  '80123': { name: 'Pico', seq: 12, distance: 6.1 },
  '80124': { name: 'LATTC/Ortho Institute', seq: 13, distance: 6.7 },
  '80125': { name: 'Expo Park/USC', seq: 14, distance: 7.3 },
  '80126': { name: 'Expo/Vermont', seq: 15, distance: 8.0 },
  '80127': { name: 'Expo/Western', seq: 16, distance: 8.8 },
  '80128': { name: 'Expo/Crenshaw', seq: 17, distance: 9.6 },
  '80129': { name: 'Farmdale', seq: 18, distance: 10.2 },
  '80130': { name: 'Expo/La Brea', seq: 19, distance: 10.9 },
  '80131': { name: 'La Cienega/Jefferson', seq: 20, distance: 11.8 },
  '80132': { name: 'Culver City', seq: 21, distance: 12.7 },
  '80133': { name: 'Palms', seq: 22, distance: 13.5 },
  '80134': { name: 'Westwood/Rancho Park', seq: 23, distance: 14.3 },
  '80135': { name: 'Expo/Sepulveda', seq: 24, distance: 15.0 },
  '80136': { name: 'Expo/Bundy', seq: 25, distance: 15.8 },
  '80137': { name: '26th St/Bergamot', seq: 26, distance: 16.5 },
  '80138': { name: '17th St/SMC', seq: 27, distance: 17.1 },
  '80139': { name: 'Downtown Santa Monica', seq: 28, distance: 17.6 }
}

// Get station by ID
export function getStationById(id) {
  return ALL_STATIONS.find(s => s.id === id)
}

// Total number of stops on the E Line
export const TOTAL_STOPS = 28
