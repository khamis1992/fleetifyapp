import { motion } from 'framer-motion';
import { MapPin, Car, Users, Building2, FileText, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const locations = [
  {
    name: 'الدوحة',
    position: [25.2854, 51.5310] as [number, number],
    vehicles: 245,
    description: 'العاصمة ومركز الأعمال الرئيسي',
    color: '#14B8A6',
  },
  {
    name: 'الوكرة',
    position: [25.1685, 51.6087] as [number, number],
    vehicles: 89,
    description: 'المدينة الصناعية',
    color: '#14B8A6',
  },
  {
    name: 'الخور',
    position: [25.6813, 51.5067] as [number, number],
    vehicles: 67,
    description: 'مدينة الساحل الشمالي',
    color: '#14B8A6',
  },
  {
    name: 'الريان',
    position: [25.2913, 51.4335] as [number, number],
    vehicles: 54,
    description: 'مدينة الريان الحديثة',
    color: '#14B8A6',
  },
  {
    name: 'الشمال',
    position: [26.1348, 51.2025] as [number, number],
    vehicles: 24,
    description: 'مدينة الشمال',
    color: '#14B8A6',
  },
];

// Custom icon for the markers with enhanced design
const createCustomIcon = (location: typeof locations[0], isActive: boolean) => {
  const size = isActive ? 50 : 40;
  const pulseSize = isActive ? 70 : 55;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${pulseSize}px;
        height: ${pulseSize}px;
      ">
        <!-- Outer Pulse Ring -->
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          background: ${location.color};
          border-radius: 50%;
          animation: pulse 2s infinite;
          opacity: 0.3;
        "></div>

        <!-- Middle Ring -->
        <div style="
          position: absolute;
          width: ${size + 15}px;
          height: ${size + 15}px;
          background: ${location.color};
          border-radius: 50%;
          animation: pulse 2s infinite 0.5s;
          opacity: 0.5;
        "></div>

        <!-- Main Marker -->
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: linear-gradient(135deg, ${location.color} 0%, ${location.color}dd 100%);
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 8px 24px ${location.color}40, 0 4px 8px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          position: relative;
          transition: all 0.3s ease;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>

        <!-- Vehicle Badge -->
        <div style="
          position: absolute;
          top: -5px;
          right: -5px;
          background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
          color: white;
          border: 2px solid white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 20;
        ">
          ${location.vehicles}
        </div>

        <style>
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.6; }
            50% { transform: scale(1.2); opacity: 0; }
            100% { transform: scale(0.8); opacity: 0.6; }
          }
        </style>
      </div>
    `,
    iconSize: [pulseSize, pulseSize],
    iconAnchor: [pulseSize / 2, pulseSize / 2],
    popupAnchor: [0, -pulseSize / 2],
  });
};

// Component to auto-fit map bounds and fly to location
function MapController({
  locations,
  activeLocation,
}: {
  locations: typeof locations;
  activeLocation: typeof locations[0];
}) {
  const map = useMap();

  useEffect(() => {
    // Initial fit bounds
    const bounds = L.latLngBounds(locations.map((loc) => loc.position));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 });
  }, [map, locations]);

  useEffect(() => {
    // Fly to active location when it changes
    map.flyTo(activeLocation.position, 11, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  }, [map, activeLocation]);

  return null;
}

export function EnterpriseTrustedBy() {
  const [activeLocation, setActiveLocation] = useState(locations[0]);
  const [isMapReady, setIsMapReady] = useState(false);

  const handleLocationClick = (location: typeof locations[0]) => {
    setActiveLocation(location);
  };

  return (
    <section
      id="coverage"
      className="py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden"
      dir="rtl"
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-96 h-96 -top-48 -right-48 bg-teal-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 8s ease-in-out infinite' }}
        ></div>
        <div
          className="absolute w-96 h-96 -bottom-48 -left-48 bg-teal-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 8s ease-in-out infinite 4s' }}
        ></div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }
      `}</style>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-teal-500/10 text-teal-400 rounded-full text-sm font-bold mb-4 shadow-sm border border-teal-500/20">
            🇶🇦 تغطية شاملة لقطر
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            موجودون في كل مكان
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            نخدم أكثر من 34 شركة في جميع أنحاء قطر مع شبكة موزعة تغطي المدن الرئيسية
          </p>
        </motion.div>

        {/* Interactive Map Section */}
        <div className="flex justify-center mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-5xl relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
              {/* Map Container */}
              <div className="h-[600px] w-full relative">
                {!isMapReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 z-0">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-400 font-semibold">جاري تحميل الخريطة...</p>
                    </div>
                  </div>
                )}
                <MapContainer
                  center={[25.3548, 51.1839]}
                  zoom={9}
                  style={{ height: '100%', width: '100%', direction: 'ltr' }}
                  zoomControl={true}
                  className="relative z-10"
                  whenReady={() => setIsMapReady(true)}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    maxZoom={19}
                  />
                  <MapController locations={locations} activeLocation={activeLocation} />
                  {locations.map((loc) => (
                    <Marker
                      key={loc.name}
                      position={loc.position}
                      icon={createCustomIcon(loc, activeLocation.name === loc.name)}
                      eventHandlers={{
                        click: () => handleLocationClick(loc),
                      }}
                    >
                      <Popup dir="rtl" className="custom-popup">
                        <div
                          className="text-center p-4"
                          style={{ minWidth: '220px', fontFamily: 'system-ui' }}
                        >
                          <div
                            className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                            style={{ background: loc.color }}
                          >
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-1">
                            {loc.name}
                          </h3>
                          <p className="text-sm text-slate-600 mb-3">{loc.description}</p>
                          <div className="flex items-center justify-center gap-2 font-bold text-white px-4 py-2 rounded-lg"
                               style={{ background: loc.color }}>
                            <Car className="w-4 h-4" />
                            <span>{loc.vehicles} مركبة نشطة</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Top Info Bar */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 border border-slate-200 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-slate-700">خريطة مباشرة</span>
                </div>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 border border-slate-200 flex items-center gap-2">
                  <span className="text-lg">🇶🇦</span>
                  <span className="text-sm font-bold text-slate-700">قطر</span>
                </div>
              </div>

              {/* Stats Badge */}
              <div className="absolute bottom-4 left-4 z-20 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-lg px-5 py-3 border border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{locations.length}</p>
                    <p className="text-xs text-slate-300">مدن</p>
                  </div>
                  <div className="w-px h-8 bg-slate-600"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {locations.reduce((sum, loc) => sum + loc.vehicles, 0)}
                    </p>
                    <p className="text-xs text-slate-300">مركبة</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick City Pills */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {locations.map((loc) => (
                <motion.button
                  key={loc.name}
                  onClick={() => handleLocationClick(loc)}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-md ${
                    activeLocation.name === loc.name
                      ? 'text-white shadow-lg'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  style={
                    activeLocation.name === loc.name
                      ? { background: loc.color }
                      : undefined
                  }
                >
                  <span className="mr-1">{loc.name}</span>
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                      activeLocation.name === loc.name
                        ? 'bg-white/20'
                        : 'bg-slate-100'
                    }`}
                  >
                    {loc.vehicles}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
