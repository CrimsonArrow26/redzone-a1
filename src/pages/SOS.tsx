import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  Plus,
  Trash2,
  Shield,
  AlertTriangle
} from 'lucide-react';
import Header from '../components/Header';
import './SOS.css';
import { useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

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
  
  
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
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
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  };

  const sendSOSAlerts = () => {
    // Send SOS alerts to emergency contacts
    console.log('🚨 SOS ALERT SENT!');
    // Here you would implement the actual alert sending logic
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
