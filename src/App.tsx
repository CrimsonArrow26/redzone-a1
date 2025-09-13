import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ZoneProvider } from './context/ZoneContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './components/AuthGuard';
import AdminRouteGuard from './components/AdminRouteGuard';
import Home from './pages/Home';
import News from './pages/News';
import Events from './pages/Events';
import Alerts from './pages/Alerts';
import Community from './pages/Community';
import RedZones from './pages/RedZones';
import AuthCallback from './pages/AuthCallback';
import AdminDashboard from './pages/AdminDashboard';
import RouteAnalyzer from './pages/RouteAnalyzer';
import Emergency from './pages/Emergency';
import SOS from './pages/SOS';
import UserProfile from './pages/UserProfile';
import Reports from './pages/Reports';
import ReportIncident from './pages/ReportIncident';
import Notification from './pages/Notification';
import AuthTest from './pages/AuthTest';
import DebugPanel from './pages/DebugPanel';
import GeocodingTest from './pages/GeocodingTest';
import BottomNavigation from './components/BottomNavigation';
import FloatingActionButton from './components/FloatingActionButton';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthPage } from '../sign/components/AuthPage';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={
                  <AuthGuard requireAuth={false}>
                    <AuthPage />
                  </AuthGuard>
                } />
                <Route path="/register" element={
                  <AuthGuard requireAuth={false}>
                    <AuthPage />
                  </AuthGuard>
                } />
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* Protected App Routes - Only these need ZoneProvider */}
                <Route path="/" element={
                  <AuthGuard>
                    <ZoneProvider>
                      <Home />
                    </ZoneProvider>
                  </AuthGuard>
                } />
                  <Route path="/home" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <Home />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/news" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <News />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/events" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <Events />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/alerts" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <Alerts />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/community" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <Community />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/redzones" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <RedZones />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/admin" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <AdminRouteGuard>
                          <AdminDashboard />
                        </AdminRouteGuard>
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/route-analyzer" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <RouteAnalyzer />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/emergency" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <Emergency />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/sos" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <SOS />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/profile" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <UserProfile />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/reports" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <Reports />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/report" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <ReportIncident />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/notification" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <Notification />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/debug" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <DebugPanel />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  
                  {/* Test Routes */}
                  <Route path="/auth-test" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <AuthTest />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                  <Route path="/geocoding-test" element={
                    <AuthGuard>
                      <ZoneProvider>
                        <GeocodingTest />
                      </ZoneProvider>
                    </AuthGuard>
                  } />
                </Routes>
                <FloatingActionButton />
                <BottomNavigation />
              </div>
            </Router>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;