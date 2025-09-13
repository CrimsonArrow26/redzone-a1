import React from 'react';
import { usePermissions, PermissionStatus, PermissionBanner } from '../components/PermissionManager';

const PermissionTest: React.FC = () => {
  const { 
    permissions, 
    requestPermission, 
    requestAllPermissions, 
    isPermissionGranted,
    hasAnyPermissionDenied,
    hasAnyPermissionPrompt 
  } = usePermissions();

  const handleRequestAll = async () => {
    console.log('🔐 Requesting all permissions...');
    await requestAllPermissions();
  };

  const handleRequestMicrophone = async () => {
    console.log('🎤 Requesting microphone permission...');
    const granted = await requestPermission('microphone');
    console.log('Microphone permission granted:', granted);
  };

  const handleRequestLocation = async () => {
    console.log('📍 Requesting location permission...');
    const granted = await requestPermission('location');
    console.log('Location permission granted:', granted);
  };

  const handleRequestNotifications = async () => {
    console.log('🔔 Requesting notification permission...');
    const granted = await requestPermission('notifications');
    console.log('Notification permission granted:', granted);
  };

  const handleRequestMotion = async () => {
    console.log('📱 Requesting motion permission...');
    const granted = await requestPermission('motion');
    console.log('Motion permission granted:', granted);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Permission Test Page</h1>
        
        {/* Permission Banner */}
        <PermissionBanner />
        
        {/* Permission Status Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Permission Status Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(permissions).map(([type, status]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <PermissionStatus type={type as keyof typeof permissions} />
                  <span className="font-medium capitalize">{type}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  status === 'granted' ? 'text-green-600 bg-green-100' :
                  status === 'denied' ? 'text-red-600 bg-red-100' :
                  status === 'prompt' ? 'text-yellow-600 bg-yellow-100' :
                  'text-gray-600 bg-gray-100'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
          
          <div className="text-sm text-gray-600">
            <p><strong>All Permissions Granted:</strong> {Object.values(permissions).every(status => status === 'granted') ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Any Permission Denied:</strong> {hasAnyPermissionDenied() ? '❌ Yes' : '✅ No'}</p>
            <p><strong>Any Permission Needs Prompt:</strong> {hasAnyPermissionPrompt() ? '⚠️ Yes' : '✅ No'}</p>
          </div>
        </div>

        {/* Individual Permission Requests */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Individual Permission Requests</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleRequestMicrophone}
              className="flex items-center justify-center space-x-2 p-4 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <PermissionStatus type="microphone" />
              <span>Request Microphone</span>
            </button>
            
            <button
              onClick={handleRequestLocation}
              className="flex items-center justify-center space-x-2 p-4 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
            >
              <PermissionStatus type="location" />
              <span>Request Location</span>
            </button>
            
            <button
              onClick={handleRequestNotifications}
              className="flex items-center justify-center space-x-2 p-4 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors"
            >
              <PermissionStatus type="notifications" />
              <span>Request Notifications</span>
            </button>
            
            <button
              onClick={handleRequestMotion}
              className="flex items-center justify-center space-x-2 p-4 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
            >
              <PermissionStatus type="motion" />
              <span>Request Motion</span>
            </button>
          </div>
        </div>

        {/* Bulk Permission Request */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Permission Request</h2>
          
          <button
            onClick={handleRequestAll}
            className="w-full p-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Request All Permissions
          </button>
          
          <p className="text-sm text-gray-600 mt-2">
            This will request all permissions at once. You may see multiple permission dialogs.
          </p>
        </div>

        {/* Debug Information */}
        <div className="bg-gray-100 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Debug Information</h2>
          
          <div className="space-y-2 text-sm font-mono">
            <p><strong>Navigator.mediaDevices:</strong> {navigator.mediaDevices ? '✅ Available' : '❌ Not Available'}</p>
            <p><strong>Navigator.geolocation:</strong> {navigator.geolocation ? '✅ Available' : '❌ Not Available'}</p>
            <p><strong>Window.Notification:</strong> {window.Notification ? '✅ Available' : '❌ Not Available'}</p>
            <p><strong>DeviceMotionEvent:</strong> {typeof DeviceMotionEvent !== 'undefined' ? '✅ Available' : '❌ Not Available'}</p>
            <p><strong>Permissions API:</strong> {'permissions' in navigator ? '✅ Available' : '❌ Not Available'}</p>
            <p><strong>HTTPS:</strong> {location.protocol === 'https:' ? '✅ Secure Context' : '❌ Not Secure Context'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionTest;
