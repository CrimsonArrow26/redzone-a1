import React, { useState } from 'react';
import { geocodeClosestMatch } from '../utils/geocoding';
import Header from '../components/Header';

const GeocodingTest = () => {
  const [address, setAddress] = useState('Pashan, Maharashtra, India');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testGeocoding = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 Testing geocoding for:', address);
      const location = await geocodeClosestMatch(address);
      console.log('🧪 Geocoding result:', location);
      setResult(location);
    } catch (error) {
      console.error('🧪 Geocoding test error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="route-analyzer-page">
      <Header title="Geocoding Test" showBack={true} />
      <div className="route-analyzer-main-content">
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address to test"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}
          />
          <button
            onClick={testGeocoding}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Testing...' : 'Test Geocoding'}
          </button>
        </div>

        {result && (
          <div style={{
            background: '#f3f4f6',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginTop: '1rem'
          }}>
            <h3>Result:</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeocodingTest;
