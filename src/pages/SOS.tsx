import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  Plus,
  Trash2,
  Shield,
  AlertTriangle,
  Mic,
  X
} from 'lucide-react';
import Header from '../components/Header';
import './SOS.css';
import { useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useZone } from '../context/ZoneContext';

interface EmergencyContact {
  id: string | number;
  contact_id?: string;
  relationship?: string;
  contact?: {
    username?: string;
    phone?: string;
  };
}

const SOS: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relationship: ''
  });
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Debug overlay state
  const [showDebug, setShowDebug] = useState(false);
  
  // Manual voice monitoring for testing
  const [isManualVoiceMonitoring, setIsManualVoiceMonitoring] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sosTriggeredByVoice, setSosTriggeredByVoice] = useState(false);
  
  // Parameter trigger for testing
  const [showParameterMenu, setShowParameterMenu] = useState(false);
  
  // Get red zone context data
  const { 
    currentZone, 
    isSafetyMonitoring, 
    safetyData, 
    showSafetyPopup, 
    accidentDetails, 
    userLocation 
  } = useZone();
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const location = useLocation();

  const showBack = location.state?.fromHome;

  useEffect(() => {
    async function fetchContacts() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('id, contact_id, relationship, contact:contact_id (username, phone)')
        .eq('user_id', user.id);
      if (!error && data) {
        console.log('Fetched contacts:', data);
        setContacts(data.map(contact => ({
          ...contact,
          contact: Array.isArray(contact.contact) ? contact.contact[0] : contact.contact
        })));
      }
    }
    fetchContacts();
    
    // Cleanup voice recognition on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const activateSOS = () => {
    setIsSOSActive(true);
    setCountdown(10);
    
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // SOS activated - send alerts
          sendSOSAlerts();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    setIsSOSActive(false);
    setCountdown(0);
    setSosTriggeredByVoice(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  };

  const sendSOSAlerts = async () => {
    try {
      console.log('🚨 Sending SOS alerts to emergency contacts...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // Get user's emergency contacts
      const { data: emergencyContacts, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('contact_id, relationship, contact:contact_id (username, phone, email)')
        .eq('user_id', user.id);

      if (contactsError) {
        console.error('Error fetching emergency contacts:', contactsError);
        return;
      }

      if (!emergencyContacts || emergencyContacts.length === 0) {
        console.log('No emergency contacts found');
        return;
      }

      // Get current location
      const currentLocation = userLocation || { lat: 0, lng: 0 };
      const locationString = `Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;

      // Send notifications to each emergency contact
      for (const contact of emergencyContacts) {
        const contactData = Array.isArray(contact.contact) ? contact.contact[0] : contact.contact;
        
        if (contactData) {
          // Create notification in the database
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert([{
              recipient_id: contact.contact_id,
              sender_id: user.id,
              message: `🚨 EMERGENCY SOS ALERT! ${user.email || 'A user'} needs immediate help at ${locationString}. Please check on them immediately!`,
              read: false,
              notification_type: 'sos_alert'
            }]);

          if (notificationError) {
            console.error('Error sending notification to contact:', contactData.username, notificationError);
          } else {
            console.log(`✅ SOS notification sent to ${contactData.username} (${contactData.phone})`);
          }
        }
      }

      // Also send to SOS service for admin dashboard
      const sosService = new (await import('../utils/sosService')).default();
      await sosService.initialize();
      
      const result = await sosService.sendStationaryUserAlert(
        currentLocation,
        0,
        'Manual SOS button activated by user'
      );

      if (result.success) {
        console.log('✅ SOS alert sent to admin dashboard');
      } else {
        console.error('Failed to send SOS alert to admin:', result.error);
      }

      console.log('🚨 SOS ALERT SENT TO ALL EMERGENCY CONTACTS!');
      
    } catch (error) {
      console.error('Error sending SOS alerts:', error);
    }
  };

  // Manual Voice Recognition for Testing
  const startManualVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('🎤 Manual voice recognition started');
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
        
        // Check for emergency keywords
        if (finalTranscript) {
          console.log('🎤 Final transcript:', finalTranscript);
          
          const emergencyKeywords = ['help', 'emergency', 'sos', 'danger', 'accident', 'injured', 'hurt'];
          const lowerTranscript = finalTranscript.toLowerCase();
          
          for (const keyword of emergencyKeywords) {
            if (lowerTranscript.includes(keyword)) {
              console.log('🚨 Emergency keyword detected in manual mode:', keyword);
              
              // Stop voice monitoring immediately
              stopManualVoiceRecognition();
              setIsManualVoiceMonitoring(false);
              
              // Set flag to track voice-triggered SOS
              setSosTriggeredByVoice(true);
              
              // Trigger SOS activation directly (same as real implementation)
              console.log('🚨 Activating SOS due to keyword detection:', keyword);
              activateSOS();
              
              // Also send immediate alert for voice detection
              sendSOSAlerts();
              break;
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.log('Manual voice recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('🎤 Manual voice recognition ended');
        setIsListening(false);
        
        // Auto-restart if still in manual mode
        if (isManualVoiceMonitoring) {
        setTimeout(() => {
            if (isManualVoiceMonitoring) {
              startManualVoiceRecognition();
          }
        }, 1000);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } else {
      console.log('Speech recognition not supported');
      alert('Speech recognition not supported in this browser');
    }
  };

  const stopManualVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  const toggleManualVoiceMonitoring = () => {
    if (isManualVoiceMonitoring) {
      // Stop monitoring
      setIsManualVoiceMonitoring(false);
      stopManualVoiceRecognition();
      setTranscript('');
    } else {
      // Start monitoring
      setIsManualVoiceMonitoring(true);
      startManualVoiceRecognition();
    }
  };

  // Parameter trigger functions for testing
  const triggerSpeedChange = () => {
    console.log('🚨 Simulating speed change parameter...');
    // Simulate a significant speed change to trigger voice monitoring
    // This would normally come from accelerometer data
    console.log('🎤 Enabling voice monitoring due to speed change trigger');
    // This would call the safety monitor's enableManualKeywordListening method
    // For now, we'll just start voice monitoring directly
    if (!isManualVoiceMonitoring) {
      setIsManualVoiceMonitoring(true);
      startManualVoiceRecognition();
    }
    setShowParameterMenu(false);
  };

  const triggerStationaryDetection = () => {
    console.log('🚨 Simulating stationary detection parameter...');
    // Simulate user being stationary for 10+ minutes
    console.log('🎤 Enabling voice monitoring due to stationary detection trigger');
    if (!isManualVoiceMonitoring) {
      setIsManualVoiceMonitoring(true);
      startManualVoiceRecognition();
    }
    setShowParameterMenu(false);
  };

  const triggerLocationJump = () => {
    console.log('🚨 Simulating location jump parameter...');
    // Simulate sudden location change
    console.log('🎤 Enabling voice monitoring due to location jump trigger');
    if (!isManualVoiceMonitoring) {
      setIsManualVoiceMonitoring(true);
      startManualVoiceRecognition();
    }
    setShowParameterMenu(false);
  };

  const triggerAcceleration = () => {
    console.log('🚨 Simulating acceleration parameter...');
    // Simulate sudden acceleration/deceleration
    console.log('🎤 Enabling voice monitoring due to acceleration trigger');
    if (!isManualVoiceMonitoring) {
      setIsManualVoiceMonitoring(true);
      startManualVoiceRecognition();
    }
    setShowParameterMenu(false);
  };







  const handleAddContact = async () => {
    if (!newContact.phone) return;
    // Look up user by phone number in app_users
    const { data: users, error } = await supabase
      .from('app_users')
      .select('id')
      .eq('phone', newContact.phone);
    if (error) {
      alert('Error looking up user.');
      return;
    }
    if (!users || users.length === 0) {
      alert('This number is not registered in the app.');
      return;
    }
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in.');
      return;
    }
    // Create request
    const { error: reqError } = await supabase.from('emergency_contact_requests').insert([{
      requester_id: user.id,
      target_id: users[0].id,
      status: 'pending',
      relationship: newContact.relationship
    }]);
    if (reqError) {
      alert('Failed to send request.');
    } else {
      alert('Request sent!');
      setNewContact({ name: '', phone: '', relationship: '' });
    }
  };

  // Delete contact handler
  const handleDeleteContact = async (contactId: string | number) => {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId);
    if (error) {
      alert('Failed to delete contact.');
    } else {
      setContacts(contacts.filter(contact => contact.id !== contactId));
    }
  };


  return (
    <div className="sos-page page-with-header">
      <Header title="SOS Emergency" showBack={showBack} />
       {/* Mini Debug Toggle */}
       <button
         onClick={() => setShowDebug(v => !v)}
         style={{
           position: 'fixed',
           right: 16,
           bottom: 90,
           zIndex: 1001,
           background: '#111827',
           color: '#fff',
           border: 'none',
           borderRadius: 999,
           padding: '8px 12px',
           boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
           fontSize: 12,
           fontWeight: 700,
           letterSpacing: 0.4
         }}
         title="Toggle safety debug"
       >
         {showDebug ? 'Hide Debug' : 'Show Debug'}
       </button>

       {/* Manual Voice Monitoring Toggle (Developer Testing) */}
              <button 
         onClick={toggleManualVoiceMonitoring}
         style={{
           position: 'fixed',
           right: 16,
           bottom: 140,
           zIndex: 1001,
           background: isManualVoiceMonitoring ? '#ef4444' : '#10b981',
           color: '#fff',
           border: 'none',
           borderRadius: 999,
           padding: '8px 12px',
           boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
           fontSize: 12,
           fontWeight: 700,
           letterSpacing: 0.4,
           display: 'flex',
           alignItems: 'center',
           gap: 6
         }}
         title={isManualVoiceMonitoring ? 'Stop voice monitoring' : 'Start voice monitoring (Testing)'}
       >
         <Mic size={14} />
         {isManualVoiceMonitoring ? 'Stop Voice' : 'Test Voice'}
              </button>

       {/* Parameter Trigger Button (Developer Testing) */}
       <button
         onClick={() => setShowParameterMenu(!showParameterMenu)}
         style={{
           position: 'fixed',
           right: 16,
           bottom: 190,
           zIndex: 1001,
           background: showParameterMenu ? '#7c3aed' : '#f59e0b',
           color: '#fff',
           border: 'none',
           borderRadius: 999,
           padding: '8px 12px',
           boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
           fontSize: 12,
           fontWeight: 700,
           letterSpacing: 0.4,
           display: 'flex',
           alignItems: 'center',
           gap: 6
         }}
         title="Trigger safety parameters for testing"
       >
         <AlertTriangle size={14} />
         {showParameterMenu ? 'Hide Triggers' : 'Test Triggers'}
       </button>

       {/* Parameter Trigger Menu */}
       {showParameterMenu && (
         <div
           style={{
             position: 'fixed',
             right: 16,
             bottom: 250,
             zIndex: 1001,
             width: 280,
             maxWidth: 'calc(100vw - 32px)',
             background: '#ffffff',
             borderRadius: 12,
             boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
             border: '1px solid #e5e7eb',
             overflow: 'hidden'
           }}
         >
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
             <strong style={{ fontSize: 14, color: '#374151' }}>Parameter Triggers</strong>
             <button onClick={() => setShowParameterMenu(false)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
               <X size={16} />
             </button>
                </div>
           <div style={{ padding: '12px' }}>
             <div style={{ fontSize: 12, color: '#6b7280', marginBottom: '12px', textAlign: 'center' }}>
               Simulate safety parameters to test voice monitoring
              </div>
              
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                 onClick={triggerSpeedChange}
                 style={{
                   background: '#3b82f6',
                   color: 'white',
                   border: 'none',
                   borderRadius: '8px',
                   padding: '10px 12px',
                   fontSize: '12px',
                   fontWeight: '600',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px',
                   transition: 'background 0.2s'
                 }}
                 onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                 onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
               >
                 <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></div>
                 Speed Change (3 m/s)
                </button>
               
                <button 
                 onClick={triggerStationaryDetection}
                 style={{
                   background: '#10b981',
                   color: 'white',
                   border: 'none',
                   borderRadius: '8px',
                   padding: '10px 12px',
                   fontSize: '12px',
                   fontWeight: '600',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px',
                   transition: 'background 0.2s'
                 }}
                 onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                 onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
               >
                 <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></div>
                 Stationary (10+ min)
                </button>
               
               <button
                 onClick={triggerLocationJump}
                 style={{
                   background: '#f59e0b',
                   color: 'white',
                   border: 'none',
                   borderRadius: '8px',
                   padding: '10px 12px',
                   fontSize: '12px',
                   fontWeight: '600',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px',
                   transition: 'background 0.2s'
                 }}
                 onMouseOver={(e) => e.currentTarget.style.background = '#d97706'}
                 onMouseOut={(e) => e.currentTarget.style.background = '#f59e0b'}
               >
                 <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></div>
                 Location Jump
               </button>
               
                <button 
                 onClick={triggerAcceleration}
                 style={{
                   background: '#ef4444',
                   color: 'white',
                   border: 'none',
                   borderRadius: '8px',
                   padding: '10px 12px',
                   fontSize: '12px',
                   fontWeight: '600',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px',
                   transition: 'background 0.2s'
                 }}
                 onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                 onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
               >
                 <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></div>
                 Sudden Acceleration
                </button>
              </div>
             
             <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '12px', textAlign: 'center', lineHeight: 1.4 }}>
               Each trigger will start voice monitoring for keyword detection
              </div>
                </div>
            </div>
       )}

      {showDebug && (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 150,
            zIndex: 1001,
            width: 300,
            maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <strong style={{ fontSize: 12 }}>Safety Debug</strong>
            <button onClick={() => setShowDebug(false)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            </div>
          <div style={{ padding: 12, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ marginBottom: 8 }}>
              <div><strong>Red Zone Status</strong></div>
              <div>in zone: {currentZone ? 'YES' : 'NO'}</div>
              <div>zone name: {currentZone?.name || 'none'}</div>
              <div>monitoring: {isSafetyMonitoring ? 'ACTIVE' : 'INACTIVE'}</div>
              </div>
            <div style={{ marginBottom: 8 }}>
              <div><strong>Location Data</strong></div>
              <div>lat: {userLocation ? userLocation.lat.toFixed(6) : 'n/a'}</div>
              <div>lng: {userLocation ? userLocation.lng.toFixed(6) : 'n/a'}</div>
              <div>zone: {currentZone ? currentZone.name : 'none'}</div>
              <div>distance: {userLocation && currentZone ? 
                Math.round(Math.sqrt(
                  Math.pow(userLocation.lat - parseFloat(currentZone.latitude), 2) + 
                  Math.pow(userLocation.lng - parseFloat(currentZone.longitude), 2)
                ) * 111000) + 'm' : 'n/a'}</div>
                    </div>
             <div style={{ marginBottom: 8 }}>
               <div><strong>Safety Data</strong></div>
               <div>popup shown: {showSafetyPopup ? 'YES' : 'NO'}</div>
               <div>accident: {accidentDetails ? 'DETECTED' : 'none'}</div>
               <div>voice enabled: {safetyData?.keywordDetected !== undefined ? 'YES' : 'NO'}</div>
               <div>speed (accel): {safetyData?.currentSpeed ? `${safetyData.currentSpeed.toFixed(1)} m/s` : 'n/a'}</div>
               <div>acceleration: {safetyData?.acceleration ? `${safetyData.acceleration.toFixed(1)} m/s²` : 'n/a'}</div>
                  </div>
             <div style={{ marginBottom: 8 }}>
               <div><strong>Voice Monitoring (Test)</strong></div>
               <div>manual mode: {isManualVoiceMonitoring ? 'ON' : 'OFF'}</div>
               <div>listening: {isListening ? 'YES' : 'NO'}</div>
               <div>transcript: {transcript || 'none'}</div>
               <div>triggered SOS: {sosTriggeredByVoice ? 'YES' : 'NO'}</div>
                  </div>
             <div style={{ marginBottom: 8 }}>
               <div><strong>Parameter Triggers</strong></div>
               <div>menu open: {showParameterMenu ? 'YES' : 'NO'}</div>
               <div>available: 4 triggers</div>
               <div>purpose: Test voice activation</div>
          </div>
             <div style={{ marginBottom: 8 }}>
               <div><strong>SOS Status</strong></div>
               <div>active: {isSOSActive ? 'YES' : 'NO'}</div>
               <div>countdown: {isSOSActive ? `${countdown}s` : 'n/a'}</div>
            </div>
                </div>
              </div>
            )}
            


       {/* Voice Monitoring Status Indicator */}
       {isManualVoiceMonitoring && (
         <div style={{
           position: 'fixed',
           top: '50%',
           left: '50%',
           transform: 'translate(-50%, -50%)',
           zIndex: 1000,
           background: 'rgba(0, 0, 0, 0.8)',
           color: 'white',
           padding: '20px',
           borderRadius: '12px',
           textAlign: 'center',
           minWidth: '250px'
         }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
             <Mic size={20} />
             <span style={{ fontWeight: 'bold' }}>Voice Monitoring Active</span>
            </div>
           <div style={{ fontSize: '14px', marginBottom: '8px' }}>
             {isListening ? '🎤 Listening for keywords...' : '⏸️ Paused'}
            </div>
           {transcript && (
             <div style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
               <strong>Transcript:</strong> {transcript}
              </div>
            )}
           <div style={{ fontSize: '11px', color: '#ccc', marginTop: '8px' }}>
             Say: help, emergency, sos, danger, accident, injured, hurt
                </div>
           <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '8px', fontWeight: 'bold' }}>
             ⚠️ Keywords will trigger SOS activation
                </div>
                </div>
       )}

       {/* SOS Activation Alert */}
       {isSOSActive && (
         <div style={{
           position: 'fixed',
           top: '20px',
           left: '50%',
           transform: 'translateX(-50%)',
           zIndex: 1002,
           background: 'linear-gradient(135deg, #ef4444, #dc2626)',
           color: 'white',
           padding: '16px 24px',
           borderRadius: '12px',
           textAlign: 'center',
           boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
           animation: 'pulse 1s infinite'
         }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
             <AlertTriangle size={20} />
             <span style={{ fontWeight: 'bold', fontSize: '16px' }}>SOS ACTIVATED</span>
                </div>
           <div style={{ fontSize: '14px' }}>
             Emergency alert will be sent in {countdown} seconds
              </div>
            </div>
       )}

      {/* Main SOS Section */}
      <div className="sos-main-section">
        <div className="sos-activate-section">
          {!isSOSActive ? (
            <button onClick={activateSOS} className="sos-activate-btn">
              <div className="sos-activate-content">
                <AlertTriangle size={32} className="sos-activate-icon" />
                <div>
                  <div className="sos-activate-label">SOS EMERGENCY</div>
                  <div className="sos-activate-desc">Press to activate</div>
                </div>
              </div>
            </button>
          ) : (
            <div className="sos-countdown-section">
              <div className="sos-countdown-big">{countdown}</div>
              <button onClick={cancelSOS} className="sos-cancel-btn">Cancel SOS</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Add Contact */}
      {isModalOpen && (
        <div className="sos-modal-overlay">
          <div className="sos-modal-box">
            <button onClick={() => setIsModalOpen(false)} className="sos-modal-close">&times;</button>
            <h3>Add Emergency Contact</h3>
            <input
              type="text"
              placeholder="Name"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              className="sos-modal-input"
            />
            <input
              type="text"
              placeholder="Phone"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              className="sos-modal-input"
            />
            <input
              type="text"
              placeholder="Relationship"
              value={newContact.relationship}
              onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
              className="sos-modal-input"
            />
            <button className="save-contacts" onClick={handleAddContact}>
              Save Contact
            </button>
          </div>
        </div>
      )}

      {/* Contact List */}
      <div className="sos-contacts-section">
        <div className="sos-contacts-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <h3 className="sos-contacts-title">Emergency Contacts</h3>
          <button className="sos-add-contact-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={24} className="sos-add-contact-icon" />
          </button>
        </div>
        {contacts.length === 0 ? (
          <div>No emergency contacts found.</div>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="contact-card">
              <div className="contact-info">
                <div><strong>Name:</strong> {contact.contact?.username || 'N/A'}</div>
                <div><strong>Phone no:</strong> {contact.contact?.phone || 'N/A'}</div>
                <div><strong>Relationship:</strong> {contact.relationship || 'N/A'}</div>
              </div>
              
              <div className="sos-contact-actions">
                <button className="sos-contact-call" onClick={() => window.location.href = `tel:${contact.contact?.phone || ''}`}> <Phone size={16} /> </button>
                <button className="sos-contact-sms" onClick={() => window.location.href = `sms:${contact.contact?.phone || ''}`}> <MessageCircle size={16} /> </button>
                <button className="sos-contact-remove" onClick={() => handleDeleteContact(contact.id)}> <Trash2 size={16} /> </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Features */}
      <div className="sos-features-section">
        <h3 className="sos-features-title">SOS Features</h3>
        <div className="sos-features-list">
          <div className="sos-feature-item">
            <MapPin size={20} />
            <div>
              <h4>Location Sharing</h4>
              <p>Your current location will be shared with emergency contacts</p>
            </div>
          </div>
          <div className="sos-feature-item">
            <MessageCircle size={20} />
            <div>
              <h4>Automatic Messaging</h4>
              <p>Emergency message will be sent to all contacts</p>
            </div>
          </div>
          <div className="sos-feature-item">
            <Phone size={20} />
            <div>
              <h4>Emergency Calls</h4>
              <p>Quickly call emergency services or contacts</p>
            </div>
          </div>
          <div className="sos-feature-item">
            <Shield size={20} />
            <div>
              <h4>Enhanced Safety Monitoring</h4>
              <p>Continuous monitoring with voice, audio, and movement detection</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOS;
