import React, { useEffect, useState } from 'react';
import { Mic, MapPin, Bell, Smartphone } from 'lucide-react';

interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  location: 'granted' | 'denied' | 'prompt' | 'unknown';
  notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
  motion: 'granted' | 'denied' | 'prompt' | 'unknown';
}

const PermissionInitializer: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    microphone: 'unknown',
    location: 'unknown',
    notifications: 'unknown',
    motion: 'unknown'
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    // Add a timeout to prevent hanging indefinitely
    const timeoutId = setTimeout(() => {
      if (isInitializing) {
        console.warn('Permission initialization timed out, continuing anyway');
        setIsInitializing(false);
      }
    }, 10000); // 10 second timeout

    initializePermissions();

    return () => clearTimeout(timeoutId);
  }, []);

  const initializePermissions = async () => {
    console.log('🔐 Initializing permissions...');
    
    try {
      // Check permissions in parallel, but don't fail if any individual check fails
      await Promise.allSettled([
        checkMicrophonePermission(),
        checkLocationPermission(),
        checkNotificationPermission(),
        checkMotionPermission()
      ]);
      
      setIsInitializing(false);
      
      // Show permission prompt if any permissions are needed
      const needsPermission = Object.values(permissions).some(status => 
        status === 'prompt' || status === 'unknown'
      );
      
      if (needsPermission) {
        setShowPermissionPrompt(true);
      }
      
    } catch (error) {
      console.warn('Error initializing permissions (non-blocking):', error);
      // Don't block the app if permission initialization fails
      setIsInitializing(false);
    }
  };

  const checkMicrophonePermission = async () => {
    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissions(prev => ({ ...prev, microphone: permission.state as any }));
        
        // Listen for permission changes
        permission.onchange = () => {
          setPermissions(prev => ({ ...prev, microphone: permission.state as any }));
        };
      } else {
        // Fallback: try to access microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setPermissions(prev => ({ ...prev, microphone: 'granted' }));
          // Stop the stream immediately as we only needed permission
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          setPermissions(prev => ({ ...prev, microphone: 'denied' }));
        }
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      setPermissions(prev => ({ ...prev, microphone: 'unknown' }));
    }
  };

  const checkLocationPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissions(prev => ({ ...prev, location: permission.state as any }));
        
        permission.onchange = () => {
          setPermissions(prev => ({ ...prev, location: permission.state as any }));
        };
      } else {
        // Fallback: try to get current position
        navigator.geolocation.getCurrentPosition(
          () => setPermissions(prev => ({ ...prev, location: 'granted' })),
          () => setPermissions(prev => ({ ...prev, location: 'denied' })),
          { timeout: 1000 }
        );
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setPermissions(prev => ({ ...prev, location: 'unknown' }));
    }
  };

  const checkNotificationPermission = async () => {
    try {
      if ('Notification' in window) {
        const permission = Notification.permission;
        setPermissions(prev => ({ ...prev, notifications: permission as any }));
      } else {
        setPermissions(prev => ({ ...prev, notifications: 'unknown' }));
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
      setPermissions(prev => ({ ...prev, notifications: 'unknown' }));
    }
  };

  const checkMotionPermission = async () => {
    try {
      // Check for iOS DeviceMotionEvent permission
      if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        setPermissions(prev => ({ ...prev, motion: permission === 'granted' ? 'granted' : 'denied' }));
      } else {
        setPermissions(prev => ({ ...prev, motion: 'granted' })); // Assume granted for non-iOS
      }
    } catch (error) {
      console.error('Error checking motion permission:', error);
      setPermissions(prev => ({ ...prev, motion: 'unknown' }));
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      // Stop the stream immediately as we only needed permission
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Microphone permission granted!');
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));
    }
  };

  const requestLocationPermission = async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setPermissions(prev => ({ ...prev, location: 'granted' }));
            resolve();
          },
          () => {
            setPermissions(prev => ({ ...prev, location: 'denied' }));
            reject();
          },
          { timeout: 5000 }
        );
      });
      console.log('✅ Location permission granted!');
    } catch (error) {
      console.error('❌ Location permission denied:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissions(prev => ({ ...prev, notifications: permission as any }));
        console.log('✅ Notification permission:', permission);
      }
    } catch (error) {
      console.error('❌ Notification permission error:', error);
    }
  };

  const requestMotionPermission = async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        setPermissions(prev => ({ ...prev, motion: permission === 'granted' ? 'granted' : 'denied' }));
        console.log('✅ Motion permission:', permission);
      }
    } catch (error) {
      console.error('❌ Motion permission error:', error);
    }
  };

  const requestAllPermissions = async () => {
    console.log('🔐 Requesting all permissions...');
    
    await Promise.allSettled([
      requestMicrophonePermission(),
      requestLocationPermission(),
      requestNotificationPermission(),
      requestMotionPermission()
    ]);
    
    setShowPermissionPrompt(false);
  };

  const getPermissionIcon = (type: keyof PermissionStatus) => {
    switch (type) {
      case 'microphone': return <Mic className="w-5 h-5" />;
      case 'location': return <MapPin className="w-5 h-5" />;
      case 'notifications': return <Bell className="w-5 h-5" />;
      case 'motion': return <Smartphone className="w-5 h-5" />;
      default: return null;
    }
  };

  const getPermissionStatusColor = (status: string) => {
    switch (status) {
      case 'granted': return 'text-green-600 bg-green-100';
      case 'denied': return 'text-red-600 bg-red-100';
      case 'prompt': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPermissionStatusText = (status: string) => {
    switch (status) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
      case 'prompt': return 'Needs Permission';
      default: return 'Unknown';
    }
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Initializing Permissions</h3>
            <p className="text-gray-600">Setting up your safety features...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!showPermissionPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Enable Safety Features</h3>
          <p className="text-gray-600">RedZone needs these permissions to keep you safe:</p>
        </div>

        <div className="space-y-4 mb-6">
          {Object.entries(permissions).map(([type, status]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getPermissionIcon(type as keyof PermissionStatus)}
                <span className="font-medium capitalize">{type}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPermissionStatusColor(status)}`}>
                {getPermissionStatusText(status)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowPermissionPrompt(false)}
            className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Skip for Now
          </button>
          <button
            onClick={requestAllPermissions}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Enable All
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          You can change these permissions later in your browser settings.
        </p>
      </div>
    </div>
  );
};

export default PermissionInitializer;
