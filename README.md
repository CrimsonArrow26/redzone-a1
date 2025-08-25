# 🚨 RedZone Safety App

**Every street. Every step. Safer.**

A comprehensive community safety application that helps users navigate dangerous areas, report incidents, and stay safe with real-time monitoring and emergency response features.

## 🌟 Features

### 🗺️ **Live Safety Map**
- Interactive map showing high-risk areas (red zones)
- Real-time incident reporting and visualization
- Crime rate indicators and risk level assessments
- **Live User Location Tracking**: Real-time GPS monitoring with red zone proximity alerts
- **Geofencing Alerts**: Automatic notifications when entering high-risk areas
- **Route Safety Analysis**: Safe path recommendations avoiding dangerous zones

### 🚨 **Emergency Response System**
- **SOS Button**: Immediate emergency alert system
- **Advanced Safety Monitoring**: Continuous background monitoring for:
  - **Accelerometer Sensing**: Real-time movement and fall detection
  - **Speedometer Integration**: Live speed monitoring and alerts
  - **Gyroscope Sensing**: Orientation and motion pattern analysis
  - **Audio Anomaly Detection**: Microphone access for emergency situations
  - **Sudden Stops/Starts Detection**: Automatic incident detection
  - **Automatic Safety Check Reminders**: Periodic safety confirmations
- **Live User Tracking**: Real-time location monitoring when entering red zones
- **Emergency Microphone Access**: Voice recognition and audio analysis during SOS
- Emergency contact management
- Direct emergency services integration

### 📱 **Core Safety Features**
- **Incident Reporting**: Report suspicious activities and incidents
- **Community Alerts**: Real-time notifications about safety issues
- **Route Analysis**: Safe route planning and analysis
- **Safety Tips**: Daily safety recommendations and guidelines

### 👥 **Community & Social**
- Community safety forums
- Event sharing and coordination
- News and safety updates
- User profiles and safety history

### 🔐 **Authentication & Security**
- Secure user authentication via Supabase
- Role-based access control (User/Admin)
- Protected routes and data security
- Admin dashboard for community management

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for modern, responsive design
- **Radix UI** components for accessible UI elements
- **React Router** for navigation
- **Leaflet** for interactive maps

### Backend & Services
- **Supabase** for authentication and database
- **Real-time** data synchronization
- **Geolocation** services with GPS tracking
- **Audio processing** for safety monitoring and voice recognition
- **Sensor data processing** for accelerometer, gyroscope, and speedometer
- **Geofencing engine** for red zone proximity detection

### Development Tools
- **ESLint** for code quality
- **PostCSS** with **Autoprefixer**
- **TypeScript** for type safety

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CrimsonArrow26/redzone-v1.git
   cd redzone-v1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📱 App Structure

### Pages
- **Home**: Main dashboard with safety features
- **RedZones**: Interactive safety map
- **SOS**: Emergency response system
- **Emergency**: Emergency services access
- **Reports**: Incident reporting and history
- **Community**: Community safety features
- **News**: Safety updates and alerts
- **Events**: Community safety events
- **Profile**: User settings and history
- **Admin**: Community management (admin only)

### Components
- **Safety Monitoring**: Real-time safety checks
- **Map Components**: Interactive map features
- **Navigation**: Bottom navigation and routing
- **UI Components**: Reusable design system
- **Authentication**: Login/signup forms

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Set up authentication tables
3. Configure real-time subscriptions
4. Set up row-level security policies

### Map Configuration
- Configure Leaflet map settings
- Set up tile providers
- Configure geolocation permissions
- **Sensor Permissions**: Enable accelerometer, gyroscope, and microphone access
- **GPS Settings**: Configure location accuracy and update frequency
- **Geofencing Setup**: Define red zone boundaries and alert distances

## 🚨 Safety Features Deep Dive

### Enhanced Safety Monitoring
The app continuously monitors user safety through:
- **Accelerometer Integration**: Real-time movement detection, fall detection, and motion analysis
- **Speedometer Monitoring**: Live speed tracking with configurable alert thresholds
- **Gyroscope Sensing**: Orientation detection and motion pattern recognition
- **Audio Analysis**: Microphone access for emergency voice recognition and sound anomaly detection
- **Movement Tracking**: Monitors acceleration, deceleration, and sudden movements
- **Location Awareness**: Real-time GPS tracking with red zone proximity monitoring
- **Geofencing**: Automatic alerts when entering or approaching dangerous areas
- **Automatic Alerts**: Sends safety check reminders and emergency notifications

### SOS System
- **Immediate Response**: One-tap emergency alert with microphone activation
- **Contact Notification**: Automatically notifies emergency contacts
- **Location Sharing**: Sends precise GPS location to emergency services
- **Voice Recognition**: Emergency keyword detection ("help", "SOS", "danger")
- **Audio Monitoring**: Continuous microphone access during emergency situations
- **Countdown Timer**: Configurable emergency response timing
- **Fall Detection**: Automatic incident detection through accelerometer data

## 🤝 Contributing

We welcome contributions to make our communities safer! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Ensure accessibility compliance
- Write comprehensive tests
- Follow the existing code structure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Emergency
- **SOS Button**: Use the SOS feature in the app for immediate help
- **Emergency Services**: Call local emergency numbers directly

### Technical Support
- Create an issue on GitHub
- Check the documentation
- Contact the development team

## 🔮 Roadmap

- [ ] **AI-powered threat detection**
- [ ] **Integration with local law enforcement**
- [ ] **Advanced route optimization**
- [ ] **Offline safety features**
- [ ] **Multi-language support**
- [ ] **Wearable device integration**
- [ ] **Advanced sensor fusion algorithms**
- [ ] **Machine learning for motion pattern recognition**
- [ ] **Enhanced voice command system**
- [ ] **Real-time threat assessment scoring**

## 🙏 Acknowledgments

- Community safety advocates
- Local law enforcement partners
- Open source contributors
- Safety technology researchers

---

**Stay Safe. Stay Connected. Stay Informed.**

*RedZone Safety App - Protecting communities, one street at a time.*
