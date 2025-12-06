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

// Derive full configuration from current route config
export function getDerivedConfig() {
  const routeConfig = getCurrentRouteConfig()
  if (!routeConfig) return null

  const westStation = getStationById(routeConfig.westboundStation.id)
  const eastStation = getStationById(routeConfig.eastboundStation.id)

  if (!westStation || !eastStation) {
    console.error('Invalid station IDs in route config')
    return null
  }

  const minSeq = Math.min(westStation.seq, eastStation.seq)
  const maxSeq = Math.max(westStation.seq, eastStation.seq)

  // Calculate visible range with padding
  const startSeq = Math.max(1, minSeq - routeConfig.stopsPadding)
  const endSeq = Math.min(TOTAL_STOPS, maxSeq + routeConfig.stopsPadding)

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
