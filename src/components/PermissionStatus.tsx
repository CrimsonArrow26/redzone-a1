import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface PermissionStatusProps {
  className?: string;
  showLabel?: boolean;
}

const PermissionStatus: React.FC<PermissionStatusProps> = ({ 
  className = '', 
  showLabel = false 
}) => {
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  useEffect(() => {
    const checkPermission = async () => {
      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermission(permission.state as any);
          
          // Listen for permission changes
          permission.onchange = () => {
            setMicPermission(permission.state as any);
          };
        } else {
          setMicPermission('unknown');
        }
      } catch (error) {
        console.warn('Could not check microphone permission:', error);
        setMicPermission('unknown');
      }
    };

    checkPermission();
  }, []);

  const getIcon = () => {
    switch (micPermission) {
      case 'granted':
        return <Mic size={16} className="text-green-500" />;
      case 'denied':
        return <MicOff size={16} className="text-red-500" />;
      case 'prompt':
        return <AlertCircle size={16} className="text-yellow-500" />;
      default:
        return <MicOff size={16} className="text-gray-400" />;
    }
  };

  const getLabel = () => {
    switch (micPermission) {
      case 'granted':
        return 'Microphone enabled';
      case 'denied':
        return 'Microphone blocked';
      case 'prompt':
        return 'Microphone permission needed';
      default:
        return 'Microphone status unknown';
    }
  };

  const getTooltip = () => {
    switch (micPermission) {
      case 'granted':
        return 'Microphone access is granted and working';
      case 'denied':
        return 'Microphone access is blocked. Click to request permission.';
      case 'prompt':
        return 'Microphone permission is needed for voice monitoring';
      default:
        return 'Unable to determine microphone permission status';
    }
  };

  const handleClick = async () => {
    if (micPermission === 'denied' || micPermission === 'prompt') {
      try {
        // Request microphone permission with user gesture
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone permission granted!');
        
        // Stop the stream immediately as we only needed permission
        stream.getTracks().forEach(track => track.stop());
        
        // Update permission status
        setMicPermission('granted');
      } catch (error) {
        console.error('❌ Microphone permission denied:', error);
        setMicPermission('denied');
      }
    }
  };

  return (
    <div 
      className={`flex items-center gap-1 ${className}`}
      title={getTooltip()}
      onClick={handleClick}
      style={{ cursor: (micPermission === 'denied' || micPermission === 'prompt') ? 'pointer' : 'default' }}
    >
      {getIcon()}
      {showLabel && (
        <span className="text-sm text-gray-600">
          {getLabel()}
        </span>
      )}
    </div>
  );
};

export default PermissionStatus;
