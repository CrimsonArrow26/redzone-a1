import React, { useEffect, useMemo, useRef, useState } from 'react';
import SOSService from '../utils/sosService';
import { usePermissions, PermissionStatus } from '../components/PermissionManager';

type PermissionStateType = 'granted' | 'denied' | 'prompt' | 'unknown';

const DebugPanel: React.FC = () => {
  const { permissions, requestPermission } = usePermissions();
  const [sosAuth, setSosAuth] = useState<any>(null);
  const [recentAlerts, setRecentAlerts] = useState<number | null>(null);
  const [micPermission, setMicPermission] = useState<PermissionStateType>('unknown');
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  const [keywordDetected, setKeywordDetected] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [liveLevel, setLiveLevel] = useState<number | null>(null);
  const [audioBaseline, setAudioBaseline] = useState<number | null>(null);
  const [noiseAnomaly, setNoiseAnomaly] = useState<boolean>(false);
  const [motionSupported, setMotionSupported] = useState<boolean>(false);
  const [lastAccel, setLastAccel] = useState<number | null>(null);
  const [suddenAcceleration, setSuddenAcceleration] = useState<boolean>(false);
  const [suddenDeceleration, setSuddenDeceleration] = useState<boolean>(false);
  const [geoSupported, setGeoSupported] = useState<boolean>(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);

  const sosServiceRef = useRef(new SOSService());
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const anim = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const motionHandlerRef = useRef<(e: DeviceMotionEvent) => void>();
  const geoWatchIdRef = useRef<number | null>(null);

  const SpeechRecognitionCtor = useMemo(() => {
    const ctor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    return ctor;
  }, []);

  useEffect(() => {
    setSpeechSupported(!!SpeechRecognitionCtor);

    // SOS auth/status
    const init = async () => {
      try {
        await sosServiceRef.current.initialize();
        setSosAuth(sosServiceRef.current.getAuthStatus());
        const alerts = await sosServiceRef.current.getUserSOSAlerts();
        setRecentAlerts(alerts?.length ?? 0);
      } catch (e) {
        setSosAuth({ error: 'Failed to init SOS service' });
      }
    };
    init();

    // Mic permission (best-effort; some browsers gate by user gesture)
    try {
      // @ts-ignore
      if (navigator.permissions?.query) {
        // @ts-ignore
        navigator.permissions.query({ name: 'microphone' as any }).then((p: any) => {
          setMicPermission(p.state as PermissionStateType);
          p.onchange = () => setMicPermission(p.state as PermissionStateType);
        }).catch(() => setMicPermission('unknown'));
      } else {
        setMicPermission('unknown');
      }
    } catch {
      setMicPermission('unknown');
    }

    // Motion support
    setMotionSupported('DeviceMotionEvent' in window);
    // Geolocation support
    setGeoSupported(!!navigator.geolocation);

    return () => {
      stopAudio();
      stopListening();
      stopMotion();
      stopGeo();
    };
  }, [SpeechRecognitionCtor]);

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      microphone.current = audioContext.current.createMediaStreamSource(stream);
      analyser.current.fftSize = 256;
      microphone.current.connect(analyser.current);

      const bufferLength = analyser.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const baseline: number[] = [];
      let baselineDone = false;

      const step = () => {
        if (!analyser.current) return;
        analyser.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        setLiveLevel(avg);
        if (!baselineDone && baseline.length < 50) {
          baseline.push(avg);
          if (baseline.length === 50) {
            const b = baseline.reduce((a, b) => a + b, 0) / baseline.length;
            setAudioBaseline(b);
            baselineDone = true;
          }
        }
        if (baselineDone && audioBaseline != null) {
          const loud = audioBaseline * 2;
          const silent = audioBaseline * 0.3;
          if (avg > loud || (avg < silent && audioBaseline > 50)) {
            setNoiseAnomaly(true);
            setTimeout(() => setNoiseAnomaly(false), 1500);
          }
        }
        anim.current = requestAnimationFrame(step);
      };
      step();
    } catch (e) {
      console.error('Audio start failed', e);
    }
  };

  const stopAudio = () => {
    if (anim.current) cancelAnimationFrame(anim.current);
    if (microphone.current) microphone.current.mediaStream.getTracks().forEach(t => t.stop());
    if (audioContext.current) audioContext.current.close();
    analyser.current = null;
    microphone.current = null;
    audioContext.current = null;
    setLiveLevel(null);
    setAudioBaseline(null);
    setNoiseAnomaly(false);
  };

  const startListening = () => {
    if (!SpeechRecognitionCtor) return;
    try {
      const rec = new SpeechRecognitionCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onstart = () => setListening(true);
      rec.onresult = (event: any) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        }
        if (finalText) {
          const lower = finalText.toLowerCase();
          setTranscript(prev => (prev + ' ' + finalText).trim());
          if (lower.includes('help') || lower.includes('emergency') || lower.includes('sos') || lower.includes('danger')) {
            setKeywordDetected(true);
            setTimeout(() => setKeywordDetected(false), 1500);
          }
        }
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error('Speech start failed', e);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  };

  const startMotion = () => {
    if (!('DeviceMotionEvent' in window)) return;
    const handler = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a) return;
      const ax = a.x ?? 0, ay = a.y ?? 0, az = a.z ?? 0;
      const mag = Math.sqrt(ax * ax + ay * ay + az * az);
      setLastAccel(mag);
      if (mag > 25) {
        setSuddenAcceleration(true);
        setTimeout(() => setSuddenAcceleration(false), 1000);
      }
      if (mag < 3) {
        setSuddenDeceleration(true);
        setTimeout(() => setSuddenDeceleration(false), 1000);
      }
    };
    motionHandlerRef.current = handler;
    window.addEventListener('devicemotion', handler);
  };

  const stopMotion = () => {
    if (motionHandlerRef.current) {
      window.removeEventListener('devicemotion', motionHandlerRef.current);
      motionHandlerRef.current = undefined;
    }
    setLastAccel(null);
    setSuddenAcceleration(false);
    setSuddenDeceleration(false);
  };

  const startGeo = () => {
    if (!navigator.geolocation) return;
    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const stopGeo = () => {
    if (geoWatchIdRef.current != null) navigator.geolocation.clearWatch(geoWatchIdRef.current);
    geoWatchIdRef.current = null;
  };

  return (
    <div style={{ padding: '16px', background: '#fff', margin: '12px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <h2 style={{ marginBottom: 12 }}>🛠️ Safety Debug Panel (Temporary)</h2>

      <section style={{ marginBottom: 16 }}>
        <h3>🔐 SOS Service</h3>
        <div style={{ fontFamily: 'monospace', fontSize: 13, background: '#f7f7f9', padding: 12, borderRadius: 8 }}>
          <div><strong>Auth:</strong> {sosAuth ? JSON.stringify(sosAuth) : 'Loading...'}</div>
          <div style={{ marginTop: 8 }}><strong>Recent Alerts (user):</strong> {recentAlerts == null ? 'Loading...' : recentAlerts}</div>
        </div>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h3>🎤 Microphone & Voice</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button onClick={startAudio} style={{ padding: '8px 12px' }}>Start Audio Monitor</button>
          <button onClick={stopAudio} style={{ padding: '8px 12px' }}>Stop Audio Monitor</button>
          {speechSupported && !listening && <button onClick={startListening} style={{ padding: '8px 12px' }}>Start Listening</button>}
          {speechSupported && listening && <button onClick={stopListening} style={{ padding: '8px 12px' }}>Stop Listening</button>}
        </div>
        <ul style={{ lineHeight: 1.6 }}>
          <li>Mic permission: <strong>{micPermission}</strong></li>
          <li>SpeechRecognition supported: <strong>{String(speechSupported)}</strong></li>
          <li>Listening: <strong>{String(listening)}</strong></li>
          <li>Keyword detected: <strong>{String(keywordDetected)}</strong></li>
          <li>Live sound level: <strong>{liveLevel == null ? 'n/a' : liveLevel.toFixed(1)}</strong></li>
          <li>Audio baseline: <strong>{audioBaseline == null ? 'n/a' : audioBaseline.toFixed(1)}</strong></li>
          <li>Noise anomaly: <strong>{String(noiseAnomaly)}</strong></li>
        </ul>
        
        {/* New Permission Status Components */}
        <div style={{ marginTop: 16, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Permission Status</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PermissionStatus type="microphone" showLabel={true} />
            <PermissionStatus type="location" showLabel={true} />
            <PermissionStatus type="notifications" showLabel={true} />
            <PermissionStatus type="motion" showLabel={true} />
          </div>
        </div>
        {transcript && (
          <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, background: '#f7f7f9', padding: 8, borderRadius: 8 }}>
            <strong>Transcript:</strong>
            <div>{transcript}</div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 16 }}>
        <h3>📱 Device Sensors</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {motionSupported && <button onClick={startMotion} style={{ padding: '8px 12px' }}>Start Motion</button>}
          {motionSupported && <button onClick={stopMotion} style={{ padding: '8px 12px' }}>Stop Motion</button>}
          {geoSupported && <button onClick={startGeo} style={{ padding: '8px 12px' }}>Watch Location</button>}
          {geoSupported && <button onClick={stopGeo} style={{ padding: '8px 12px' }}>Stop Location</button>}
        </div>
        <ul style={{ lineHeight: 1.6 }}>
          <li>DeviceMotion supported: <strong>{String(motionSupported)}</strong></li>
          <li>Last acceleration |g|: <strong>{lastAccel == null ? 'n/a' : lastAccel.toFixed(2)}</strong></li>
          <li>Sudden acceleration: <strong>{String(suddenAcceleration)}</strong></li>
          <li>Sudden deceleration: <strong>{String(suddenDeceleration)}</strong></li>
          <li>Geolocation supported: <strong>{String(geoSupported)}</strong></li>
          <li>Location: <strong>{location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (±${location.accuracy?.toFixed?.(0) ?? 'n/a'}m)` : 'n/a'}</strong></li>
        </ul>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h3>🧪 Testing Tools</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/geocoding-test" style={{ 
            padding: '8px 12px', 
            background: '#2563eb', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            Test Geocoding
          </a>
          <a href="/route-analyzer" style={{ 
            padding: '8px 12px', 
            background: '#10b981', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            Route Analyzer
          </a>
        </div>
      </section>

      <section>
        <h3>ℹ️ Notes</h3>
        <ul style={{ lineHeight: 1.6 }}>
          <li>This panel is temporary and for internal testing only.</li>
          <li>Many sensors need a real device and user gestures/permissions.</li>
          <li><a href="/permission-test" style={{ color: '#0066cc' }}>Go to Permission Test Page</a></li>
        </ul>
      </section>
    </div>
  );
};

export default DebugPanel;



