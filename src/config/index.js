import { ALL_STATIONS, E_LINE_STOPS, getStationById, TOTAL_STOPS } from './stations.js'

// Re-export station data
export { ALL_STATIONS, E_LINE_STOPS, getStationById, TOTAL_STOPS }

// Dynamically import all route JSON files using Vite's glob import
const routeModules = import.meta.glob('./routes/*.json', { eager: true })

// Parse routes into a usable format
export const AVAILABLE_ROUTES = Object.entries(routeModules).map(([path, module]) => {
  // Extract route name from path (e.g., './routes/commute.json' -> 'commute')
  const name = path.replace('./routes/', '').replace('.json', '')
  const config = module.default
  return {
    name,
    displayName: config.displayName || name,
    config
  }
})

// Current route state
let currentRouteName = localStorage.getItem('selectedRoute') || AVAILABLE_ROUTES[0]?.name || 'commute'

// Get current route config
export function getCurrentRouteConfig() {
  const route = AVAILABLE_ROUTES.find(r => r.name === currentRouteName)
  return route?.config || AVAILABLE_ROUTES[0]?.config
}

// Set current route
export function setCurrentRoute(routeName) {
  if (AVAILABLE_ROUTES.some(r => r.name === routeName)) {
    currentRouteName = routeName
    localStorage.setItem('selectedRoute', routeName)
    // Dispatch event for UI to react
    window.dispatchEvent(new CustomEvent('routeChanged', { detail: { routeName } }))
  }
}

// Get current route name
export function getCurrentRouteName() {
  return currentRouteName
}

// Helper to get station ID from config (supports both string ID and object with id property)
function getStationId(stationRef) {
  if (typeof stationRef === 'string') return stationRef
  if (stationRef && typeof stationRef === 'object') return stationRef.id
  return null
}

// Derive full configuration from current route config
// Supports multiple config formats:
// - stations: { west: "id", east: "id" } OR legacy westboundStation/eastboundStation
// - view: { start: "id", end: "id" } OR view: { padding: N } OR legacy viewStart/viewEnd/stopsPadding
export function getDerivedConfig() {
  const routeConfig = getCurrentRouteConfig()
  if (!routeConfig) return null

  // Support both new format (stations.west/east) and legacy (westboundStation/eastboundStation)
  const westStationId = getStationId(routeConfig.stations?.west) || getStationId(routeConfig.westboundStation)
  const eastStationId = getStationId(routeConfig.stations?.east) || getStationId(routeConfig.eastboundStation)

  const westStation = getStationById(westStationId)
  const eastStation = getStationById(eastStationId)

  if (!westStation || !eastStation) {
    console.error('Invalid station IDs in route config')
    return null
  }

  const minSeq = Math.min(westStation.seq, eastStation.seq)
  const maxSeq = Math.max(westStation.seq, eastStation.seq)

  // Calculate visible range - support multiple formats
  let startSeq, endSeq

  // New format: view.start/view.end or view.padding
  const viewConfig = routeConfig.view
  const hasExplicitView = viewConfig?.start || viewConfig?.end || routeConfig.viewStart || routeConfig.viewEnd

  if (hasExplicitView) {
    // Explicit view range specified by station IDs
    const viewStartId = getStationId(viewConfig?.start) || getStationId(routeConfig.viewStart)
    const viewEndId = getStationId(viewConfig?.end) || getStationId(routeConfig.viewEnd)
    const viewStartStation = viewStartId ? getStationById(viewStartId) : null
    const viewEndStation = viewEndId ? getStationById(viewEndId) : null

    // Use explicit stations if provided, otherwise fall back to highlighted stations
    startSeq = viewStartStation?.seq ?? minSeq
    endSeq = viewEndStation?.seq ?? maxSeq

    // Ensure start < end
    if (startSeq > endSeq) {
      [startSeq, endSeq] = [endSeq, startSeq]
    }
  } else {
    // Use padding around highlighted stations
    const padding = viewConfig?.padding ?? routeConfig.stopsPadding ?? 0
    startSeq = Math.max(1, minSeq - padding)
    endSeq = Math.min(TOTAL_STOPS, maxSeq + padding)
  }

  // Get distance range for the visible stations
  const startStation = ALL_STATIONS.find(s => s.seq === startSeq)
  const endStation = ALL_STATIONS.find(s => s.seq === endSeq)
  const startDistance = startStation?.distance || 0
  const endDistance = endStation?.distance || 17.6

  return {
    westbound: {
      ...westStation,
      direction: 0,
      directionLabel: 'To Santa Monica'
    },
    eastbound: {
      ...eastStation,
      direction: 1,
      directionLabel: 'To East LA'
    },
    startSeq,
    endSeq,
    startDistance,
    endDistance,
    highlightStartSeq: minSeq,
    highlightEndSeq: maxSeq
  }
}

// Get visible stations based on config
export function getVisibleStations() {
  const config = getDerivedConfig()
  if (!config) return []

  return ALL_STATIONS
    .filter(s => s.seq >= config.startSeq && s.seq <= config.endSeq)
    .map(s => ({
      ...s,
      highlight: s.seq === config.westbound.seq || s.seq === config.eastbound.seq
    }))
}
