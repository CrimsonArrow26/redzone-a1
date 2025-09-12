import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteAnalyzer.css';
import { createClient } from '@supabase/supabase-js';
import Header from '../components/Header';
import RouteMap from './RouteMap';
import { geocodeClosestMatch } from '../utils/geocoding'; // ✅ FIXED — use new version!

const supabase = createClient(
  'https://shqfvfjsxtdeknqncjfa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNocWZ2ZmpzeHRkZWtucW5jamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDgzNzMsImV4cCI6MjA2ODQ4NDM3M30.enzNuGiPvfMZLUPLPeDPBlMsHBOP9foFOjbGjQhLsnc'
);

interface RedZone {
  id: string;
  name: string;
  coordinates: [number, number];
  crimeRate: number;
  incidentCount: number;
  lastIncident: string;
  risk_level: 'high' | 'medium' | 'low';
  radius: number;
}

const RouteAnalyzer = () => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<L.LatLng[]>([]);
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [riskLevel, setRiskLevel] = useState('');
  const [routeCoords, setRouteCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [redZonesLoading, setRedZonesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Haversine distance in meters (same as RedZones)
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Validate coordinates (same as RedZones)
  function isValidCoordinate(lat: any, lng: any): boolean {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    return !isNaN(latNum) && !isNaN(lngNum) && 
           latNum >= -90 && latNum <= 90 && 
           lngNum >= -180 && lngNum <= 180;
  }

  // Get incident color (same as RedZones)
  function getIncidentColor(incidentCount: number) {
    if (incidentCount >= 40) return '#dc2626'; // red
    if (incidentCount >= 20) return '#f59e0b'; // orange/yellow
    return '#16a34a'; // green
  }

  // Fetch red zones on component mount (same logic as RedZones)
  useEffect(() => {
    const fetchRedZones = async () => {
      try {
        setRedZonesLoading(true);
        const { data, error } = await supabase.from('red_zones').select('*');
        
        if (error) {
          console.error('Error fetching red zones:', error);
          setRedZonesLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setRedZones([]);
          setRedZonesLoading(false);
          return;
        }

        // Transform and validate data (same as RedZones)
        const zones = data
          .filter(zone => zone && zone.name && zone.latitude && zone.longitude)
          .map(zone => ({
            id: zone.id,
            name: zone.name,
            coordinates: [parseFloat(zone.latitude), parseFloat(zone.longitude)] as [number, number],
            risk_level: zone.risk_level || 'low',
            incidentCount: parseInt(zone.incident_count) || 0,
            crimeRate: parseFloat(zone.crime_rate) || 0,
            lastIncident: zone.last_incident || 'Unknown',
            radius: 500
          }))
          .filter(zone => zone !== null && isValidCoordinate(zone.coordinates[0], zone.coordinates[1]));

        console.log('🗺️ Route Analyzer - Red zones loaded:', zones.length);
        setRedZones(zones);
        setRedZonesLoading(false);
      } catch (error) {
        console.error('Error fetching red zones:', error);
        setRedZonesLoading(false);
      }
    };

    fetchRedZones();
  }, []);

  const calculateRisk = (
    routeCoords: { lat: number; lng: number }[],
    redZones: RedZone[]
  ) => {
    let maxRisk = 'low';
    let totalRiskScore = 0;
    let riskPoints = 0;

    routeCoords.forEach((point) => {
      redZones.forEach((zone) => {
        const distance = haversineDistance(point.lat, point.lng, zone.coordinates[0], zone.coordinates[1]);
        const incidentCount = zone.incidentCount || 0;
        
        if (distance < 500) {
          // Within 500m - high risk zone
          if (incidentCount >= 40) {
            maxRisk = 'high';
            totalRiskScore += 3;
            riskPoints++;
          } else if (incidentCount >= 20) {
            if (maxRisk !== 'high') maxRisk = 'medium';
            totalRiskScore += 2;
            riskPoints++;
          } else {
            totalRiskScore += 1;
            riskPoints++;
          }
        } else if (distance < 1000) {
          // Within 1km - medium risk zone
          if (incidentCount >= 40) {
            if (maxRisk !== 'high') maxRisk = 'medium';
            totalRiskScore += 1.5;
            riskPoints++;
          } else if (incidentCount >= 20) {
            totalRiskScore += 1;
            riskPoints++;
          }
        } else if (distance < 2000) {
          // Within 2km - low risk zone
          if (incidentCount >= 40) {
            totalRiskScore += 0.5;
            riskPoints++;
          }
        }
      });
    });

    // Calculate average risk score
    const avgRiskScore = riskPoints > 0 ? totalRiskScore / riskPoints : 0;
    
    if (maxRisk === 'high' || avgRiskScore >= 2.5) return 'high';
    if (maxRisk === 'medium' || avgRiskScore >= 1.5) return 'medium';
    return 'low';
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setRiskLevel('');
    setRouteCoords([]);
    setError('');
    setSuccess('');
    
    try {
      // Validate inputs
      if (!source.trim() || !destination.trim()) {
        setError('Please enter both source and destination locations.');
        return;
      }

      // Geocode both locations
      const [src, dest] = await Promise.all([
        geocodeClosestMatch(source.trim()),
        geocodeClosestMatch(destination.trim())
      ]);

      if (!src || !dest) {
        setError('Could not find one or both locations. Please try more specific addresses or check your spelling.');
        return;
      }

      // Set waypoints for route calculation
      setWaypoints([src, dest]);
      setSuccess('Route analysis started. Please wait for the route to be calculated...');
      
    } catch (error) {
      console.error('Error during route analysis:', error);
      setError('An error occurred while analyzing the route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeCoords.length === 0 || redZones.length === 0) return;

    const level = calculateRisk(routeCoords, redZones);
    setRiskLevel(level);
  }, [routeCoords, redZones]);

  return (
    <div className="route-analyzer-page">
      <div className="route-analyzer-header-wrapper">
        <Header title="Route Risk Analyzer" showBack={true} />
      </div>
      <div className="route-analyzer-main-content">
        {/* Instructions */}
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '14px',
          color: '#0369a1'
        }}>
          <strong>📋 How to use:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Enter your starting location and destination</li>
            <li>Click "Analyze Route" to calculate the safest path</li>
            <li>View the route on the map with risk level indicators</li>
            <li>Red zones show high-risk areas to avoid</li>
          </ul>
        </div>

        <div className="inputs route-analyzer-inputs">
          <div className="input-with-icon">
            <span className="input-icon">📍</span>
            <input
              className="route-analyzer-input"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Enter Source Location"
            />
          </div>

          <div className="input-with-icon">
            <span className="input-icon">📍</span>
            <input
              className="route-analyzer-input"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="Enter Destination"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button className="analyze" onClick={handleAnalyze} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Analyzing...' : 'Analyze Route'}
            </button>
            {(waypoints.length > 0 || routeCoords.length > 0) && (
              <button 
                onClick={() => {
                  setWaypoints([]);
                  setRouteCoords([]);
                  setRiskLevel('');
                  setError('');
                  setSuccess('');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#6b7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px',
              marginTop: '8px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div style={{
              padding: '12px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#166534',
              fontSize: '14px',
              marginTop: '8px'
            }}>
              ✅ {success}
            </div>
          )}
        </div>

        <div className="route-analyzer-map-container">
          {redZonesLoading ? (
            <div style={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f9fafb',
              borderRadius: '1rem',
              color: '#6b7280'
            }}>
              Loading red zones...
            </div>
          ) : (
            <div>
              <div style={{
                padding: '8px 12px',
                background: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#0369a1'
              }}>
                🗺️ Red Zones Loaded: {redZones.length} zones
              </div>
              <div style={{ position: 'relative' }}>
                <MapContainer
                  center={[18.5204, 73.8567]}
                  zoom={13}
                  style={{ height: '400px', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {/* Render red zones - circles only */}
                  {redZones.map((zone) => (
                    <Circle
                      key={zone.id}
                      center={zone.coordinates}
                      radius={500}
                      pathOptions={{
                        color: getIncidentColor(zone.incidentCount),
                        fillColor: getIncidentColor(zone.incidentCount),
                        fillOpacity: 0.2,
                        weight: 2
                      }}
                    />
                  ))}
                  
                  {/* Route calculation component */}
                  <RouteMap 
                    waypoints={waypoints} 
                    redZones={redZones.map(zone => ({
                      lat: zone.coordinates[0],
                      lng: zone.coordinates[1],
                      name: zone.name,
                      severity: zone.risk_level,
                      description: `Crime Rate: ${zone.crimeRate}, Incidents: ${zone.incidentCount}`,
                      crimeRate: zone.crimeRate,
                      incidentCount: zone.incidentCount,
                      lastIncident: zone.lastIncident
                    }))} 
                    onRouteFound={setRouteCoords} 
                  />
                </MapContainer>
                
                {/* Focus Location Button */}
                {waypoints.length > 0 && (
                  <button
                    className="focus-location-btn"
                    onClick={() => {
                      // This will be handled by the RouteMap component
                      console.log('Focus on route');
                    }}
                    title="Focus on route"
                  >
                    🎯
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {riskLevel && (
          <div className={`risk-level risk-${riskLevel.toLowerCase()} route-analyzer-risk-level`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span>Risk Level: {riskLevel.toUpperCase()}</span>
              {riskLevel === 'high' && <span>⚠️</span>}
              {riskLevel === 'medium' && <span>⚡</span>}
              {riskLevel === 'low' && <span>✅</span>}
            </div>
            <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.8 }}>
              {riskLevel === 'high' && 'Route passes through high-risk areas. Consider alternative routes.'}
              {riskLevel === 'medium' && 'Route has some risk areas. Exercise caution.'}
              {riskLevel === 'low' && 'Route appears to be relatively safe.'}
            </div>
            {routeCoords.length > 0 && (
              <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                Route calculated with {routeCoords.length} waypoints
              </div>
            )}
          </div>
        )}

        {/* Route Analysis Status */}
        {waypoints.length > 0 && !riskLevel && !loading && (
          <div style={{
            padding: '12px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            color: '#b45309',
            fontSize: '14px',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            🔄 Calculating route and analyzing risk...
          </div>
        )}

        {/* Legend */}
        <div className="redzones-legend-section">
          <div className="redzones-legend-card">
            <h3 className="redzones-legend-title">Risk Levels</h3>
            <div className="redzones-legend-list">
              <div className="redzones-legend-item">
                <div className="redzones-legend-dot redzones-legend-dot-high"></div>
                <span className="redzones-legend-label">High Risk (40+ incidents)</span>
              </div>
              <div className="redzones-legend-item">
                <div className="redzones-legend-dot redzones-legend-dot-medium"></div>
                <span className="redzones-legend-label">Medium Risk (20-39 incidents)</span>
              </div>
              <div className="redzones-legend-item">
                <div className="redzones-legend-dot redzones-legend-dot-low"></div>
                <span className="redzones-legend-label">Low Risk (0-19 incidents)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteAnalyzer;
