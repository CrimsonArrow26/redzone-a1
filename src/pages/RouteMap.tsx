import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import './RouteAnalyzer.css'; // Ensure ripple CSS is here
import '../pages/RedZones.css'; // Import RedZones CSS for radar pulse animation

// Haversine distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getRiskLevel = (
  segment: { lat: number; lng: number },
  redZones: { lat: number; lng: number; incidentCount?: number }[]
): 'low' | 'medium' | 'high' => {
  let maxRisk = 'low';
  
  redZones.forEach(zone => {
    const dist = getDistance(segment.lat, segment.lng, zone.lat, zone.lng);
    const incidentCount = zone.incidentCount || 0;
    
    // Risk based on distance and incident count
    if (dist < 0.5) { // Within 500m
      if (incidentCount >= 40) maxRisk = 'high';
      else if (incidentCount >= 20 && maxRisk !== 'high') maxRisk = 'medium';
      else if (maxRisk === 'low') maxRisk = 'low';
    } else if (dist < 1.0) { // Within 1km
      if (incidentCount >= 40 && maxRisk !== 'high') maxRisk = 'medium';
    }
  });

  return maxRisk as 'low' | 'medium' | 'high';
};

const getColor = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'low':
      return 'green';
    case 'medium':
      return 'orange';
    case 'high':
      return 'red';
  }
};

// Custom icons for route markers

const RouteMap = ({
  waypoints,
  redZones,
  onRouteFound,
}: {
  waypoints: L.LatLng[];
  redZones: { lat: number; lng: number; name?: string; severity?: string; description?: string; crimeRate?: number; incidentCount?: number; lastIncident?: string }[];
  onRouteFound: (coords: { lat: number; lng: number }[]) => void;
}) => {
  const map = useMap();

  // Add red zones effect - always show red zones regardless of waypoints
  useEffect(() => {
    if (!map) {
      console.log('🗺️ RouteMap - Map not ready yet');
      return;
    }
    
    if (redZones.length === 0) {
      console.log('🗺️ RouteMap - No red zones to display');
      return;
    }

    console.log('🗺️ RouteMap - Adding red zones:', redZones.length);
    console.log('🗺️ RouteMap - Red zones data:', redZones);
    redZones.forEach((zone, index) => {
      if (isFinite(zone.lat) && isFinite(zone.lng)) {
        const severity = zone.severity || 'medium';
        const incidentCount = zone.incidentCount || 0;
        
        // Get color based on incident count (same logic as RedZones page)
        const getIncidentColor = (count: number) => {
          if (count >= 40) return '#dc2626'; // red
          if (count >= 20) return '#f59e0b'; // orange/yellow
          return '#16a34a'; // green
        };
        
        const color = getIncidentColor(incidentCount);
        console.log(`🗺️ Adding red zone ${index + 1}: ${zone.name} at (${zone.lat}, ${zone.lng}) with ${incidentCount} incidents`);
        
        // Add circle (500m radius like in RedZones page)
        L.circle([zone.lat, zone.lng], {
          radius: 500,
          color: color,
          fillColor: color,
          fillOpacity: 0.2,
          weight: 2
        }).addTo(map);
        
        // Add simple marker for red zone
        const marker = L.marker([zone.lat, zone.lng], {
          icon: L.divIcon({
            className: 'red-zone-marker',
            html: `<div style="
              background: ${color};
              color: white;
              border-radius: 50%;
              width: 16px;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 10px;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            // Ensure the icon stays at the same geographic position
            iconRetinaUrl: undefined,
            shadowUrl: undefined,
            shadowSize: [0, 0],
            shadowAnchor: [0, 0]
          }),
          // Ensure the marker stays at the exact geographic coordinates
          interactive: true,
          bubblingMouseEvents: false
        }).addTo(map);
        
        // Add popup with same information as RedZones page
        marker.bindPopup(`
          <div class="redzones-popup" style="min-width: 200px;">
            <h3 class="redzones-card-title" style="margin: 0 0 8px 0; color: ${color};">${zone.name || 'Red Zone'}</h3>
            <p class="redzones-card-detail-label" style="margin: 0 0 4px 0; font-size: 12px; color: #666;">Crime Rate: ${zone.crimeRate || 'N/A'}</p>
            <p class="redzones-card-detail-label" style="margin: 0 0 4px 0; font-size: 12px; color: #666;">Incidents: ${incidentCount}</p>
            <p class="redzones-card-detail-label" style="margin: 0 0 4px 0; font-size: 12px; color: #666;">Last: ${zone.lastIncident || 'Unknown'}</p>
            <p class="redzones-card-detail-label" style="margin: 0; font-size: 12px; color: #666;">Radius: 500m</p>
          </div>
        `);
        
        console.log(`🗺️ Added markers for red zone: ${zone.name} at (${zone.lat}, ${zone.lng})`);
      } else {
        console.warn(`🗺️ Invalid red zone coordinates:`, zone);
      }
    });
  }, [map, redZones]);

  // Route calculation effect - only when waypoints are available
  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Clear existing route layers (but keep red zones)
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || (layer instanceof L.Marker && layer.options.icon?.options?.className === 'custom-marker')) {
        map.removeLayer(layer);
      }
    });

    // Create routing control
    const control = L.Routing.control({
      waypoints,
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      router: new L.Routing.OSRMv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
      }),
      createMarker: (i: number, wp: any) => {
        const isStart = i === 0;
        // Use Leaflet's default marker with custom icon
        const icon = L.icon({
          iconUrl: isStart ? 
            'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png' :
            'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        return L.marker(wp.latLng, { icon });
      },
    }).addTo(map);

    control.on('routesfound', function (e: any) {
      const route = e.routes[0];
      if (route && route.coordinates) {
        const coords = route.coordinates.map((coord: any) => ({
          lat: coord.lat,
          lng: coord.lng,
        }));
        onRouteFound(coords);

        // Draw colored route segments based on risk
        const segmentLength = Math.max(1, Math.floor(coords.length / 20)); // Create ~20 segments
        
        for (let i = 0; i < coords.length - segmentLength; i += segmentLength) {
          const segmentStart = coords[i];
          const segmentEnd = coords[Math.min(i + segmentLength, coords.length - 1)];

          const midPoint = {
            lat: (segmentStart.lat + segmentEnd.lat) / 2,
            lng: (segmentStart.lng + segmentEnd.lng) / 2,
          };

          const risk = getRiskLevel(midPoint, redZones);
          const color = getColor(risk);

          L.polyline([segmentStart, segmentEnd], {
            color,
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          // Add warning markers for high risk segments
          if (risk === 'high') {
            const warningIcon = L.divIcon({
              className: 'high-risk-marker',
              html: `<div style="
                background: #dc2626;
                color: white;
                border-radius: 50%;
                width: 12px;
                height: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 8px;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">⚠</div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            });

            L.marker([midPoint.lat, midPoint.lng], {
              icon: warningIcon,
            })
              .addTo(map)
              .bindTooltip('⚠️ High Risk Zone', {
                permanent: false,
                direction: 'top',
                className: 'risk-tooltip'
              });
          }
        }

        // Draw the complete route as a single polyline for better visibility
        L.polyline(coords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.6,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Fit map to show the entire route
        const group = new L.featureGroup();
        coords.forEach(coord => group.addLayer(L.marker([coord.lat, coord.lng])));
        map.fitBounds(group.getBounds().pad(0.1));
      }
    });

    control.on('routingerror', function (e: any) {
      console.error('Routing error:', e);
      alert('Could not calculate route. Please check if the locations are accessible by road.');
    });

    return () => {
      try {
        map.removeControl(control);
      } catch (e) {
        console.warn('Failed to remove control:', e);
      }
    };
  }, [map, waypoints, redZones, onRouteFound]);

  return null;
};

export default RouteMap;
