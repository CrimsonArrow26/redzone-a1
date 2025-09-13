import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Mic, MapPin, Bell, Smartphone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface PermissionState {
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  location: 'granted' | 'denied' | 'prompt' | 'unknown';
  notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
  motion: 'granted' | 'denied' | 'prompt' | 'unknown';
}

interface PermissionContextType {
  permissions: PermissionState;
  requestPermission: (type: keyof PermissionState) => Promise<boolean>;
  requestAllPermissions: () => Promise<void>;
  checkAllPermissions: () => Promise<void>;
  isPermissionGranted: (type: keyof PermissionState) => boolean;
  hasAnyPermissionDenied: () => boolean;
  hasAnyPermissionPrompt: () => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionState>({
    microphone: 'unknown',
    location: 'unknown',
    notifications: 'unknown',
    motion: 'unknown'
  });

  const checkMicrophonePermission = async (): Promise<PermissionState['microphone']> => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return permission.state as PermissionState['microphone'];
      } else {
        // Fallback: try to access microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          return 'granted';
        } catch (error) {
          return 'denied';
        }
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return 'unknown';
    }
  };

  const checkLocationPermission = async (): Promise<PermissionState['location']> => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return permission.state as PermissionState['location'];
      } else {
        // Fallback: try to get current position
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve('granted'),
            () => resolve('denied'),
            { timeout: 1000 }
          );
        });
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      return 'unknown';
    }
  };

  const checkNotificationPermission = async (): Promise<PermissionState['notifications']> => {
    try {
      if ('Notification' in window) {
        return Notification.permission as PermissionState['notifications'];
      }
      return 'unknown';
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return 'unknown';
    }
  };

  const checkMotionPermission = async (): Promise<PermissionState['motion']> => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
        // For iOS, we need to request permission to check status
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return permission === 'granted' ? 'granted' : 'denied';
      }
      return 'granted'; // Assume granted for non-iOS
    } catch (error) {
      console.error('Error checking motion permission:', error);
      return 'unknown';
    }
  };

  const checkAllPermissions = async () => {
    console.log('🔐 Checking all permissions...');
    
    const [mic, location, notifications, motion] = await Promise.all([
      checkMicrophonePermission(),
      checkLocationPermission(),
      checkNotificationPermission(),
      checkMotionPermission()
    ]);

    setPermissions({
      microphone: mic,
      location: location,
      notifications: notifications,
      motion: motion
    });
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      console.log('✅ Microphone permission granted!');
      return true;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));
      return false;
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
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
      return true;
    } catch (error) {
      console.error('❌ Location permission denied:', error);
      return false;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissions(prev => ({ ...prev, notifications: permission as PermissionState['notifications'] }));
        console.log('✅ Notification permission:', permission);
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('❌ Notification permission error:', error);
      return false;
    }
  };

  const requestMotionPermission = async (): Promise<boolean> => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        setPermissions(prev => ({ ...prev, motion: permission === 'granted' ? 'granted' : 'denied' }));
        console.log('✅ Motion permission:', permission);
        return permission === 'granted';
      }
      return true; // Assume granted for non-iOS
    } catch (error) {
      console.error('❌ Motion permission error:', error);
      return false;
    }
  };

  const requestPermission = async (type: keyof PermissionState): Promise<boolean> => {
    switch (type) {
      case 'microphone':
        return await requestMicrophonePermission();
      case 'location':
        return await requestLocationPermission();
      case 'notifications':
        return await requestNotificationPermission();
      case 'motion':
        return await requestMotionPermission();
      default:
        return false;
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
  };

  const isPermissionGranted = (type: keyof PermissionState): boolean => {
    return permissions[type] === 'granted';
  };

  const hasAnyPermissionDenied = (): boolean => {
    return Object.values(permissions).some(status => status === 'denied');
  };

  const hasAnyPermissionPrompt = (): boolean => {
    return Object.values(permissions).some(status => status === 'prompt');
  };

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const value: PermissionContextType = {
    permissions,
    requestPermission,
    requestAllPermissions,
    checkAllPermissions,
    isPermissionGranted,
    hasAnyPermissionDenied,
    hasAnyPermissionPrompt
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

// Permission Status Component
interface PermissionStatusProps {
  type: keyof PermissionState;
  className?: string;
  showLabel?: boolean;
  onClick?: () => void;
}

export const PermissionStatus: React.FC<PermissionStatusProps> = ({ 
  type, 
  className = '', 
  showLabel = false,
  onClick 
}) => {
  const { permissions, requestPermission } = usePermissions();
  const status = permissions[type];

  const getIcon = () => {
    switch (status) {
      case 'granted':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'denied':
        return <XCircle size={16} className="text-red-500" />;
      case 'prompt':
        return <AlertCircle size={16} className="text-yellow-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'microphone': return <Mic size={16} />;
      case 'location': return <MapPin size={16} />;
      case 'notifications': return <Bell size={16} />;
      case 'motion': return <Smartphone size={16} />;
      default: return null;
    }
  };

  const getLabel = () => {
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    switch (status) {
      case 'granted':
        return `${typeName} enabled`;
      case 'denied':
        return `${typeName} blocked`;
      case 'prompt':
        return `${typeName} permission needed`;
      default:
        return `${typeName} status unknown`;
    }
  };

  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else if (status === 'denied' || status === 'prompt') {
      await requestPermission(type);
    }
  };

  const isClickable = status === 'denied' || status === 'prompt' || onClick;

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      onClick={handleClick}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      {getTypeIcon()}
      {getIcon()}
      {showLabel && (
        <span className="text-sm text-gray-600">
          {getLabel()}
        </span>
      )}
    </div>
  );
};

// Permission Banner Component
export const PermissionBanner: React.FC = () => {
  const { permissions, requestAllPermissions, hasAnyPermissionPrompt, hasAnyPermissionDenied } = usePermissions();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner if any permissions are needed
    if (hasAnyPermissionPrompt() || hasAnyPermissionDenied()) {
      setIsVisible(true);
    }
  }, [permissions, hasAnyPermissionPrompt, hasAnyPermissionDenied]);

  if (!isVisible) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Permissions Required
            </h3>
            <p className="text-sm text-yellow-700">
              Enable permissions to use all safety features
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsVisible(false)}
            className="text-sm text-yellow-600 hover:text-yellow-800"
          >
            Dismiss
          </button>
          <button
            onClick={requestAllPermissions}
            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
          >
            Enable All
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionProvider;
