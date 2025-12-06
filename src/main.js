import {
  E_LINE_STOPS,
  getDerivedConfig,
  getVisibleStations,
  AVAILABLE_ROUTES,
  getCurrentRouteName,
  setCurrentRoute,
  ALL_STATIONS
} from './config/index.js'

// Overlay integration for desktop app
const setIgnoreMouseEvents = async (ignore) => {
  const { commoners = {} } = globalThis
  if (!commoners.READY) return
  const { overlay } = await commoners.READY
  if (!overlay) return
  overlay.setIgnoreMouseEvents(ignore)
}

const registerAsInteractive = (element) => {
  element.addEventListener('mouseenter', () => setIgnoreMouseEvents(false))
  element.addEventListener('mouseleave', () => setIgnoreMouseEvents(true))
}

// Metro API configuration
const AGENCY = 'LACMTA_Rail'

// State
let wsConnection = null
let vehicleData = new Map() // vehicle_id -> vehicle info
let trainPositions = new Map() // vehicle_id -> { currentPos, targetPos, speed, lastUpdate }
let lastUpdated = null
let connectionStatus = 'disconnected'
let animationFrameId = null
let pendingVehicleUpdates = [] // Buffer for batching updates
let updateScheduled = false
let isVertical = localStorage.getItem('orientation') !== 'horizontal' // Minimap orientation
let themeMode = localStorage.getItem('themeMode') || 'system' // 'system', 'light', 'dark'

// Theme management
function applyTheme() {
  const root = document.documentElement
  root.removeAttribute('data-theme')

  if (themeMode === 'system') {
    // Let CSS handle it via prefers-color-scheme
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', themeMode)
  }
}

function cycleTheme() {
  const modes = ['system', 'light', 'dark']
  const currentIndex = modes.indexOf(themeMode)
  themeMode = modes[(currentIndex + 1) % modes.length]
  localStorage.setItem('themeMode', themeMode)
  applyTheme()
  updateThemeButton()
}

function getThemeIcon() {
  switch (themeMode) {
    case 'system': return '◐'
    case 'light': return '☀'
    case 'dark': return '☾'
    default: return '◐'
  }
}

function updateThemeButton() {
  const btn = document.getElementById('theme-toggle')
  if (btn) {
    btn.textContent = getThemeIcon()
    btn.title = `Theme: ${themeMode}`
  }
}

// Update the "last update" display
function updateLastUpdateDisplay() {
  const el = document.getElementById('last-update')
  if (!el) return

  if (!lastUpdated) {
    el.textContent = 'waiting...'
    return
  }

  const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
  if (seconds < 2) {
    el.textContent = 'just now'
  } else if (seconds < 60) {
    el.textContent = `${seconds}s ago`
  } else {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    el.textContent = `${minutes}m ${secs}s ago`
  }
}

// Flash the status dot to indicate data received
function flashDataReceived() {
  const dot = document.querySelector('.connection-status .status-dot')
  if (!dot) return

  dot.classList.add('flash')
  setTimeout(() => dot.classList.remove('flash'), 300)
}

// Generate route selector options
function getRouteOptions() {
  const currentRoute = getCurrentRouteName()
  return AVAILABLE_ROUTES.map(route =>
    `<option value="${route.name}" ${route.name === currentRoute ? 'selected' : ''}>${route.displayName}</option>`
  ).join('')
}

// Render the initial UI
function renderApp() {
  document.querySelector('#app').innerHTML = `
    <div class="app-container ${isVertical ? 'vertical' : 'horizontal'}">
      <div class="minimap" id="minimap">
        <div class="minimap-track"></div>
        <div class="minimap-route-highlight" id="minimap-route-highlight"></div>
        <div class="minimap-stations" id="minimap-stations"></div>
        <div class="minimap-trains" id="minimap-trains"></div>
        <div class="offscreen-indicator above" id="trains-above" style="display: none;"></div>
        <div class="offscreen-indicator below" id="trains-below" style="display: none;"></div>
      </div>
      <div class="sidebar">
        <div class="sidebar-controls">
          <select class="route-select" id="route-select" title="Select route">
            ${getRouteOptions()}
          </select>
          <button class="icon-btn" id="theme-toggle" title="Theme: ${themeMode}">
            ${getThemeIcon()}
          </button>
          <button class="icon-btn" id="orientation-toggle" title="Toggle layout">
            ${isVertical ? '↔' : '↕'}
          </button>
        </div>
        <div class="status-row">
          <div id="connection-status" class="connection-status disconnected">
            <span class="status-dot"></span>
          </div>
          <span class="last-update" id="last-update"></span>
        </div>
      </div>
    </div>
  `

  // Render initial minimap stations and route highlight
  renderMinimapStations()
  renderRouteHighlight()

  // Add route selector handler
  document.getElementById('route-select').addEventListener('change', (e) => {
    setCurrentRoute(e.target.value)
  })

  // Add orientation toggle handler
  document.getElementById('orientation-toggle').addEventListener('click', toggleOrientation)

  // Add theme toggle handler
  document.getElementById('theme-toggle').addEventListener('click', cycleTheme)

  // Register app container as interactive for overlay mode
  const appContainer = document.querySelector('.app-container')
  if (appContainer) {
    registerAsInteractive(appContainer)
  }

  // Re-apply connection status after re-render
  updateConnectionStatus(connectionStatus)

  // Update last update display
  updateLastUpdateDisplay()
}

// Toggle minimap orientation
function toggleOrientation() {
  isVertical = !isVertical
  localStorage.setItem('orientation', isVertical ? 'vertical' : 'horizontal')
  renderApp()
  updateTrainTargets()
}


// Calculate position on minimap using linear track distance
// Vertical: 0% = top (Santa Monica/high distance), 100% = bottom (East LA/low distance)
// Horizontal: 0% = left (Santa Monica/high distance), 100% = right (East LA/low distance)
function getMinimapPosition(seq) {
  const config = getDerivedConfig()
  // Find the station's distance by sequence number
  const station = ALL_STATIONS.find(s => s.seq === seq)
  if (!station) return 50 // Fallback to center

  // Clamp distance to visible range
  const clampedDistance = Math.max(config.startDistance, Math.min(config.endDistance, station.distance))
  // Normalize to 0-100 based on distance within the range
  const distanceRange = config.endDistance - config.startDistance
  if (distanceRange === 0) return 50
  const normalized = (clampedDistance - config.startDistance) / distanceRange
  // Flip so higher distance (Santa Monica) is at top/left (0%), lower distance (East LA) at bottom/right (100%)
  return 100 - (normalized * 100)
}

// Render minimap station markers
function renderMinimapStations() {
  const container = document.getElementById('minimap-stations')
  if (!container) return

  const config = getDerivedConfig()
  const visibleStations = getVisibleStations()
  const positionProp = isVertical ? 'top' : 'left'

  container.innerHTML = visibleStations.map(station => {
    const position = getMinimapPosition(station.seq)

    // Add arrival time for stations of interest
    let arrivalHtml = ''
    if (station.id === config.westbound.id) {
      arrivalHtml = `<div class="station-arrival" id="arrival-westbound"></div>`
    } else if (station.id === config.eastbound.id) {
      arrivalHtml = `<div class="station-arrival" id="arrival-eastbound"></div>`
    }

    return `
      <div class="minimap-station ${station.highlight ? 'highlight' : ''}"
           style="${positionProp}: ${position}%"
           title="${station.name}">
        <div class="station-dot"></div>
        <div class="station-label">${station.name}</div>
        ${arrivalHtml}
      </div>
    `
  }).join('')
}

// Update the arrival times shown on the minimap
function updateMinimapArrivals() {
  const config = getDerivedConfig()
  const westboundArrivals = getArrivalsForStation(config.westbound)
  const eastboundArrivals = getArrivalsForStation(config.eastbound)

  const westEl = document.getElementById('arrival-westbound')
  const eastEl = document.getElementById('arrival-eastbound')

  if (westEl) {
    if (westboundArrivals.length > 0) {
      const times = westboundArrivals.slice(0, 2).map(a =>
        a.estimatedMinutes === 0 ? 'Now' : `${a.estimatedMinutes}m`
      )
      westEl.innerHTML = `<span class="arrival-badge westbound">${times.join(', ')}</span>`
    } else {
      westEl.innerHTML = ''
    }
  }

  if (eastEl) {
    if (eastboundArrivals.length > 0) {
      const times = eastboundArrivals.slice(0, 2).map(a =>
        a.estimatedMinutes === 0 ? 'Now' : `${a.estimatedMinutes}m`
      )
      eastEl.innerHTML = `<span class="arrival-badge eastbound">${times.join(', ')}</span>`
    } else {
      eastEl.innerHTML = ''
    }
  }
}

// Render the route highlight between stations of interest
function renderRouteHighlight() {
  const container = document.getElementById('minimap-route-highlight')
  if (!container) return

  const config = getDerivedConfig()
  const startPos = getMinimapPosition(config.highlightEndSeq)
  const endPos = getMinimapPosition(config.highlightStartSeq)

  // startPos is smaller (higher on screen), endPos is larger
  const start = startPos
  const size = endPos - startPos

  if (isVertical) {
    container.innerHTML = `
      <div class="route-highlight-bar" style="top: ${start}%; height: ${size}%"></div>
    `
  } else {
    container.innerHTML = `
      <div class="route-highlight-bar" style="left: ${start}%; width: ${size}%"></div>
    `
  }
}

// Update train target positions from vehicle data
function updateTrainTargets() {
  const now = Date.now()
  const config = getDerivedConfig()

  vehicleData.forEach((vehicle, vehicleId) => {
    if (vehicle.routeCode !== '804') return

    const stopInfo = E_LINE_STOPS[vehicle.stopId]
    if (!stopInfo) return

    // Use exact stop position - no extrapolation
    const targetSeq = stopInfo.seq

    // Keep trains that are within extended range for arrival calculations
    // but only show them on minimap if within visible range
    const isInVisibleRange = targetSeq >= config.startSeq && targetSeq <= config.endSeq

    // Use the position calculation
    const targetPos = getMinimapPosition(targetSeq)
    const direction = vehicle.directionId === 0 ? 'westbound' : 'eastbound'
    const isStopped = vehicle.currentStatus === 'STOPPED_AT'

    // Get or create train position state
    let trainState = trainPositions.get(vehicleId)

    if (!trainState) {
      // New train - start at target position
      trainState = {
        currentPos: targetPos,
        targetPos: targetPos,
        direction,
        isStopped,
        stopName: stopInfo.name,
        speed: vehicle.speed || 0,
        lastUpdate: now,
        isVisible: isInVisibleRange,
        seq: targetSeq
      }
    } else {
      // Existing train - update target (snap to new position, no interpolation)
      trainState.currentPos = targetPos
      trainState.targetPos = targetPos
      trainState.direction = direction
      trainState.isStopped = isStopped
      trainState.stopName = stopInfo.name
      trainState.speed = vehicle.speed || 0
      trainState.lastUpdate = now
      trainState.isVisible = isInVisibleRange
      trainState.seq = targetSeq
    }

    trainPositions.set(vehicleId, trainState)
  })

  // Remove stale trains (not updated in 2 minutes)
  trainPositions.forEach((state, vehicleId) => {
    if (now - state.lastUpdate > 120000) {
      trainPositions.delete(vehicleId)
    }
  })
}

// Render trains on the minimap (no interpolation - show verified positions only)
function renderTrains() {
  const container = document.getElementById('minimap-trains')
  if (!container) {
    animationFrameId = requestAnimationFrame(renderTrains)
    return
  }

  const config = getDerivedConfig()

  // Count trains outside visible range by direction
  const offscreenAbove = { westbound: 0, eastbound: 0 }  // Higher seq (toward Santa Monica)
  const offscreenBelow = { westbound: 0, eastbound: 0 }  // Lower seq (toward East LA)

  // Render only visible trains
  const trainsHtml = []
  const positionProp = isVertical ? 'top' : 'left'
  trainPositions.forEach((state, vehicleId) => {
    if (!state.isVisible) {
      // Count offscreen trains by direction
      if (state.seq > config.endSeq) {
        offscreenAbove[state.direction]++
      } else if (state.seq < config.startSeq) {
        offscreenBelow[state.direction]++
      }
      return
    }

    const statusClass = state.isStopped ? 'stopped' : 'moving'
    trainsHtml.push(`
      <div class="minimap-train ${state.direction} ${statusClass}"
           style="${positionProp}: ${state.currentPos}%"
           title="Train ${vehicleId}: ${state.stopName}">
      </div>
    `)
  })

  container.innerHTML = trainsHtml.join('')

  // Calculate hidden stops
  const stopsAbove = Math.max(0, 28 - config.endSeq)  // Stops toward Santa Monica
  const stopsBelow = Math.max(0, config.startSeq - 1)  // Stops toward East LA

  // Update offscreen train indicators
  updateOffscreenIndicators(offscreenAbove, offscreenBelow, stopsAbove, stopsBelow)

  // Continue render loop
  animationFrameId = requestAnimationFrame(renderTrains)
}

// Build indicator HTML with stops in gray and trains by direction color
function buildIndicatorHtml(stops, trains) {
  const parts = []

  // Hidden stops in gray
  if (stops > 0) {
    parts.push(`<span class="indicator-stops">+${stops}</span>`)
  }

  // Westbound trains in blue
  if (trains.westbound > 0) {
    parts.push(`<span class="indicator-westbound">+${trains.westbound}</span>`)
  }

  // Eastbound trains in pink
  if (trains.eastbound > 0) {
    parts.push(`<span class="indicator-eastbound">+${trains.eastbound}</span>`)
  }

  return parts.join('')
}

// Update the offscreen train count indicators
function updateOffscreenIndicators(trainsAbove, trainsBelow, stopsAbove, stopsBelow) {
  const aboveEl = document.getElementById('trains-above')
  const belowEl = document.getElementById('trains-below')

  const hasAbove = stopsAbove > 0 || trainsAbove.westbound > 0 || trainsAbove.eastbound > 0
  const hasBelow = stopsBelow > 0 || trainsBelow.westbound > 0 || trainsBelow.eastbound > 0

  if (aboveEl) {
    if (hasAbove) {
      aboveEl.innerHTML = buildIndicatorHtml(stopsAbove, trainsAbove)
      aboveEl.style.display = 'flex'
    } else {
      aboveEl.style.display = 'none'
    }
  }

  if (belowEl) {
    if (hasBelow) {
      belowEl.innerHTML = buildIndicatorHtml(stopsBelow, trainsBelow)
      belowEl.style.display = 'flex'
    } else {
      belowEl.style.display = 'none'
    }
  }
}

// Start the render loop
function startTrainAnimation() {
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(renderTrains)
  }
}

// Legacy function for compatibility
function renderMinimapTrains() {
  updateTrainTargets()
}

// Update connection status display
function updateConnectionStatus(status) {
  connectionStatus = status
  const el = document.getElementById('connection-status')
  if (!el) return

  el.className = `connection-status ${status}`
  const dot = el.querySelector('.status-dot')
  if (!dot) return

  if (status === 'connecting') {
    dot.className = 'status-dot pulse'
  } else {
    dot.className = 'status-dot'
  }
}

// Estimate minutes until arrival based on stops away
// Assumes roughly 2-3 minutes between stops on average
function estimateMinutes(stopsAway) {
  if (stopsAway <= 0) return 0
  // Average 2.5 minutes per stop
  return Math.round(stopsAway * 2.5)
}

// Get arrivals for a station from vehicle data
function getArrivalsForStation(station) {
  const arrivals = []
  const now = Math.floor(Date.now() / 1000)

  vehicleData.forEach((vehicle, vehicleId) => {
    // Only E Line trains
    if (vehicle.routeCode !== '804') return

    // Check direction matches
    if (vehicle.directionId !== station.direction) return

    // Get current stop info
    const currentStopId = vehicle.stopId
    const currentStopInfo = E_LINE_STOPS[currentStopId]
    const stationStopInfo = E_LINE_STOPS[station.id]

    if (!currentStopInfo || !stationStopInfo) return

    // Calculate stops away based on direction
    let stopsAway
    if (station.direction === 0) {
      // Westbound: higher sequence = further along
      stopsAway = stationStopInfo.seq - currentStopInfo.seq
    } else {
      // Eastbound: lower sequence = further along (going back)
      stopsAway = currentStopInfo.seq - stationStopInfo.seq
    }

    // Skip if train has passed the station or is too far
    if (stopsAway < 0 || stopsAway > 15) return

    // Check data freshness (skip if older than 2 minutes)
    if (now - vehicle.timestamp > 120) return

    const estimatedMinutes = estimateMinutes(stopsAway)
    const currentStatus = vehicle.currentStatus

    arrivals.push({
      vehicleId,
      stopsAway,
      estimatedMinutes,
      currentStop: currentStopInfo.name,
      currentStatus,
      destination: station.direction === 0 ? 'Santa Monica' : 'East LA'
    })
  })

  // Sort by estimated arrival time
  arrivals.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)

  return arrivals.slice(0, 4)
}

// Process vehicle position data from WebSocket
function processVehiclePositions(data) {
  // Handle both array and single object formats
  const vehicles = Array.isArray(data) ? data : [data]

  // Add to pending updates buffer
  pendingVehicleUpdates.push(...vehicles)

  // Schedule a batched update if not already scheduled
  if (!updateScheduled) {
    updateScheduled = true
    requestAnimationFrame(flushVehicleUpdates)
  }
}

// Flush all pending vehicle updates in a single batch
function flushVehicleUpdates() {
  updateScheduled = false

  if (pendingVehicleUpdates.length === 0) return

  // Process all pending updates
  pendingVehicleUpdates.forEach(item => {
    if (!item.vehicle || item.route_code !== '804') return

    const vehicle = item.vehicle
    const vehicleId = item.id

    vehicleData.set(vehicleId, {
      tripId: vehicle.trip?.tripId,
      routeCode: item.route_code,
      directionId: vehicle.trip?.directionId,
      latitude: vehicle.position?.latitude,
      longitude: vehicle.position?.longitude,
      speed: vehicle.position?.speed || 0,
      currentStopSequence: vehicle.currentStopSequence,
      currentStatus: vehicle.currentStatus,
      stopId: vehicle.stopId,
      timestamp: parseInt(vehicle.timestamp) || Math.floor(Date.now() / 1000)
    })
  })

  // Clear the buffer
  pendingVehicleUpdates = []

  // Update UI once for the entire batch
  lastUpdated = new Date()
  updateTrainTargets()
  updateMinimapArrivals()
  updateLastUpdateDisplay()
  flashDataReceived()
}

// Connect to WebSocket for real-time updates
function connectWebSocket() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return
  }

  updateConnectionStatus('connecting')

  // Connect to vehicle_positions WebSocket for all rail lines
  // (filtering for E Line in processVehiclePositions)
  const wsUrl = `wss://api.metro.net/ws/${AGENCY}/vehicle_positions`

  try {
    wsConnection = new WebSocket(wsUrl)

    wsConnection.onopen = () => {
      console.log('WebSocket connected')
      updateConnectionStatus('connected')
      // Send initial ping
      wsConnection.send('ping')
    }

    wsConnection.onmessage = (event) => {
      const data = event.data

      // Handle pong responses
      if (data === 'pong') {
        return
      }

      try {
        const parsed = JSON.parse(data)
        processVehiclePositions(parsed)
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    wsConnection.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      updateConnectionStatus('disconnected')

      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000)
    }

    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error)
      updateConnectionStatus('disconnected')
    }

    // Send periodic pings to keep connection alive
    setInterval(() => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send('ping')
      }
    }, 30000)

  } catch (e) {
    console.error('Failed to create WebSocket:', e)
    updateConnectionStatus('disconnected')
    setTimeout(connectWebSocket, 5000)
  }
}

// Clean up old vehicle data periodically
function cleanupOldData() {
  const now = Math.floor(Date.now() / 1000)
  const maxAge = 120 // 2 minutes

  vehicleData.forEach((vehicle, vehicleId) => {
    if (now - vehicle.timestamp > maxAge) {
      vehicleData.delete(vehicleId)
    }
  })
}

// Handle route change
function onRouteChanged() {
  // Clear train positions when route changes
  trainPositions.clear()
  // Re-render the app with new route
  renderMinimapStations()
  renderRouteHighlight()
  updateTrainTargets()
  updateMinimapArrivals()
}

// Initialize
function init() {
  applyTheme()
  renderApp()
  connectWebSocket()
  startTrainAnimation()

  // Listen for route changes
  window.addEventListener('routeChanged', onRouteChanged)

  // Clean up old data every 30 seconds
  setInterval(cleanupOldData, 30000)

  // Re-render every 10 seconds to update estimated times
  setInterval(() => {
    if (vehicleData.size > 0) {
      updateMinimapArrivals()
    }
  }, 10000)

  // Update "last update" display every second
  setInterval(updateLastUpdateDisplay, 1000)
}

// Start the app
init()
