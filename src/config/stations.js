// All E Line stations with their IDs and sequence numbers
export const ALL_STATIONS = [
  { id: '80401', name: 'East LA', seq: 1 },
  { id: '80402', name: 'Maravilla', seq: 2 },
  { id: '80403', name: 'Indiana', seq: 3 },
  { id: '80404', name: 'Soto', seq: 4 },
  { id: '80405', name: 'Mariachi Plaza', seq: 5 },
  { id: '80406', name: 'Pico/Aliso', seq: 6 },
  { id: '80407', name: 'Little Tokyo', seq: 7 },
  { id: '81401', name: 'Union Station', seq: 8 },
  { id: '81403', name: 'Historic Broadway', seq: 9 },
  { id: '81404', name: 'Grand Av Arts', seq: 10 },
  { id: '80122', name: '7th/Metro', seq: 11 },
  { id: '80123', name: 'Pico', seq: 12 },
  { id: '80124', name: 'LATTC', seq: 13 },
  { id: '80125', name: 'USC', seq: 14 },
  { id: '80126', name: 'Vermont', seq: 15 },
  { id: '80127', name: 'Western', seq: 16 },
  { id: '80128', name: 'Crenshaw', seq: 17 },
  { id: '80129', name: 'Farmdale', seq: 18 },
  { id: '80130', name: 'La Brea', seq: 19 },
  { id: '80131', name: 'La Cienega', seq: 20 },
  { id: '80132', name: 'Culver City', seq: 21 },
  { id: '80133', name: 'Palms', seq: 22 },
  { id: '80134', name: 'Rancho Park', seq: 23 },
  { id: '80135', name: 'Sepulveda', seq: 24 },
  { id: '80136', name: 'Bundy', seq: 25 },
  { id: '80137', name: 'Bergamot', seq: 26 },
  { id: '80138', name: '17th/SMC', seq: 27 },
  { id: '80139', name: 'Santa Monica', seq: 28 }
]

// E Line stop lookup by ID (for GTFS data)
export const E_LINE_STOPS = {
  '80401': { name: 'East LA Civic Center', seq: 1 },
  '80402': { name: 'Maravilla', seq: 2 },
  '80403': { name: 'Indiana', seq: 3 },
  '80404': { name: 'Soto', seq: 4 },
  '80405': { name: 'Mariachi Plaza', seq: 5 },
  '80406': { name: 'Pico/Aliso', seq: 6 },
  '80407': { name: 'Little Tokyo/Arts District', seq: 7 },
  '81401': { name: 'Union Station', seq: 8 },
  '81403': { name: 'Historic Broadway', seq: 9 },
  '81404': { name: 'Grand Av Arts/Bunker Hill', seq: 10 },
  '80122': { name: '7th St/Metro Center', seq: 11 },
  '80123': { name: 'Pico', seq: 12 },
  '80124': { name: 'LATTC/Ortho Institute', seq: 13 },
  '80125': { name: 'Expo Park/USC', seq: 14 },
  '80126': { name: 'Expo/Vermont', seq: 15 },
  '80127': { name: 'Expo/Western', seq: 16 },
  '80128': { name: 'Expo/Crenshaw', seq: 17 },
  '80129': { name: 'Farmdale', seq: 18 },
  '80130': { name: 'Expo/La Brea', seq: 19 },
  '80131': { name: 'La Cienega/Jefferson', seq: 20 },
  '80132': { name: 'Culver City', seq: 21 },
  '80133': { name: 'Palms', seq: 22 },
  '80134': { name: 'Westwood/Rancho Park', seq: 23 },
  '80135': { name: 'Expo/Sepulveda', seq: 24 },
  '80136': { name: 'Expo/Bundy', seq: 25 },
  '80137': { name: '26th St/Bergamot', seq: 26 },
  '80138': { name: '17th St/SMC', seq: 27 },
  '80139': { name: 'Downtown Santa Monica', seq: 28 }
}

// Get station by ID
export function getStationById(id) {
  return ALL_STATIONS.find(s => s.id === id)
}

// Total number of stops on the E Line
export const TOTAL_STOPS = 28
