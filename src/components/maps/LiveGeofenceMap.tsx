'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Building2,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Crosshair,
  Compass,
} from 'lucide-react';

export interface OfficeGeoLocation {
  id: string;
  name: string;
  code?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  branch?: { name: string };
  assignedEmployeesCount?: number;
}

export interface PunchGeoMarker {
  id: string;
  type: 'PUNCH';
  employeeName: string;
  employeeCode: string;
  department?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  distanceMeters?: number;
  isWithinGeofence?: boolean;
  photo?: string | null;
  time?: string | Date;
  status?: string;
}

interface LiveGeofenceMapProps {
  officeLocations: OfficeGeoLocation[];
  punchMarkers: PunchGeoMarker[];
  activeFilter?: 'ALL' | 'OFFICES' | 'PUNCHES';
  className?: string;
  onMarkerClick?: (marker: PunchGeoMarker | OfficeGeoLocation) => void;
}

export default function LiveGeofenceMap({
  officeLocations = [],
  punchMarkers = [],
  className = '',
  onMarkerClick,
}: LiveGeofenceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);

  const [activeLayerFilter, setActiveLayerFilter] = useState<'ALL' | 'OFFICES' | 'PUNCHES'>('ALL');
  const [selectedPinInfo, setSelectedPinInfo] = useState<any | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically require Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // If map already exists on container, clean it up
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Default center: Salman Enterprises Central Hub (Delhi) or first office
      const defaultLat = officeLocations[0]?.latitude || 28.5355;
      const defaultLng = officeLocations[0]?.longitude || 77.2732;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 14,
        zoomControl: false, // We provide modern styled controls
        attributionControl: false,
      });

      // OpenStreetMap standard tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Attribution control in small subtle bottom-right
      L.control
        .attribution({
          position: 'bottomright',
          prefix: '<span class="text-[9px] text-slate-400">OpenStreetMap</span>',
        })
        .addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
      setIsMapReady(true);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render Markers and Geofences whenever offices, punches, or filter changes
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !layersGroupRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      const layerGroup = layersGroupRef.current;
      layerGroup.clearLayers();

      const allLatLngs: [number, number][] = [];

      // 1. Draw Office Geofences & Office Markers
      if (activeLayerFilter === 'ALL' || activeLayerFilter === 'OFFICES') {
        officeLocations.forEach((office) => {
          if (!office.latitude || !office.longitude) return;
          const pos: [number, number] = [office.latitude, office.longitude];
          allLatLngs.push(pos);

          // Geofence Circle Boundary
          const circle = L.circle(pos, {
            radius: office.radiusMeters || 100,
            color: '#7138F5',
            fillColor: '#7138F5',
            fillOpacity: 0.14,
            weight: 2,
            dashArray: '6, 6',
          });

          // Outer buffer circle (for 1.25x boundary warning zone)
          const warningCircle = L.circle(pos, {
            radius: (office.radiusMeters || 100) * 1.25,
            color: '#F59E0B',
            fillColor: 'transparent',
            weight: 1,
            dashArray: '3, 6',
            opacity: 0.4,
          });

          circle.addTo(layerGroup);
          warningCircle.addTo(layerGroup);

          // Custom Office Marker HTML DivIcon
          const officeIcon = L.divIcon({
            className: 'custom-office-pin',
            html: `
              <div class="group relative flex items-center justify-center">
                <div class="absolute -inset-2 rounded-full bg-purple-500/20 animate-pulse"></div>
                <div class="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F122B] border-2 border-[#7138F5] text-white shadow-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                </div>
                <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0F122B] px-2 py-0.5 text-[10px] font-bold text-white border border-purple-500/30 shadow-md">
                  ${office.name.split('-')[0].trim()}
                </div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });

          const officeMarker = L.marker(pos, { icon: officeIcon });
          officeMarker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; color: #0F172A; min-width: 200px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background: #7138F5;"></span>
                <strong style="font-size: 13px; color: #1E1B4B;">${office.name}</strong>
              </div>
              <p style="margin: 2px 0; color: #64748B;">Branch: ${office.branch?.name || 'Central'}</p>
              <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0; font-size: 11px;">
                <span>Geofence Radius:</span>
                <strong style="color: #7138F5;">${office.radiusMeters} meters</strong>
              </div>
            </div>
          `);

          officeMarker.on('click', () => {
            setSelectedPinInfo({ type: 'OFFICE', data: office });
            if (onMarkerClick) onMarkerClick(office);
          });

          officeMarker.addTo(layerGroup);
        });
      }

      // 2. Draw Employee Punch Markers
      if (activeLayerFilter === 'ALL' || activeLayerFilter === 'PUNCHES') {
        punchMarkers.forEach((punch) => {
          if (!punch.latitude || !punch.longitude) return;
          const pos: [number, number] = [punch.latitude, punch.longitude];
          allLatLngs.push(pos);

          // Status determination: Verified inside, near boundary, or outside breach
          const isBreach = punch.isWithinGeofence === false || (punch.distanceMeters && punch.distanceMeters > 100);
          const isNearBoundary = !isBreach && punch.distanceMeters && punch.distanceMeters > 70;

          let badgeColor = '#10B981'; // Green
          let pingColor = 'bg-emerald-500';
          let borderClass = 'border-emerald-500';
          let statusText = 'Inside Geofence';

          if (isBreach) {
            badgeColor = '#EF4444'; // Red alert
            pingColor = 'bg-rose-500';
            borderClass = 'border-rose-500 animate-bounce';
            statusText = 'Outside Geofence Alert';
          } else if (isNearBoundary) {
            badgeColor = '#F59E0B'; // Amber
            pingColor = 'bg-amber-500';
            borderClass = 'border-amber-500';
            statusText = 'Near Boundary';
          }

          const initials = punch.employeeName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          const punchIcon = L.divIcon({
            className: 'custom-punch-pin',
            html: `
              <div class="group relative flex items-center justify-center">
                <div class="absolute -inset-1 rounded-full ${pingColor}/30 animate-ping"></div>
                <div class="relative flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 ${borderClass} shadow-lg text-[11px] font-black text-slate-800">
                  ${initials}
                </div>
                <div class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-black text-white shadow-md" style="background-color: ${badgeColor};">
                  ${punch.distanceMeters ? `${punch.distanceMeters}m` : 'PUNCH'}
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const punchMarker = L.marker(pos, { icon: punchIcon });

          const formattedTime = punch.time
            ? new Date(punch.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now';

          punchMarker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; color: #0F172A; min-width: 220px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <strong style="font-size: 13px; color: #0F172A;">${punch.employeeName}</strong>
                <span style="background: ${isBreach ? '#FEE2E2' : '#DCFCE7'}; color: ${isBreach ? '#DC2626' : '#15803D'}; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 9999px;">
                  ${statusText}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 4px; color: #64748B; font-size: 11px; margin-bottom: 4px;">
                <span>${punch.employeeCode}</span> &bull; <span>${punch.department || 'Operations'}</span>
              </div>
              <div style="background: #F8FAFC; border-radius: 8px; padding: 6px 8px; margin-top: 6px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                  <span style="color: #64748B;">Punch Time:</span>
                  <strong>${formattedTime}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                  <span style="color: #64748B;">Distance from Office:</span>
                  <strong style="color: ${badgeColor};">${punch.distanceMeters || 0}m</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748B;">GPS Accuracy:</span>
                  <span>&plusmn;${punch.accuracy || 10}m</span>
                </div>
              </div>
            </div>
          `);

          punchMarker.on('click', () => {
            setSelectedPinInfo({ type: 'PUNCH', data: punch });
            if (onMarkerClick) onMarkerClick(punch);
          });

          punchMarker.addTo(layerGroup);
        });
      }

      // Auto-fit bounds if we have points and not manually controlled
      if (allLatLngs.length > 0) {
        try {
          const bounds = L.latLngBounds(allLatLngs);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        } catch {}
      }
    });
  }, [isMapReady, officeLocations, punchMarkers, activeLayerFilter, onMarkerClick]);

  // Focus actions
  const focusLocation = (lat: number, lng: number, zoom = 16) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  const resetView = () => {
    if (mapInstanceRef.current && officeLocations.length > 0) {
      const allPoints: [number, number][] = [
        ...officeLocations.map((o) => [o.latitude, o.longitude] as [number, number]),
        ...punchMarkers.map((p) => [p.latitude, p.longitude] as [number, number]),
      ];
      if (allPoints.length > 0) {
        import('leaflet').then((L) => {
          mapInstanceRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
        });
      }
    }
  };

  const zoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const zoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {/* Top Map Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Interactive Geofence Radar (OpenStreetMap)
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {officeLocations.length} Geofence Zones &bull; {punchMarkers.length} Active Punch Pins
            </p>
          </div>
        </div>

        {/* Quick Branch Focus Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {officeLocations.map((off) => (
            <button
              key={off.id}
              onClick={() => focusLocation(off.latitude, off.longitude, 16)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-950/40"
            >
              <Building2 className="h-3 w-3 text-purple-600" />
              <span>{off.name.includes('Hub') ? 'Delhi Central Hub' : 'Noida DC'}</span>
            </button>
          ))}

          <button
            onClick={resetView}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Fit bounds"
          >
            <Crosshair className="h-3 w-3 text-slate-500" />
            <span className="hidden sm:inline">Fit All</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative h-96 w-full bg-slate-100 dark:bg-slate-950 sm:h-[420px]">
        {/* Leaflet Mount Node */}
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Floating Custom Map Zoom Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
          <button
            onClick={zoomIn}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={zoomOut}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>

        {/* Floating Layer Filter */}
        <div className="absolute top-4 left-4 z-[400] flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
          <button
            onClick={() => setActiveLayerFilter('ALL')}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
              activeLayerFilter === 'ALL'
                ? 'bg-[#7138F5] text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveLayerFilter('OFFICES')}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
              activeLayerFilter === 'OFFICES'
                ? 'bg-[#7138F5] text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Geofences ({officeLocations.length})
          </button>
          <button
            onClick={() => setActiveLayerFilter('PUNCHES')}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
              activeLayerFilter === 'PUNCHES'
                ? 'bg-[#7138F5] text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Punches ({punchMarkers.length})
          </button>
        </div>

        {/* Bottom Legend Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-[400] flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-purple-500/20 border-2 border-dashed border-[#7138F5]"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">50m–100m Geofence</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Verified Within Geofence</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Near Boundary (&gt;75m)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Breach Alert (Outside Radius)</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Anti-Spoofing & Boundary Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
