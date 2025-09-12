import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, RotateCcw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange?: (lat: number, lng: number) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude,
  longitude,
  onLocationChange,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  
  const [coords, setCoords] = useState({
    lat: latitude || 29.3759,
    lng: longitude || 47.9774,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    // Add click handler to place marker
    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      updateMarker(lat, lng);
    });

    // Add initial marker if coordinates exist
    if (latitude && longitude) {
      updateMarker(latitude, longitude);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const updateMarker = (lat: number, lng: number) => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    // Add new marker
    markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    markerRef.current.bindPopup(`الموقع: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    // Update state
    setCoords({ lat, lng });
    onLocationChange?.(lat, lng);
  };

  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const newCoords = { ...coords, [field]: numValue };
    setCoords(newCoords);

    if (newCoords.lat && newCoords.lng) {
      updateMarker(newCoords.lat, newCoords.lng);
      mapRef.current?.setView([newCoords.lat, newCoords.lng], 15);
    }
  };

  const resetToKuwait = () => {
    const kuwaitCoords = { lat: 29.3759, lng: 47.9774 };
    setCoords(kuwaitCoords);
    mapRef.current?.setView([kuwaitCoords.lat, kuwaitCoords.lng], 11);
    
    if (markerRef.current) {
      mapRef.current?.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    
    onLocationChange?.(0, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          موقع العقار على الخريطة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="latitude">خط العرض</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="29.3759"
              value={coords.lat || ''}
              onChange={(e) => handleCoordinateChange('lat', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="longitude">خط الطول</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              placeholder="47.9774"
              value={coords.lng || ''}
              onChange={(e) => handleCoordinateChange('lng', e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={resetToKuwait}
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              إعادة تعيين
            </Button>
          </div>
        </div>
        
        <div 
          ref={mapContainerRef}
          className="w-full h-[400px] rounded-lg border"
          style={{ minHeight: '400px' }}
        />
        
        <p className="text-sm text-muted-foreground">
          انقر على الخريطة لتحديد موقع العقار، أو أدخل الإحداثيات يدوياً في الحقول أعلاه.
        </p>
      </CardContent>
    </Card>
  );
};