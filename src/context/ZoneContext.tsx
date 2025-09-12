import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SafetyMonitor, { SafetyData, AccidentDetectionResult } from '../utils/safetyMonitor';
import SOSService from '../utils/sosService';
import { useNotification } from './NotificationContext';
import { supabase } from '../utils/supabaseClient'; 

// Haversine formula to compute distance between two geo points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Context type
const ZoneContext = createContext({
  currentZone: null as any,
  isSafe: true,
  userLocation: null as { lat: number; lng: number } | null,
  zones: [] as any[],
  safetyData: null as SafetyData | null,
  isSafetyMonitoring: false,
  showSafetyPopup: false,
  accidentDetails: null as AccidentDetectionResult | null,
  startSafetyMonitoring: () => {},
  stopSafetyMonitoring: () => {},
  onSafetyConfirmed: (isSafe: boolean) => {},
  getSystemStatus: () => {},
  resetSystem: () => {},
});

export const ZoneProvider = ({ children }: { children: ReactNode }) => {
  const [zones, setZones] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZone, setCurrentZone] = useState<any>(null);
  const [alertShown, setAlertShown] = useState(false);
  const [safetyData, setSafetyData] = useState<SafetyData | null>(null);
  const [isSafetyMonitoring, setIsSafetyMonitoring] = useState(false);
  const [showSafetyPopup, setShowSafetyPopup] = useState(false);
  const [accidentDetails, setAccidentDetails] = useState<AccidentDetectionResult | null>(null);

  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [safetyMonitor] = useState(() => new SafetyMonitor(
    // Permission request callback
    (type: 'microphone' | 'motion', granted: boolean) => {
      if (!granted) {
        showSafetyAlert({
          type: 'permission_required',
          message: `${type === 'microphone' ? 'Microphone' : 'Motion sensor'} access is required for safety monitoring.`,
          severity: 'info',
          autoClose: true,
          autoCloseDelay: 8000
        });
      }
    },

  ));
  const [sosService] = useState(() => new SOSService());
  
  // Use notification context
  const { showSafetyAlert } = useNotification();

  // Initialize SOSService when user is authenticated
  useEffect(() => {
    const initializeSOSService = async () => {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await sosService.initialize();
        }
      } catch (error) {
        console.log('SOS Service not initialized - user not authenticated yet');
      }
    };

    initializeSOSService();
  }, [sosService]);

  // Track user interaction to enable vibration API
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Initialize safety monitoring for debugging purposes (always active)
  useEffect(() => {
    console.log('🔧 Initializing safety monitoring for debug purposes...');
    safetyMonitor.startMonitoring(
      (accidentResult: AccidentDetectionResult) => {
        // Only show popup if in red zone
        if (currentZone) {
          setAccidentDetails(accidentResult);
          setShowSafetyPopup(true);
        }
      },
      (data: SafetyData) => {
        setSafetyData(data);
      },
      (location: { lat: number; lng: number }, duration: number) => {
        console.log(`🚨 Stationary user detected for ${duration} minutes at:`, location);
        // Send SOS alert to admin
        sosService.sendStationaryUserAlert(location, duration);
        // Send alert to emergency contacts
        sosService.sendAlertToEmergencyContacts(
          location,
          `You have been stationary for ${duration} minutes.`,
          'stationary_user'
        );
      },
      (location: { lat: number; lng: number }, keyword: string) => {
        console.log(`🎤 Voice keyword "${keyword}" detected at:`, location);
        // Send SOS alert to admin for keyword detection
        sosService.sendStationaryUserAlert(location, 0, `Emergency keyword "${keyword}" detected`);
        // Send alert to emergency contacts for keyword detection
        sosService.sendAlertToEmergencyContacts(
          location,
          `Emergency keyword "${keyword}" detected!`,
          'voice_keyword'
        );
      }
    );
    setIsSafetyMonitoring(true);

    return () => {
      safetyMonitor.stopMonitoring();
      setIsSafetyMonitoring(false);
    };
  }, [safetyMonitor, sosService, currentZone]);

  // Safe vibration function that checks user interaction
  const safeVibrate = (pattern: number | number[]) => {
    if (hasUserInteracted && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
        console.log('✅ Vibration triggered:', pattern);
      } catch (error) {
        console.log('❌ Vibration failed:', error);
      }
    } else if (!hasUserInteracted) {
      console.log('⏸️  Vibration skipped - user has not interacted with page yet (Chrome intervention prevention)');
    } else {
      console.log('❌ Vibration not supported in this browser');
    }
  };

  // Fetch red zones from Supabase
  useEffect(() => {
    async function fetchZones() {
      const { data, error } = await supabase.from('red_zones').select('*');
      if (error) {
        console.error('Error fetching zones:', error);
      } else {
        setZones(data || []);
      }
    }
    fetchZones();
  }, []);

  // Track user location in real-time
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (err) => {
          console.error('Geolocation error:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 10000,
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Detect if user is inside any red zone
  useEffect(() => {
    if (userLocation && zones.length > 0) {
      const foundZone = zones.find((zone) => {
        const dist = haversineDistance(
          userLocation.lat,
          userLocation.lng,
          parseFloat(zone.latitude),
          parseFloat(zone.longitude)
        );
        return dist < 500; // zone radius threshold
      });

      setCurrentZone(foundZone || null);
    }
  }, [userLocation, zones]);

  // Effect to handle red zone entry/exit
  useEffect(() => {
    if (currentZone && !isSafetyMonitoring) {
      console.log('🚨 Entered red zone - starting safety monitoring');
      
      // Show red zone entry alert
      const zoneName = currentZone.name || 'a Red Zone';
      showSafetyAlert({
        type: 'red_zone_entry',
        message: `You have entered ${zoneName}. Safety monitoring has been activated.`,
        severity: 'warning',
        zoneName: zoneName,
        autoClose: true,
        autoCloseDelay: 3000
      });

      safeVibrate([300, 100, 300]);
      
      startSafetyMonitoring();
    } else if (!currentZone && isSafetyMonitoring) {
      console.log('✅ Left red zone - stopping safety monitoring');
      
      // Show red zone exit alert
      showSafetyAlert({
        type: 'red_zone_exit',
        message: 'You have left the red zone. Safety monitoring deactivated.',
        severity: 'success',
        autoClose: true,
        autoCloseDelay: 3000
      });
      
      stopSafetyMonitoring();
    }
  }, [currentZone, isSafetyMonitoring]);

  const startSafetyMonitoring = () => {
    // Safety monitoring is now always active for debugging
    console.log('🎤 Safety monitoring is already active for debugging purposes');
  };

  // Function to check for triggers that should enable voice recognition
  const checkForVoiceRecognitionTriggers = (safetyData: SafetyData) => {
    // Check for sudden acceleration/deceleration (mobile-optimized thresholds)
    if (safetyData.acceleration > 3 || safetyData.acceleration < -3) {
      console.log('🎤 Enabling voice recognition due to sudden acceleration/deceleration');
      safetyMonitor.enableManualKeywordListening();
      return;
    }
    
    // Check for high speed (potential accident) - mobile-optimized threshold
    if (safetyData.currentSpeed > 2) { // 2 m/s = 7.2 km/h (walking speed)
      console.log('🎤 Enabling voice recognition due to high speed');
      safetyMonitor.enableManualKeywordListening();
      return;
    }
    
    // Check for sudden location jumps (GPS anomaly)
    if (safetyData.lastLocation) {
      // This would need to be implemented with previous location tracking
      // For now, we'll rely on the stationary user detection callback
    }
  };

  const stopSafetyMonitoring = () => {
    if (isSafetyMonitoring) {
      console.log('🛑 Stopping safety monitoring and speech recognition...');
      safetyMonitor.stopMonitoring();
      // Explicitly stop speech recognition when leaving red zone
      safetyMonitor.stopListeningWhenLeavingRedZone();
      setIsSafetyMonitoring(false);
    }
  };

  const onSafetyConfirmed = (isSafe: boolean) => {
    setShowSafetyPopup(false);
    setAccidentDetails(null);
    
    if (isSafe) {
      // User confirmed they are safe
      console.log('User confirmed safety');
    } else {
      // User needs help - could trigger emergency contacts or SOS
      console.log('User needs help - triggering emergency protocols');
      // TODO: Implement emergency protocols
    }
  };

  const getSystemStatus = () => {
    if (safetyMonitor) {
      return safetyMonitor.getSystemStatus();
    }
    return null;
  };

  const resetSystem = () => {
    if (safetyMonitor) {
      console.log('🔄 Resetting safety monitoring system...');
      safetyMonitor.resetSystem();
    }
  };

  return (
    <ZoneContext.Provider
      value={{
        currentZone,
        isSafe: !currentZone,
        userLocation,
        zones,
        safetyData,
        isSafetyMonitoring,
        showSafetyPopup,
        accidentDetails,
        startSafetyMonitoring,
        stopSafetyMonitoring,
        onSafetyConfirmed,
        getSystemStatus,
        resetSystem,
      }}
    >
      {children}
    </ZoneContext.Provider>
  );
};

// Hook for accessing red zone context in any component
export function useZone() {
  return useContext(ZoneContext);
}
