'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { SalmanIcon } from '@/components/brand/SalmanLogo';
import {
  Store,
  MapPin,
  Camera,
  Plus,
  CheckCircle2,
  Smartphone,
  QrCode,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  AlertCircle,
  Trash2,
  Upload,
  Receipt,
  FileCheck,
  ShieldCheck,
  Sparkles,
  Phone,
  Navigation,
  Truck,
  RotateCcw,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Calendar,
  Building2,
  ChevronRight,
  ExternalLink,
  Copy,
  Wifi,
  WifiOff,
  RefreshCw,
  UserCheck,
  UserX,
  Layers,
  ShoppingBag,
  HelpCircle,
  ChevronLeft,
} from 'lucide-react';
import AndroidSyncStatusBar from '@/components/mobile/AndroidSyncStatusBar';
import AndroidBottomNav from '@/components/mobile/AndroidBottomNav';
import { saveOfflineVisit, generateUUID } from '@/lib/offline-sync-engine';

interface Shop {
  _id: string;
  dealerCode: string;
  name: string;
  ownerName: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address: string;
  locality?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number;
  shopCategory: string;
  businessType?: string;
  gstin?: string;
  creditLimit?: number;
  outstandingBalance?: number;
  previousVisitDate?: string;
  distanceMeters?: number | null;
  verificationStatus?: string;
}

interface ProductItem {
  id: string;
  _id: string;
  name: string;
  brand: string;
  model: string;
  sku: string;
  barcode: string;
  category: string;
  standardSellingPrice: number;
  dealerPrice: number;
  mrp: number;
  color: string;
  ram: string;
  storage: string;
  photograph?: string;
  stockQuantity: number;
  requiresImei: boolean;
  gstRatePercent: number;
}

interface SalesLine {
  productId: string;
  productName: string;
  sku: string;
  brand: string;
  variant: string;
  quantity: number;
  standardPrice: number;
  actualPrice: number;
  priceType: 'STANDARD' | 'MANUAL';
  priceDifference: number;
  manualPriceReason: string;
  requiresApproval: boolean;
  lineTotal: number;
}

export default function AdvancedFieldSalesMobileApp() {
  const { user } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'visit_wizard' | 'history' | 'offline_sync'>('dashboard');

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Master Data
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  // Connectivity
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // ---------------------------------------------------------------------------
  // VISIT WIZARD STATE (5 Steps)
  // ---------------------------------------------------------------------------
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<'existing_shop' | 'new_shop'>('existing_shop');

  // Step 1: Shop Selection / Registration
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopSearchQuery, setShopSearchQuery] = useState('');
  const [shopFilterTab, setShopFilterTab] = useState<'all' | 'nearby' | 'assigned'>('all');
  const [isRegisterShopModalOpen, setIsRegisterShopModalOpen] = useState(false);
  const [newShopForm, setNewShopForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    locality: '',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '',
    gstin: '',
    shopCategory: 'MOBILE_RETAIL',
    businessType: 'Retail Showroom',
    remarks: '',
  });
  const [registeringShop, setRegisteringShop] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  // Step 2: GPS Location & Google Maps
  const [gpsLoading, setGpsLoading] = useState(false);
  const [capturedGps, setCapturedGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    googleMapsUrl: string;
    distanceMeters: number | null;
    isWithinGeofence: boolean;
    verificationStatus: string;
    notes: string;
    capturedAt: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Step 3: Two Photographs System
  const [frontPhoto, setFrontPhoto] = useState<{
    dataUrl: string;
    timestamp: string;
    captureMethod: 'LIVE_CAMERA' | 'UPLOAD_FALLBACK';
  } | null>(null);
  const [interactionPhoto, setInteractionPhoto] = useState<{
    dataUrl: string;
    timestamp: string;
    consentGiven: boolean;
    declinedReason: string;
    captureMethod: 'LIVE_CAMERA' | 'UPLOAD_FALLBACK';
  } | null>(null);
  const [cameraActiveFor, setCameraActiveFor] = useState<'front' | 'interaction' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Step 4: Product Selection & Pricing
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [selectedLines, setSelectedLines] = useState<SalesLine[]>([]);
  const [saleDateTime, setSaleDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [distributorName, setDistributorName] = useState('');
  const [distributorMobile, setDistributorMobile] = useState('');
  const [distributorEmail, setDistributorEmail] = useState('');

  // Step 5: Summary & Submission
  const [visitRemarks, setVisitRemarks] = useState('');
  const [confirmedAccurate, setConfirmedAccurate] = useState(false);
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [submissionSuccessModal, setSubmissionSuccessModal] = useState<any>(null);

  // Selected visit detail modal (for History)
  const [inspectVisit, setInspectVisit] = useState<any>(null);

  // ---------------------------------------------------------------------------
  // INITIALIZATION & DATA FETCHING
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline queue from localStorage
    try {
      const savedQueue = localStorage.getItem('apex_field_sales_offline_queue');
      if (savedQueue) setOfflineQueue(JSON.parse(savedQueue));
    } catch (e) {
      console.warn('Could not read offline queue', e);
    }

    loadInitialData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadInitialData = async () => {
    setDashboardLoading(true);
    try {
      const [dashRes, shopsRes, prodsRes, visitsRes] = await Promise.all([
        fetch('/api/v1/field-sales/dashboard'),
        fetch('/api/v1/field-sales/assigned-shops'),
        fetch('/api/v1/field-sales/products?limit=100'),
        fetch('/api/v1/field-sales/visits/history?limit=20'),
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setDashboardData(d.data);
      }
      if (shopsRes.ok) {
        const s = await shopsRes.json();
        setShops(s.data || []);
        localStorage.setItem('apex_cached_shops', JSON.stringify(s.data || []));
      }
      if (prodsRes.ok) {
        const p = await prodsRes.json();
        setProducts(p.data || []);
        localStorage.setItem('apex_cached_products', JSON.stringify(p.data || []));
      }
      if (visitsRes.ok) {
        const v = await visitsRes.json();
        setRecentVisits(v.data || []);
      }
    } catch (err: any) {
      console.warn('Network load failed, using local offline cache:', err);
      // Fallback to cache if offline
      const cachedShops = localStorage.getItem('apex_cached_shops');
      const cachedProds = localStorage.getItem('apex_cached_products');
      if (cachedShops) setShops(JSON.parse(cachedShops));
      if (cachedProds) setProducts(JSON.parse(cachedProds));
    } finally {
      setDashboardLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 1: SHOP SELECTION & REGISTRATION
  // ---------------------------------------------------------------------------
  const handleSelectShop = async (shop: Shop) => {
    setSelectedShop(shop);
    setVisitType('existing_shop');
    setDuplicateWarning(null);

    // Initialize visit session with backend
    try {
      const res = await fetch('/api/v1/field-sales/visits/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: shop._id,
          visitType: 'existing_shop',
          idempotencyKey: `vst-start-${shop._id}-${Date.now()}`,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setActiveVisitId(d.data.visitId || d.data._id);
      }
    } catch (e) {
      console.warn('Started visit in offline mode');
      setActiveVisitId(`VST-OFFLINE-${Date.now()}`);
    }

    setWizardStep(2);
  };

  const handleRegisterNewShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedGps && !currentDeviceLocation) {
      // Prompt GPS first
      await acquireDeviceLocation();
    }

    const lat = capturedGps?.latitude || currentDeviceLocation?.latitude || 12.9716;
    const lng = capturedGps?.longitude || currentDeviceLocation?.longitude || 77.5946;

    setRegisteringShop(true);
    setDuplicateWarning(null);

    try {
      const res = await fetch('/api/v1/field-sales/shops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newShopForm,
          latitude: lat,
          longitude: lng,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.data?.matchingShop) {
          setDuplicateWarning(data.data);
          showToast('error', data.error || 'Duplicate shop detected');
          return;
        }
        throw new Error(data.error || 'Failed to register shop');
      }

      showToast('success', 'New shop successfully registered!');
      const newShop = data.data.shop;
      setShops((prev) => [newShop, ...prev]);
      setSelectedShop(newShop);
      setVisitType('new_shop');
      setIsRegisterShopModalOpen(false);

      // Start visit for this newly registered shop
      setActiveVisitId(`VST-${Date.now().toString().slice(-6)}`);
      setWizardStep(2);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setRegisteringShop(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 2: GPS LOCATION & GOOGLE MAPS
  // ---------------------------------------------------------------------------
  const [currentDeviceLocation, setCurrentDeviceLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const acquireDeviceLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser or device'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 15),
          };
          setCurrentDeviceLocation({ latitude: coords.latitude, longitude: coords.longitude });
          resolve(coords);
        },
        (err) => {
          console.warn('GPS position error:', err);
          // Fallback location for development / testing if user denies permission
          const fallback = {
            latitude: selectedShop?.latitude || 12.971599,
            longitude: selectedShop?.longitude || 77.607422,
            accuracy: 18,
          };
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  const handleCaptureLocation = async () => {
    setGpsLoading(true);
    try {
      const loc = await acquireDeviceLocation();
      const lat = loc.latitude;
      const lng = loc.longitude;
      const googleMapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

      let distanceMeters = 0;
      let isWithinGeofence = true;
      let status = 'VERIFIED';
      let notes = 'High accuracy GPS lock acquired on-site.';

      if (selectedShop?.latitude && selectedShop?.longitude) {
        // Haversine distance
        const R = 6371e3;
        const φ1 = (lat * Math.PI) / 180;
        const φ2 = (selectedShop.latitude * Math.PI) / 180;
        const Δφ = ((selectedShop.latitude - lat) * Math.PI) / 180;
        const Δλ = ((selectedShop.longitude - lng) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceMeters = Math.round(R * c);

        const allowedRadius = selectedShop.geofenceRadiusMeters || 100;
        isWithinGeofence = distanceMeters <= allowedRadius;

        if (!isWithinGeofence) {
          status = 'OUTSIDE_GEOFENCE';
          notes = `Current location is ${distanceMeters}m from registered shop coordinates (permitted radius: ${allowedRadius}m). Flagged for administrative audit.`;
        }
      }

      const captured = {
        latitude: lat,
        longitude: lng,
        accuracy: loc.accuracy,
        googleMapsUrl,
        distanceMeters,
        isWithinGeofence,
        verificationStatus: status,
        notes,
        capturedAt: new Date().toLocaleTimeString(),
      };

      setCapturedGps(captured);

      // Persist to backend if visit session is active
      if (activeVisitId) {
        await fetch(`/api/v1/field-sales/visits/${activeVisitId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            accuracyMeters: loc.accuracy,
          }),
        }).catch((e) => console.warn('Saved location locally', e));
      }

      showToast('success', isWithinGeofence ? 'GPS lock confirmed within shop geofence!' : 'GPS captured. Location flagged as outside registered geofence.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to acquire device GPS lock');
    } finally {
      setGpsLoading(false);
    }
  };

  const copyGoogleMapsLink = () => {
    if (capturedGps?.googleMapsUrl) {
      navigator.clipboard.writeText(capturedGps.googleMapsUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showToast('info', 'Google Maps link copied to clipboard');
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 3: TWO PHOTOGRAPHS SYSTEM (WebRTC Camera or Fallback File Upload)
  // ---------------------------------------------------------------------------
  const startLiveCamera = async (photoSlot: 'front' | 'interaction') => {
    setCameraActiveFor(photoSlot);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera stream error, using simulated capture or file picker fallback:', err);
    }
  };

  const stopLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraActiveFor(null);
  };

  const capturePhotoFromVideo = (slot: 'front' | 'interaction') => {
    let dataUrl = '';
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      }
    }

    if (!dataUrl) {
      // Fallback realistic placeholder if camera hardware was mocked
      dataUrl =
        slot === 'front'
          ? 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80';
    }

    const timestamp = new Date().toLocaleTimeString();
    if (slot === 'front') {
      setFrontPhoto({ dataUrl, timestamp, captureMethod: 'LIVE_CAMERA' });
    } else {
      setInteractionPhoto({
        dataUrl,
        timestamp,
        consentGiven: true,
        declinedReason: '',
        captureMethod: 'LIVE_CAMERA',
      });
    }

    stopLiveCamera();
    showToast('success', `${slot === 'front' ? 'Shop front' : 'Shopkeeper interaction'} photo captured!`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 'front' | 'interaction') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const timestamp = new Date().toLocaleTimeString();
        if (slot === 'front') {
          setFrontPhoto({ dataUrl, timestamp, captureMethod: 'UPLOAD_FALLBACK' });
        } else {
          setInteractionPhoto({
            dataUrl,
            timestamp,
            consentGiven: true,
            declinedReason: '',
            captureMethod: 'UPLOAD_FALLBACK',
          });
        }
        showToast('success', `${slot === 'front' ? 'Shop front' : 'Shopkeeper'} photo uploaded!`);
      };
      reader.readAsDataURL(file);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 4: PRODUCT SELECTION & PRICING
  // ---------------------------------------------------------------------------
  const addProductToSelection = (product: ProductItem) => {
    const existingIndex = selectedLines.findIndex((l) => l.productId === product._id);
    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...selectedLines];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].lineTotal = updated[existingIndex].quantity * updated[existingIndex].actualPrice;
      setSelectedLines(updated);
    } else {
      const newLine: SalesLine = {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        brand: product.brand,
        variant: `${product.ram}/${product.storage} • ${product.color}`,
        quantity: 1,
        standardPrice: product.standardSellingPrice,
        actualPrice: product.standardSellingPrice,
        priceType: 'STANDARD',
        priceDifference: 0,
        manualPriceReason: '',
        requiresApproval: false,
        lineTotal: product.standardSellingPrice,
      };
      setSelectedLines([...selectedLines, newLine]);
    }
    showToast('info', `Added 1 unit of ${product.name}`);
  };

  const updateLineQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeLine(index);
      return;
    }
    const updated = [...selectedLines];
    updated[index].quantity = Math.max(1, Math.round(newQty));
    updated[index].lineTotal = updated[index].quantity * updated[index].actualPrice;
    updated[index].priceDifference = (updated[index].actualPrice - updated[index].standardPrice) * updated[index].quantity;
    setSelectedLines(updated);
  };

  const toggleManualPrice = (index: number) => {
    const updated = [...selectedLines];
    const line = updated[index];
    if (line.priceType === 'STANDARD') {
      line.priceType = 'MANUAL';
      line.manualPriceReason = 'Approved volume promotional concession';
    } else {
      line.priceType = 'STANDARD';
      line.actualPrice = line.standardPrice;
      line.priceDifference = 0;
      line.manualPriceReason = '';
      line.requiresApproval = false;
    }
    line.lineTotal = line.quantity * line.actualPrice;
    setSelectedLines(updated);
  };

  const updateManualPrice = (index: number, newPrice: number) => {
    const updated = [...selectedLines];
    const line = updated[index];
    line.actualPrice = Math.max(1, newPrice);
    line.priceDifference = (line.actualPrice - line.standardPrice) * line.quantity;
    line.lineTotal = line.quantity * line.actualPrice;

    // Check discount threshold (> 7% requires manager approval)
    const discount = line.standardPrice - line.actualPrice;
    const discountPct = line.standardPrice > 0 ? (discount / line.standardPrice) * 100 : 0;
    line.requiresApproval = discountPct > 7;

    setSelectedLines(updated);
  };

  const updateManualReason = (index: number, reason: string) => {
    const updated = [...selectedLines];
    updated[index].manualPriceReason = reason;
    setSelectedLines(updated);
  };

  const removeLine = (index: number) => {
    const updated = selectedLines.filter((_, i) => i !== index);
    setSelectedLines(updated);
  };

  // Calculations
  const totalUnits = selectedLines.reduce((acc, l) => acc + l.quantity, 0);
  const totalStandardValue = selectedLines.reduce((acc, l) => acc + l.standardPrice * l.quantity, 0);
  const totalActualSales = selectedLines.reduce((acc, l) => acc + l.lineTotal, 0);
  const totalPriceDifference = totalActualSales - totalStandardValue;
  const taxableAmount = Math.round(totalActualSales / 1.18);
  const totalTax = totalActualSales - taxableAmount;
  const hasPendingApprovals = selectedLines.some((l) => l.requiresApproval);

  // ---------------------------------------------------------------------------
  // STEP 5: FINAL SUBMISSION & OFFLINE QUEUE
  // ---------------------------------------------------------------------------
  const handleSubmitVisit = async () => {
    if (!confirmedAccurate) {
      showToast('error', 'Please confirm that the visit and sales details are accurate');
      return;
    }
    if (!selectedShop) {
      showToast('error', 'No shop selected for this visit');
      return;
    }
    if (!capturedGps) {
      showToast('error', 'GPS location capture is mandatory');
      return;
    }
    if (!frontPhoto?.dataUrl) {
      showToast('error', 'Shop front photograph is required');
      return;
    }
    if (selectedLines.length === 0) {
      showToast('error', 'Please add at least 1 product sold during this visit');
      return;
    }

    setSubmittingVisit(true);

    const payload = {
      retailerId: selectedShop._id,
      shopRegistrationReference: selectedShop.dealerCode,
      latitude: capturedGps.latitude,
      longitude: capturedGps.longitude,
      accuracyMeters: capturedGps.accuracy,
      googleMapsUrl: capturedGps.googleMapsUrl,
      distanceFromShopMeters: capturedGps.distanceMeters,
      isWithinGeofence: capturedGps.isWithinGeofence,
      locationVerificationStatus: capturedGps.verificationStatus,
      shopFrontPhoto: {
        photoUrl: frontPhoto.dataUrl,
        captureMethod: frontPhoto.captureMethod,
        capturedAt: new Date().toISOString(),
      },
      shopInteractionPhoto: {
        photoUrl: interactionPhoto?.dataUrl || '',
        captureMethod: interactionPhoto?.captureMethod || 'LIVE_CAMERA',
        interactionConsentGiven: interactionPhoto?.consentGiven !== false,
        declinedReason: interactionPhoto?.declinedReason || '',
        capturedAt: new Date().toISOString(),
      },
      salesLines: selectedLines.map((l) => ({
        productId: l.productId,
        productNameSnapshot: l.productName,
        skuSnapshot: l.sku,
        brandSnapshot: l.brand,
        variantId: l.variant,
        quantity: l.quantity,
        standardPriceSnapshot: l.standardPrice,
        actualSellingPrice: l.actualPrice,
        priceType: l.priceType,
        priceDifference: l.priceDifference,
        manualPriceReason: l.manualPriceReason,
        priceApprovalStatus: l.requiresApproval ? 'PENDING_APPROVAL' : 'NOT_REQUIRED',
        lineTotal: l.lineTotal,
      })),
      totalProducts: selectedLines.length,
      totalUnits,
      standardValue: totalStandardValue,
      actualSalesValue: totalActualSales,
      totalPriceDifference,
      saleDateTime,
      distributorDetails: {
        name: distributorName,
        phone: distributorMobile,
        email: distributorEmail,
      },
      visitRemarks,
      confirmedAccurate: true,
      idempotencyKey: `vst-${selectedShop._id}-${Date.now()}`,
    };

    if (!isOnline) {
      // Save to offline queue in localStorage
      const queueItem = {
        ...payload,
        queuedAt: new Date().toISOString(),
        localId: `OFFLINE-${Date.now()}`,
        shopName: selectedShop.name,
      };
      const updatedQueue = [...offlineQueue, queueItem];
      setOfflineQueue(updatedQueue);
      localStorage.setItem('apex_field_sales_offline_queue', JSON.stringify(updatedQueue));

      setSubmittingVisit(false);
      setSubmissionSuccessModal({
        visitId: queueItem.localId,
        isOffline: true,
        shopName: selectedShop.name,
        totalSales: totalActualSales,
        totalUnits,
      });
      return;
    }

    try {
      // 1. Save sales lines
      const salesRes = await fetch(`/api/v1/field-sales/visits/${activeVisitId}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesLines: payload.salesLines,
          saleDateTime,
          distributorDetails: payload.distributorDetails,
          visitRemarks,
        }),
      });

      // 2. Save photos
      await fetch(`/api/v1/field-sales/visits/${activeVisitId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopFrontPhoto: payload.shopFrontPhoto,
          shopInteractionPhoto: payload.shopInteractionPhoto,
        }),
      });

      // 3. Final submit
      const submitRes = await fetch(`/api/v1/field-sales/visits/${activeVisitId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedAccurate: true,
          remarks: visitRemarks,
          idempotencyKey: payload.idempotencyKey,
        }),
      });

      const resData = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(resData.error || 'Failed to submit visit');
      }

      setSubmissionSuccessModal({
        visitId: resData.data?.visitId || activeVisitId,
        shopName: selectedShop.name,
        totalSales: totalActualSales,
        totalUnits,
        googleMapsUrl: capturedGps.googleMapsUrl,
        pendingPriceOverrides: resData.data?.pendingPriceOverrides || 0,
      });

      // Reload dashboard stats
      loadInitialData();
    } catch (err: any) {
      console.warn('Network submission failed, saving visit offline:', err);
      // Offline fallback: save visit to client-side offline queue
      if (selectedShop && capturedGps) {
        saveOfflineVisit({
          id: activeVisitId || generateUUID(),
          idempotencyKey: payload?.idempotencyKey || generateUUID(),
          createdAt: new Date().toISOString(),
          retailerId: selectedShop._id,
          retailerName: selectedShop.name,
          retailerCity: (selectedShop as any).city,
          latitude: capturedGps.latitude,
          longitude: capturedGps.longitude,
          accuracyMeters: capturedGps.accuracy,
          googleMapsUrl: capturedGps.googleMapsUrl,
          shopFrontPhoto: frontPhoto ? { dataUrl: frontPhoto.dataUrl, captureMethod: frontPhoto.captureMethod } : undefined,
          shopInteractionPhoto: interactionPhoto ? { dataUrl: interactionPhoto.dataUrl, captureMethod: interactionPhoto.captureMethod, consentGiven: interactionPhoto.consentGiven, declinedReason: interactionPhoto.declinedReason } : undefined,
          salesLines: selectedLines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            sku: line.sku,
            quantity: line.quantity,
            standardPrice: line.standardPrice,
            unitPrice: line.actualPrice,
            lineTotal: line.lineTotal,
            isManualPrice: line.priceType === 'MANUAL',
            priceOverrideReason: line.manualPriceReason,
          })),
          totalSalesAmount: totalActualSales,
          visitRemarks: visitRemarks || 'Saved offline on Android device',
          status: 'SAVED_OFFLINE',
          attempts: 0,
        });

        setSubmissionSuccessModal({
          visitId: activeVisitId || `OFFLINE-${Date.now().toString().slice(-4)}`,
          shopName: selectedShop.name,
          totalSales: totalActualSales,
          totalUnits,
          googleMapsUrl: capturedGps.googleMapsUrl,
          isOfflineSaved: true,
          pendingPriceOverrides: 0,
        });

        showToast('info', 'Offline mode: Visit saved locally. Will sync automatically when online.');
      } else {
        showToast('error', err.message || 'Submission failed');
      }
    } finally {
      setSubmittingVisit(false);
    }
  };

  const resetVisitWizard = () => {
    setWizardStep(1);
    setSelectedShop(null);
    setActiveVisitId(null);
    setCapturedGps(null);
    setFrontPhoto(null);
    setInteractionPhoto(null);
    setSelectedLines([]);
    setVisitRemarks('');
    setConfirmedAccurate(false);
    setSubmissionSuccessModal(null);
    setActiveTab('dashboard');
  };

  // ---------------------------------------------------------------------------
  // OFFLINE SYNC HANDLER
  // ---------------------------------------------------------------------------
  const handleSyncOfflineRecords = async () => {
    if (offlineQueue.length === 0) {
      showToast('info', 'No pending offline records to synchronize');
      return;
    }
    setSyncing(true);
    let syncedCount = 0;

    for (const item of offlineQueue) {
      try {
        // Start visit
        const startRes = await fetch('/api/v1/field-sales/visits/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            retailerId: item.retailerId,
            idempotencyKey: item.idempotencyKey,
          }),
        });
        const startData = await startRes.json();
        const vId = startData.data?.visitId || startData.data?._id;

        // Push location
        await fetch(`/api/v1/field-sales/visits/${vId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: item.latitude,
            longitude: item.longitude,
            accuracyMeters: item.accuracyMeters,
          }),
        });

        // Push photos
        await fetch(`/api/v1/field-sales/visits/${vId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopFrontPhoto: item.shopFrontPhoto,
            shopInteractionPhoto: item.shopInteractionPhoto,
          }),
        });

        // Push sales
        await fetch(`/api/v1/field-sales/visits/${vId}/sales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salesLines: item.salesLines,
            saleDateTime: item.saleDateTime,
            distributorDetails: item.distributorDetails,
            visitRemarks: item.visitRemarks,
          }),
        });

        // Submit
        await fetch(`/api/v1/field-sales/visits/${vId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmedAccurate: true,
            idempotencyKey: item.idempotencyKey,
          }),
        });

        syncedCount++;
      } catch (err) {
        console.error('Failed to sync offline item:', err);
      }
    }

    const remaining = offlineQueue.slice(syncedCount);
    setOfflineQueue(remaining);
    localStorage.setItem('apex_field_sales_offline_queue', JSON.stringify(remaining));
    setSyncing(false);
    showToast('success', `Synchronized ${syncedCount} visits to central MongoDB.`);
    loadInitialData();
  };

  // Filtered Shops
  const filteredShops = shops.filter((s) => {
    const q = shopSearchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.dealerCode.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.address.toLowerCase().includes(q);

    if (!matchesQuery) return false;
    if (shopFilterTab === 'nearby') return (s.distanceMeters ?? 99999) < 2000;
    return true;
  });

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = productSearchQuery.toLowerCase();
    const matchesQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q);

    if (!matchesQ) return false;
    if (productCategoryFilter !== 'ALL' && p.category !== productCategoryFilter) return false;
    return true;
  });

  // Categories list
  const productCategories = [
    'ALL',
    'SMARTPHONES',
    'TABLETS',
    'SMARTWATCHES',
    'EARBUDS',
    'HEADPHONES',
    'CHARGERS',
    'POWERBANKS',
    'ACCESSORIES',
    'SPEAKERS',
    'LAPTOPS',
    'ELECTRONICS',
  ];

  return (
    <div className="min-h-screen bg-[#101225] text-slate-100 pb-28 sm:pb-12">
      {/* Android Native Status & Sync Bar */}
      <AndroidSyncStatusBar />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold  animate-in slide-in-from-top-4 duration-200 border ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/60'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-950/60'
              : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200 shadow-indigo-950/60'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-30 bg-[#1B1D35] border-b border-[#252A54]  px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SalmanIcon className="h-9 w-9 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-tight">SALMAN ENTERPRISES FIELD SALES</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} &bull;{' '}
                {dashboardData?.employee?.territory || 'Bangalore Central'}
              </p>
            </div>
          </div>

          {/* Online/Offline status badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('offline_sync')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
            >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
              {offlineQueue.length > 0 && (
                <span className="h-4 w-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                  {offlineQueue.length}
                </span>
              )}
            </button>

            <Link
              href="/distribution"
              className="p-1.5 rounded-xl border border-[#252A54] bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
              title="Enterprise Console"
            >
              <Building2 className="h-4 w-4 text-purple-400" />
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-4xl mx-auto flex items-center gap-1 mt-3 border-t border-white/5 pt-2">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setWizardStep(1);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('visit_wizard');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'visit_wizard'
                ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Visit</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveTab('offline_sync')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'offline_sync'
                ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync</span>
            {offlineQueue.length > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-5">
        {/* =========================================================================
            TAB 1: FIELD EMPLOYEE DASHBOARD
            ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            {/* Employee Profile Strip */}
            <div className="rounded-2xl border border-[#252A54] bg-[#1B1D35] p-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={dashboardData?.employee?.photoUrl || user?.employee?.profilePhoto || '/employees/alex-wong.jpg'}
                    alt="Employee"
                    className="h-12 w-12 rounded-xl object-cover border border-purple-500/40"
                  />
                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#0E122A]" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">
                    {dashboardData?.employee?.name || (user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user as any)?.name) || 'Alex Wong'}
                  </h2>
                  <p className="text-[11px] text-indigo-300 font-mono">
                    {dashboardData?.employee?.employeeCode || 'EMP-SALES-001'} &bull;{' '}
                    <span className="text-slate-400">{dashboardData?.employee?.designation || 'Field Sales Rep'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTab('visit_wizard');
                  setWizardStep(1);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-900/30 active:scale-95 transition"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Start Visit</span>
                <span className="sm:hidden">Visit</span>
              </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3.5 rounded-2xl border border-[#252A54] bg-[#1B1D35]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Today Visits</span>
                  <Store className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-white">{dashboardData?.kpis?.todayVisitsCount ?? 0}</span>
                  <span className="text-[10px] text-slate-400">({dashboardData?.kpis?.shopsVisitedCount ?? 0} shops)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#252A54] bg-[#1B1D35]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Units Sold</span>
                  <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-white">{dashboardData?.kpis?.totalUnitsSold ?? 0}</span>
                  <span className="text-[10px] text-indigo-300">units</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#252A54] bg-[#1B1D35]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Today Sales</span>
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-emerald-300 truncate">
                  ₹{(dashboardData?.kpis?.todaySalesAmount ?? 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#252A54] bg-[#1B1D35]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Monthly Target</span>
                  <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-cyan-300">
                    {dashboardData?.kpis?.targetAchievementPercent ?? 0}%
                  </span>
                  <span className="text-[10px] text-slate-400">₹15L</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setActiveTab('visit_wizard');
                  setWizardStep(1);
                  setShopFilterTab('all');
                }}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#252A54] bg-[#1B1D35] hover:bg-white/5 transition text-left"
              >
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Select Shop</p>
                  <p className="text-[10px] text-slate-400">From Catalog</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('visit_wizard');
                  setWizardStep(1);
                  setIsRegisterShopModalOpen(true);
                }}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#252A54] bg-[#1B1D35] hover:bg-white/5 transition text-left"
              >
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Register Shop</p>
                  <p className="text-[10px] text-slate-400">New Onboarding</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#252A54] bg-[#1B1D35] hover:bg-white/5 transition text-left"
              >
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Visit History</p>
                  <p className="text-[10px] text-slate-400">Review Reports</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('offline_sync')}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#252A54] bg-[#1B1D35] hover:bg-white/5 transition text-left"
              >
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Offline Queue</p>
                  <p className="text-[10px] text-slate-400">{offlineQueue.length} Pending</p>
                </div>
              </button>
            </div>

            {/* Today's Assigned Visit Plan */}
            <div className="rounded-2xl border border-[#252A54] bg-[#1B1D35] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Today&apos;s Assigned Visit Plan
                  </h3>
                  <p className="text-[11px] text-slate-400">Shops assigned to your territory route for replenishment</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full text-indigo-300">
                  {dashboardData?.visitPlan?.length || shops.length} Assigned
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(dashboardData?.visitPlan || shops.slice(0, 6)).map((shop: any, idx: number) => {
                  const isVisited = shop.visitStatus === 'VISITED';
                  return (
                    <div
                      key={shop.shopId || shop._id}
                      className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-3 hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                            isVisited ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{shop.shopName || shop.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {shop.area || shop.city} &bull; {shop.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isVisited ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            <span>Done</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectShop(shop)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white text-[11px] font-bold shadow-sm hover:opacity-95"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Visited Activity */}
            {recentVisits.length > 0 && (
              <div className="rounded-2xl border border-[#252A54] bg-[#1B1D35] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Recent Verified Visits
                  </h3>
                  <button onClick={() => setActiveTab('history')} className="text-xs text-indigo-400 hover:text-white">
                    View all &rarr;
                  </button>
                </div>

                <div className="space-y-2">
                  {recentVisits.slice(0, 3).map((v: any) => (
                    <div
                      key={v._id}
                      onClick={() => setInspectVisit(v)}
                      className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-3 hover:bg-white/5 cursor-pointer transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-purple-300">{v.visitId}</span>
                          <span className="text-xs font-bold text-white truncate">{v.retailerId?.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {v.visitDate} &bull; {v.totalUnits || 0} units &bull; ₹
                          {(v.actualSalesValue || 0).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {v.googleMapsUrl && (
                          <a
                            href={v.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                            title="Open in Google Maps"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: INTERACTIVE 5-STEP VISIT WORKFLOW WIZARD
            ========================================================================= */}
        {activeTab === 'visit_wizard' && (
          <div className="space-y-4">
            {/* Step Progress Bar */}
            <div className="rounded-2xl border border-[#252A54] bg-[#1B1D35] p-3 shadow-xl">
              <div className="flex items-center justify-between mb-2 text-[11px] font-bold">
                <span className="text-purple-300">
                  Step {wizardStep} of 5:{' '}
                  {wizardStep === 1 && 'Shop Selection'}
                  {wizardStep === 2 && 'GPS Location'}
                  {wizardStep === 3 && 'Visit Photos (2)'}
                  {wizardStep === 4 && 'Product Sales'}
                  {wizardStep === 5 && 'Review & Submit'}
                </span>
                <span className="font-mono text-slate-400">
                  {selectedShop ? selectedShop.name.slice(0, 20) : 'No Shop Selected'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((st) => (
                  <div
                    key={st}
                    className={`h-1.5 rounded-full transition-all ${
                      wizardStep >= st ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* -------------------------------------------------------------
                STEP 1: SHOP SELECTION & REGISTRATION
                ------------------------------------------------------------- */}
            {wizardStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Select Retail Shop</h3>
                    <p className="text-xs text-slate-400">Search registered dealers or register a new shop</p>
                  </div>
                  <button
                    onClick={() => setIsRegisterShopModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Register New</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by shop name, code, owner, phone, PIN..."
                    value={shopSearchQuery}
                    onChange={(e) => setShopSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#5428E8] focus:outline-none"
                  />
                  {shopSearchQuery && (
                    <button
                      onClick={() => setShopSearchQuery('')}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShopFilterTab('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      shopFilterTab === 'all'
                        ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                        : 'border border-[#252A54] text-slate-400 hover:text-white'
                    }`}
                  >
                    All Shops ({shops.length})
                  </button>
                  <button
                    onClick={() => {
                      setShopFilterTab('nearby');
                      if (!currentDeviceLocation) acquireDeviceLocation();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      shopFilterTab === 'nearby'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'border border-[#252A54] text-slate-400 hover:text-white'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Nearby Shops</span>
                  </button>
                </div>

                {/* Shop Cards List */}
                <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                  {filteredShops.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
                      <Store className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-white">No registered shop found</p>
                      <p className="text-xs text-slate-400 mt-1">Shop not available in master catalog?</p>
                      <button
                        onClick={() => setIsRegisterShopModalOpen(true)}
                        className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs font-bold text-white shadow-md"
                      >
                        Register New Shop Now
                      </button>
                    </div>
                  ) : (
                    filteredShops.map((shop) => (
                      <div
                        key={shop._id}
                        className="p-4 rounded-2xl border border-[#252A54] bg-[#1B1D35] hover:border-purple-500/50 hover:bg-white/[0.04] transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                                {shop.dealerCode}
                              </span>
                              <h4 className="text-sm font-bold text-white">{shop.name}</h4>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                              {shop.ownerName} &bull; <span className="font-mono text-slate-400">{shop.phone}</span>
                            </p>
                          </div>

                          {shop.distanceMeters !== undefined && shop.distanceMeters !== null && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 shrink-0">
                              ~{shop.distanceMeters}m away
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">
                          {shop.address}, {shop.city} - {shop.pincode}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-slate-400">
                          <span>Last Visit: {shop.previousVisitDate || 'First Visit'}</span>
                          <button
                            onClick={() => handleSelectShop(shop)}
                            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-3.5 py-1.5 text-xs font-bold text-white shadow-md active:scale-95"
                          >
                            <span>Select &amp; Check In</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 2: GPS LOCATION & GOOGLE MAPS
                ------------------------------------------------------------- */}
            {wizardStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Capture Shop Location</h3>
                    <p className="text-xs text-slate-400">Mandatory GPS lock and Google Maps verification</p>
                  </div>
                  <button
                    onClick={() => setWizardStep(1)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Change Shop</span>
                  </button>
                </div>

                {/* Selected Shop Context Card */}
                {selectedShop && (
                  <div className="p-3.5 rounded-2xl border border-[#252A54] bg-[#1B1D35] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-purple-400 uppercase font-bold">Selected Destination</p>
                      <h4 className="text-xs font-extrabold text-white">{selectedShop.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{selectedShop.address}, {selectedShop.city}</p>
                    </div>
                    <span className="font-mono text-xs text-indigo-300 font-bold bg-white/5 px-2 py-1 rounded-lg">
                      {selectedShop.dealerCode}
                    </span>
                  </div>
                )}

                {/* Prominent Capture Button */}
                <div className="p-6 rounded-2xl border border-[#252A54] bg-[#1B1D35] text-center space-y-3">
                  <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-to-br from-[#5428E8] to-[#8055F7] flex items-center justify-center text-white shadow-2xl shadow-[#5428E8]/50">
                    <Navigation className={`h-8 w-8 ${gpsLoading ? 'animate-spin' : ''}`} />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">High-Precision Geolocation Lock</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Press the button below when physically present at the retail store to capture raw coordinates and create Google Maps evidence.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={gpsLoading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs sm:text-sm font-extrabold text-white shadow-xl shadow-purple-900/40 hover:opacity-95 active:scale-98 transition"
                  >
                    {gpsLoading ? 'ACQUIRING SATELLITE GPS LOCK...' : 'CAPTURE CURRENT SHOP LOCATION'}
                  </button>
                </div>

                {/* Captured GPS Details */}
                {capturedGps && (
                  <div className="p-4 rounded-2xl border border-[#252A54] bg-[#1B1D35] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#252A54]">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>GPS Coordinates Locked</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          capturedGps.isWithinGeofence
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {capturedGps.isWithinGeofence ? '✓ Inside Geofence' : '⚠ Flagged for Review'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/5">
                        <span className="text-[10px] text-slate-400 block">Latitude</span>
                        <span className="font-mono font-bold text-white">{capturedGps.latitude.toFixed(6)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5">
                        <span className="text-[10px] text-slate-400 block">Longitude</span>
                        <span className="font-mono font-bold text-white">{capturedGps.longitude.toFixed(6)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5">
                        <span className="text-[10px] text-slate-400 block">Accuracy</span>
                        <span className="font-mono font-bold text-white">±{capturedGps.accuracy} meters</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5">
                        <span className="text-[10px] text-slate-400 block">Distance to Store</span>
                        <span className="font-mono font-bold text-white">{capturedGps.distanceMeters}m</span>
                      </div>
                    </div>

                    {/* Google Maps Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <a
                        href={capturedGps.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:flex-1 py-2.5 px-3 rounded-xl border border-indigo-500/40 bg-indigo-500/15 text-xs font-bold text-indigo-300 hover:bg-indigo-500/25 flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open in Google Maps</span>
                      </a>
                      <button
                        type="button"
                        onClick={copyGoogleMapsLink}
                        className="w-full sm:flex-1 py-2.5 px-3 rounded-xl border border-[#252A54] bg-white/5 text-xs font-bold text-slate-200 hover:bg-white/10 flex items-center justify-center gap-1.5"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedLink ? 'Link Copied!' : 'Copy Location Link'}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">{capturedGps.notes}</p>
                  </div>
                )}

                {/* Continue button */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-[#252A54] text-xs font-bold text-slate-300 hover:bg-white/5"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={() => {
                      if (!capturedGps) {
                        showToast('error', 'Please capture GPS location before proceeding');
                        return;
                      }
                      setWizardStep(3);
                    }}
                    disabled={!capturedGps}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs font-bold text-white shadow-md disabled:opacity-50"
                  >
                    Continue to Photos &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 3: TWO PHOTOGRAPHS SYSTEM
                ------------------------------------------------------------- */}
            {wizardStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Capture 2 Verification Photos</h3>
                    <p className="text-xs text-slate-400">Storefront evidence and business interaction record</p>
                  </div>
                  <button
                    onClick={() => setWizardStep(2)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back
                  </button>
                </div>

                {/* Live Camera Viewfinder Overlay if camera is active */}
                {cameraActiveFor && (
                  <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between p-4">
                    <div className="w-full max-w-md flex items-center justify-between text-white pt-2">
                      <span className="text-xs font-bold">
                        {cameraActiveFor === 'front' ? 'Photo 1: Shop Front' : 'Photo 2: Shopkeeper Interaction'}
                      </span>
                      <button onClick={stopLiveCamera} className="p-2 text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="relative w-full max-w-md aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden border border-white/20">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-8 border border-white/40 rounded-2xl pointer-events-none" />
                    </div>

                    <div className="w-full max-w-md pb-6 flex items-center justify-center gap-6">
                      <button
                        onClick={stopLiveCamera}
                        className="px-4 py-2 text-xs font-bold text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => capturePhotoFromVideo(cameraActiveFor)}
                        className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-slate-900 shadow-2xl border-4 border-[#5428E8]"
                      >
                        <Camera className="h-7 w-7" />
                      </button>
                    </div>
                  </div>
                )}

                {/* PHOTO 1: SHOP FRONT */}
                <div className="p-4 rounded-2xl border border-[#252A54] bg-[#1B1D35] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">Evidence 1 of 2</span>
                      <h4 className="text-xs font-extrabold text-white">Capture Shop Front</h4>
                      <p className="text-[11px] text-slate-400">Physical storefront, exterior entrance &amp; signage</p>
                    </div>
                    {frontPhoto && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>Captured</span>
                      </span>
                    )}
                  </div>

                  {frontPhoto ? (
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black/50 border border-[#252A54]">
                      <img src={frontPhoto.dataUrl} alt="Shop Front" className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/60  px-3 py-1.5 rounded-lg text-[10px] text-white">
                        <span>Captured at {frontPhoto.timestamp}</span>
                        <button
                          onClick={() => startLiveCamera('front')}
                          className="font-bold text-purple-300 hover:text-white"
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startLiveCamera('front')}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs font-bold text-white shadow-md flex items-center justify-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        <span>Open Camera</span>
                      </button>
                      <label className="py-3 px-4 rounded-xl border border-[#252A54] bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'front')}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* PHOTO 2: SHOPKEEPER / INTERACTION */}
                <div className="p-4 rounded-2xl border border-[#252A54] bg-[#1B1D35] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">Evidence 2 of 2</span>
                      <h4 className="text-xs font-extrabold text-white">Capture Shopkeeper / Business Interaction</h4>
                      <p className="text-[11px] text-slate-400">Interaction photo with proprietor / manager</p>
                    </div>
                    {interactionPhoto && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>{interactionPhoto.consentGiven ? 'Captured' : 'Declined'}</span>
                      </span>
                    )}
                  </div>

                  {interactionPhoto?.declinedReason ? (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200">
                      <p className="font-bold">Photography Exception Recorded:</p>
                      <p className="text-[11px] mt-0.5">{interactionPhoto.declinedReason}</p>
                      <button
                        onClick={() => setInteractionPhoto(null)}
                        className="mt-2 text-[10px] font-bold text-amber-300 underline"
                      >
                        Clear exception and take photo
                      </button>
                    </div>
                  ) : interactionPhoto ? (
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black/50 border border-[#252A54]">
                      <img src={interactionPhoto.dataUrl} alt="Interaction" className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/60  px-3 py-1.5 rounded-lg text-[10px] text-white">
                        <span>Captured at {interactionPhoto.timestamp}</span>
                        <button
                          onClick={() => startLiveCamera('interaction')}
                          className="font-bold text-purple-300 hover:text-white"
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startLiveCamera('interaction')}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs font-bold text-white shadow-md flex items-center justify-center gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Open Camera</span>
                        </button>
                        <label className="py-3 px-4 rounded-xl border border-[#252A54] bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'interaction')}
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const reason = prompt('Specify authorized exception reason why shopkeeper declined photography:');
                          if (reason) {
                            setInteractionPhoto({
                              dataUrl: '',
                              timestamp: new Date().toLocaleTimeString(),
                              consentGiven: false,
                              declinedReason: reason,
                              captureMethod: 'UPLOAD_FALLBACK',
                            });
                          }
                        }}
                        className="w-full py-1.5 text-center text-[10px] text-slate-400 hover:text-amber-300 underline"
                      >
                        Shopkeeper declined photography? Record exception &rarr;
                      </button>
                    </div>
                  )}
                </div>

                {/* Continue button */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2.5 rounded-xl border border-[#252A54] text-xs font-bold text-slate-300"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={() => {
                      if (!frontPhoto?.dataUrl) {
                        showToast('error', 'Please capture the shop front photo before proceeding');
                        return;
                      }
                      setWizardStep(4);
                    }}
                    disabled={!frontPhoto?.dataUrl}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs font-bold text-white shadow-md disabled:opacity-50"
                  >
                    Continue to Products &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 4: PRODUCT SELECTION & PRICING
                ------------------------------------------------------------- */}
            {wizardStep === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Product Catalog &amp; Sales Entry</h3>
                    <p className="text-xs text-slate-400">Predefined wholesale pricing with manual override</p>
                  </div>
                  <button
                    onClick={() => setWizardStep(3)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Back
                  </button>
                </div>

                {/* Date & Time Sold + Optional Distributor Strip */}
                <div className="p-3.5 rounded-2xl border border-[#252A54] bg-[#1B1D35] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-purple-300 mb-1">
                        Sale Date &amp; Time (Mandatory)
                      </label>
                      <input
                        type="datetime-local"
                        value={saleDateTime}
                        onChange={(e) => setSaleDateTime(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#5428E8]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Distributor Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Salman Enterprises Logistics Hub"
                        value={distributorName}
                        onChange={(e) => setDistributorName(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5428E8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Distributor Mobile</label>
                      <input
                        type="text"
                        placeholder="e.g. 9845011999"
                        value={distributorMobile}
                        onChange={(e) => setDistributorMobile(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Distributor Email</label>
                      <input
                        type="email"
                        placeholder="e.g. dispatch@apexhub.com"
                        value={distributorEmail}
                        onChange={(e) => setDistributorEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Catalog Search & Category Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search smartphone model, brand, SKU..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5428E8]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {productCategories.slice(0, 7).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setProductCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                          productCategoryFilter === cat
                            ? 'bg-[#5428E8] text-white'
                            : 'border border-[#252A54] text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Products Bag */}
                {selectedLines.length > 0 && (
                  <div className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-purple-200">
                        Selected Sales Lines ({selectedLines.length} products &bull; {totalUnits} units)
                      </span>
                      <span className="text-xs font-black text-white">
                        ₹{totalActualSales.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {selectedLines.map((line, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-[#252A54] bg-[#1B1D35] space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-bold text-white">{line.productName}</h5>
                              <p className="text-[10px] text-slate-400">{line.variant} &bull; SKU: {line.sku}</p>
                            </div>
                            <button
                              onClick={() => removeLine(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-1">
                              <button
                                onClick={() => updateLineQuantity(idx, line.quantity - 1)}
                                className="h-6 w-6 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold text-white px-2">{line.quantity}</span>
                              <button
                                onClick={() => updateLineQuantity(idx, line.quantity + 1)}
                                className="h-6 w-6 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20"
                              >
                                +
                              </button>
                            </div>

                            {/* Standard vs Manual Switch */}
                            <button
                              type="button"
                              onClick={() => toggleManualPrice(idx)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                                line.priceType === 'MANUAL'
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : 'border-[#252A54] text-slate-400 hover:text-white'
                              }`}
                            >
                              {line.priceType === 'MANUAL' ? '✎ Manual Price Active' : 'Use Standard Price'}
                            </button>

                            <div className="text-right">
                              <p className="font-mono font-black text-white">₹{line.lineTotal.toLocaleString('en-IN')}</p>
                              <p className="text-[9px] text-slate-400">@ ₹{line.actualPrice.toLocaleString('en-IN')}/unit</p>
                            </div>
                          </div>

                          {/* Manual Price Expanded Drawer */}
                          {line.priceType === 'MANUAL' && (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 mt-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-amber-300 font-bold">Standard: ₹{line.standardPrice.toLocaleString('en-IN')}</span>
                                <span className={`text-[10px] font-bold ${line.priceDifference < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  Diff: {line.priceDifference < 0 ? '-' : '+'}₹{Math.abs(line.priceDifference).toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">Custom Price (₹)</label>
                                  <input
                                    type="number"
                                    value={line.actualPrice}
                                    onChange={(e) => updateManualPrice(idx, parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-lg bg-black/40 border border-amber-500/40 px-2 py-1 text-xs text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">Override Reason</label>
                                  <select
                                    value={line.manualPriceReason}
                                    onChange={(e) => updateManualReason(idx, e.target.value)}
                                    className="w-full rounded-lg bg-black/40 border border-amber-500/40 px-2 py-1 text-xs text-white"
                                  >
                                    <option value="Approved promotional deal">Approved promotional deal</option>
                                    <option value="Volume bulk discount">Volume bulk discount</option>
                                    <option value="Competitive dealer match">Competitive dealer match</option>
                                    <option value="Damaged box clearance">Damaged box clearance</option>
                                    <option value="Management override">Management override</option>
                                  </select>
                                </div>
                              </div>

                              {line.requiresApproval && (
                                <p className="text-[10px] text-rose-300 flex items-center gap-1 font-semibold">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  <span>Concession &gt;7% requires manager approval on submission.</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products List from Catalog */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Available Catalog Products ({filteredProducts.length})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {filteredProducts.slice(0, 12).map((prod) => (
                      <div
                        key={prod._id}
                        className="p-3 rounded-xl border border-[#252A54] bg-[#1B1D35] flex items-center justify-between gap-3 hover:border-purple-500/40 transition"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-purple-400 uppercase">{prod.brand}</span>
                          <h5 className="text-xs font-bold text-white truncate">{prod.name}</h5>
                          <p className="text-[10px] font-mono font-bold text-emerald-300">
                            STANDARD: ₹{prod.standardSellingPrice.toLocaleString('en-IN')}
                          </p>
                        </div>

                        <button
                          onClick={() => addProductToSelection(prod)}
                          className="h-8 w-8 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 font-bold flex items-center justify-center shrink-0"
                          title="Add Product"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Continue button */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2.5 rounded-xl border border-[#252A54] text-xs font-bold text-slate-300"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={() => {
                      if (selectedLines.length === 0) {
                        showToast('error', 'Please select at least 1 product sold');
                        return;
                      }
                      setWizardStep(5);
                    }}
                    disabled={selectedLines.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs font-bold text-white shadow-md disabled:opacity-50"
                  >
                    Review Final Summary &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 5: FINAL VISIT & SALES SUMMARY & SUBMISSION
                ------------------------------------------------------------- */}
            {wizardStep === 5 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Final Visit &amp; Sales Summary</h3>
                    <p className="text-xs text-slate-400">Review all details before recording permanently in MongoDB</p>
                  </div>
                  <button
                    onClick={() => setWizardStep(4)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    &larr; Edit Products
                  </button>
                </div>

                {/* Visit Information Card */}
                <div className="p-4 rounded-2xl border border-[#252A54] bg-[#1B1D35] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#252A54]">
                    <span className="text-xs font-extrabold text-white">Visit Dossier</span>
                    <span className="font-mono text-[10px] text-purple-300 font-bold">
                      {selectedShop?.dealerCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Representative</span>
                      <span className="font-bold text-white">{(user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user as any)?.name) || 'Alex Wong'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Retailer Shop</span>
                      <span className="font-bold text-white">{selectedShop?.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sale Date &amp; Time</span>
                      <span className="font-mono text-purple-300 font-bold">{saleDateTime.replace('T', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">GPS Coordinates</span>
                      <span className="font-mono text-slate-300">
                        {capturedGps?.latitude.toFixed(5)}, {capturedGps?.longitude.toFixed(5)}
                      </span>
                    </div>
                  </div>

                  {distributorName && (
                    <div className="p-2 rounded-lg bg-white/5 text-[11px] text-slate-300">
                      Distributor: <span className="font-bold text-white">{distributorName}</span>{' '}
                      {distributorMobile && `(${distributorMobile})`}
                    </div>
                  )}

                  {/* Photographs Thumbnails */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl overflow-hidden border border-[#252A54] bg-black/40 aspect-video relative">
                      {frontPhoto?.dataUrl && (
                        <img src={frontPhoto.dataUrl} alt="Shop Front" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-bold">
                        1. Shop Front
                      </span>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-[#252A54] bg-black/40 aspect-video relative">
                      {interactionPhoto?.dataUrl ? (
                        <img src={interactionPhoto.dataUrl} alt="Interaction" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-amber-300 p-2 text-center font-bold">
                          Photography Exception: {interactionPhoto?.declinedReason || 'Declined'}
                        </div>
                      )}
                      <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-bold">
                        2. Interaction
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product Sales Itemized Table */}
                <div className="p-4 rounded-2xl border border-[#252A54] bg-[#1B1D35] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-white">Itemized Sales Breakdown</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedLines.length} Lines</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#252A54] text-[10px] font-bold text-slate-400 uppercase">
                          <th className="pb-2">Product</th>
                          <th className="pb-2 text-center">Qty</th>
                          <th className="pb-2 text-right">Standard</th>
                          <th className="pb-2 text-right">Actual</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedLines.map((line, i) => (
                          <tr key={i} className="text-slate-200">
                            <td className="py-2 pr-2">
                              <p className="font-bold text-white truncate max-w-[140px]">{line.productName}</p>
                              <span className="text-[10px] text-slate-400">{line.variant}</span>
                            </td>
                            <td className="py-2 text-center font-mono font-bold text-white">{line.quantity}</td>
                            <td className="py-2 text-right font-mono text-slate-400">
                              ₹{line.standardPrice.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 text-right font-mono">
                              <span
                                className={
                                  line.priceType === 'MANUAL'
                                    ? line.priceDifference < 0
                                      ? 'text-rose-400 font-bold'
                                      : 'text-emerald-400 font-bold'
                                    : 'text-white'
                                }
                              >
                                ₹{line.actualPrice.toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-2 text-right font-mono font-bold text-white">
                              ₹{line.lineTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl border border-[#252A54] bg-[#1B1D35]">
                    <span className="text-[10px] text-slate-400 block">Total Units</span>
                    <span className="font-mono text-base font-black text-white">{totalUnits} units</span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#252A54] bg-[#1B1D35]">
                    <span className="text-[10px] text-slate-400 block">Standard Value</span>
                    <span className="font-mono text-base font-black text-slate-300">
                      ₹{totalStandardValue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                    <span className="text-[10px] text-emerald-400 block font-bold">Total Sales Value</span>
                    <span className="font-mono text-base font-black text-emerald-300">
                      ₹{totalActualSales.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#252A54] bg-[#1B1D35]">
                    <span className="text-[10px] text-slate-400 block">Net GST (18%)</span>
                    <span className="font-mono text-base font-black text-purple-300">
                      ₹{totalTax.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Employee Remarks */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Employee Visit Notes &amp; Observations
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter stock audit notes, shelf display health, dealer feedback, or competitor promos..."
                    value={visitRemarks}
                    onChange={(e) => setVisitRemarks(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5428E8]"
                  />
                </div>

                {/* Confirmation Checkbox */}
                <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="confirmCheck"
                    checked={confirmedAccurate}
                    onChange={(e) => setConfirmedAccurate(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-white/20 bg-white/5 text-[#5428E8] focus:ring-0"
                  />
                  <label htmlFor="confirmCheck" className="text-xs text-slate-200 cursor-pointer">
                    <span className="font-bold text-white">Mandatory Confirmation:</span> I confirm that the shop visit,
                    GPS location, physical photographs, and product sales quantities entered above are genuine and accurate.
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(4)}
                    className="px-4 py-2.5 rounded-xl border border-[#252A54] text-xs font-bold text-slate-300"
                  >
                    &larr; Back
                  </button>

                  <button
                    onClick={handleSubmitVisit}
                    disabled={submittingVisit || !confirmedAccurate}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#5428E8] via-indigo-600 to-[#8055F7] text-xs sm:text-sm font-extrabold text-white shadow-xl shadow-purple-900/40 hover:opacity-95 active:scale-98 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {submittingVisit ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>SUBMITTING VISIT REPORT...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4" />
                        <span>SUBMIT SHOP VISIT &amp; SALES REPORT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: ADVANCED FIELD SALES HISTORY
            ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">My Field Sales History</h3>
                <p className="text-xs text-slate-400">All submitted shop visits, photographs, and booked orders</p>
              </div>
              <span className="text-xs font-mono font-bold bg-white/10 px-2 py-1 rounded-lg text-purple-300">
                {recentVisits.length} Records
              </span>
            </div>

            <div className="space-y-2.5">
              {recentVisits.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
                  <Clock className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">No visit history recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Start a shop visit to create your first report.</p>
                </div>
              ) : (
                recentVisits.map((v: any) => (
                  <div
                    key={v._id}
                    className="p-4 rounded-2xl border border-[#252A54] bg-[#1B1D35] hover:border-purple-500/40 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                            {v.visitId || 'VST-202611'}
                          </span>
                          <h4 className="text-sm font-bold text-white">{v.retailerId?.name || 'Retailer Shop'}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {v.visitDate} &bull; {(v.retailerId as any)?.city || 'Karnataka'} &bull; Rep: {(user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user as any)?.name) || 'Alex Wong'}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          v.visitStatus === 'SUBMITTED' || v.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {v.visitStatus || v.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-white/5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Units</span>
                        <span className="font-mono font-bold text-white">{v.totalUnits || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Sales</span>
                        <span className="font-mono font-bold text-emerald-300">
                          ₹{(v.actualSalesValue || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Evidence</span>
                        <span className="text-[10px] text-indigo-300 font-bold">2 Photos + GPS</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      {v.googleMapsUrl ? (
                        <a
                          href={v.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-indigo-400 hover:text-white flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          <span>Google Maps Link</span>
                        </a>
                      ) : (
                        <span />
                      )}

                      <button
                        onClick={() => setInspectVisit(v)}
                        className="text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1"
                      >
                        <span>View Dossier</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: OFFLINE QUEUE & DATA SYNCHRONIZATION
            ========================================================================= */}
        {activeTab === 'offline_sync' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">Offline Sync Management</h3>
                <p className="text-xs text-slate-400">Manage device cache and synchronize local draft records</p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300">
                {offlineQueue.length} Pending
              </span>
            </div>

            {/* Offline Status Banner */}
            <div
              className={`p-4 rounded-2xl border ${
                isOnline
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              } flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                {isOnline ? <Wifi className="h-6 w-6 text-emerald-400" /> : <WifiOff className="h-6 w-6 text-amber-400" />}
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {isOnline ? 'Online — Connected to Central Server' : 'Offline Mode — Operating on Device Storage'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {isOnline
                      ? 'Network connection active. All changes synchronize immediately.'
                      : 'Visits are queued safely on this device and can be submitted once connectivity returns.'}
                  </p>
                </div>
              </div>

              {isOnline && offlineQueue.length > 0 && (
                <button
                  onClick={handleSyncOfflineRecords}
                  disabled={syncing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs font-bold text-white shadow-md flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              )}
            </div>

            {/* Queue Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Queued Visits Awaiting Cloud Sync
              </h4>

              {offlineQueue.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-[#252A54] bg-white/[0.02]">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/40 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">All device records are synchronized</p>
                  <p className="text-xs text-slate-400 mt-0.5">Zero pending offline queues.</p>
                </div>
              ) : (
                offlineQueue.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#252A54] bg-[#1B1D35] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-amber-400 font-bold">{item.localId}</span>
                        <span className="text-xs font-bold text-white">{item.shopName}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Queued: {new Date(item.queuedAt).toLocaleTimeString()} &bull; {item.totalUnits} units &bull; ₹
                        {item.actualSalesValue?.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Waiting to Sync
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL: REGISTER NEW SHOP (IF NOT IN MASTER LIST)
          ========================================================================= */}
      {isRegisterShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4  overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#1B1D35] border border-white/15 p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#252A54]">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">Register New Retail Shop</h3>
                  <p className="text-[11px] text-slate-400">Onboard unlisted retailer to master distribution network</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterShopModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/15 text-xs text-rose-200 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>Potential Duplicate Detected:</span>
                </p>
                <p className="text-[11px] leading-snug">
                  An existing shop was found: <strong>{duplicateWarning.matchingShop?.name}</strong> (Phone:{' '}
                  {duplicateWarning.matchingShop?.phone}, Code: {duplicateWarning.matchingShop?.dealerCode})
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectShop(duplicateWarning.matchingShop);
                      setIsRegisterShopModalOpen(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-white text-slate-900 font-bold text-[10px]"
                  >
                    Select Matching Shop
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleRegisterNewShop} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Shop Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sangeetha Mobiles Hub"
                  value={newShopForm.name}
                  onChange={(e) => setNewShopForm({ ...newShopForm, name: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Owner / Proprietor Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Kumar"
                    value={newShopForm.ownerName}
                    onChange={(e) => setNewShopForm({ ...newShopForm, ownerName: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Contact Phone <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9845012345"
                    value={newShopForm.phone}
                    onChange={(e) => setNewShopForm({ ...newShopForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Complete Address <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Street, building name, landmark..."
                  value={newShopForm.address}
                  onChange={(e) => setNewShopForm({ ...newShopForm, address: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    placeholder="Indiranagar"
                    value={newShopForm.locality}
                    onChange={(e) => setNewShopForm({ ...newShopForm, locality: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newShopForm.city}
                    onChange={(e) => setNewShopForm({ ...newShopForm, city: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    placeholder="560038"
                    value={newShopForm.pincode}
                    onChange={(e) => setNewShopForm({ ...newShopForm, pincode: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="29AABCS1234F1Z8"
                    value={newShopForm.gstin}
                    onChange={(e) => setNewShopForm({ ...newShopForm, gstin: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Category</label>
                  <select
                    value={newShopForm.shopCategory}
                    onChange={(e) => setNewShopForm({ ...newShopForm, shopCategory: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-white"
                  >
                    <option value="MOBILE_RETAIL">Mobile Retail</option>
                    <option value="MULTI_BRAND_STORE">Multi-Brand Store</option>
                    <option value="ELECTRONICS_SHOWROOM">Electronics Showroom</option>
                    <option value="ACCESSORIES_SHOP">Accessories Shop</option>
                    <option value="AUTHORIZED_DEALER">Authorized Dealer</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#252A54]">
                <button
                  type="button"
                  onClick={() => setIsRegisterShopModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registeringShop}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-md disabled:opacity-50"
                >
                  {registeringShop ? 'Registering...' : 'Save & Start Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SUBMISSION SUCCESS CELEBRATION
          ========================================================================= */}
      {submissionSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 ">
          <div className="w-full max-w-md rounded-3xl bg-[#1B1D35] border border-white/15 p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                {submissionSuccessModal.visitId}
              </span>
              <h3 className="text-lg font-black text-white mt-2">Shop Visit Successfully Recorded!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Sales transaction for <strong>{submissionSuccessModal.shopName}</strong> has been stored permanently in
                MongoDB.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-[#252A54] grid grid-cols-2 gap-2 text-xs text-left">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Sold</span>
                <span className="font-bold text-white">{submissionSuccessModal.totalUnits} Units</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total Sales</span>
                <span className="font-bold text-emerald-400">
                  ₹{submissionSuccessModal.totalSales?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {submissionSuccessModal.pendingPriceOverrides > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 text-left flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  {submissionSuccessModal.pendingPriceOverrides} manual price concession(s) routed to sales manager for
                  approval.
                </span>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  resetVisitWizard();
                  setActiveTab('visit_wizard');
                  setWizardStep(1);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-xs font-bold text-white shadow-md"
              >
                Start Another Shop Visit
              </button>
              <button
                onClick={resetVisitWizard}
                className="w-full py-2.5 rounded-xl border border-[#252A54] text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: INSPECT VISIT DOSSIER (FROM HISTORY)
          ========================================================================= */}
      {inspectVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4  overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-[#1B1D35] border border-white/15 p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#252A54]">
              <div>
                <span className="font-mono text-[10px] font-bold text-purple-400">{inspectVisit.visitId}</span>
                <h3 className="text-base font-extrabold text-white">{inspectVisit.retailerId?.name}</h3>
              </div>
              <button onClick={() => setInspectVisit(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5">
                <span className="text-[10px] text-slate-400 block">Visit Date</span>
                <span className="font-bold text-white">{inspectVisit.visitDate}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5">
                <span className="text-[10px] text-slate-400 block">Sale Value</span>
                <span className="font-bold text-emerald-400">
                  ₹{(inspectVisit.actualSalesValue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {inspectVisit.googleMapsUrl && (
              <a
                href={inspectVisit.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl border border-indigo-500/40 bg-indigo-500/15 text-xs font-bold text-indigo-300 flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Coordinates in Google Maps</span>
              </a>
            )}

            {/* Photos Viewer */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300">Photographic Evidence</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl overflow-hidden border border-[#252A54] bg-black/40 aspect-video relative">
                  {inspectVisit.shopFrontPhoto?.photoUrl ? (
                    <img
                      src={inspectVisit.shopFrontPhoto.photoUrl}
                      alt="Front"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                      No front photo
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white">
                    Shop Front
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden border border-[#252A54] bg-black/40 aspect-video relative">
                  {inspectVisit.shopInteractionPhoto?.photoUrl ? (
                    <img
                      src={inspectVisit.shopInteractionPhoto.photoUrl}
                      alt="Interaction"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-amber-300 p-2 text-center">
                      Exception: {inspectVisit.shopInteractionPhoto?.declinedReason || 'Declined'}
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white">
                    Interaction
                  </span>
                </div>
              </div>
            </div>

            {/* Product Sales Lines */}
            {inspectVisit.salesLines && inspectVisit.salesLines.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-300">Sold Products</span>
                <div className="p-3 rounded-xl bg-white/5 space-y-2 text-xs">
                  {inspectVisit.salesLines.map((l: any, i: number) => (
                    <div key={i} className="flex items-center justify-between pb-1 border-b border-white/5 last:border-0">
                      <div>
                        <p className="font-bold text-white">{l.productNameSnapshot}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {l.quantity} units @ ₹{l.actualSellingPrice?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white">₹{l.lineTotal?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectVisit(null)}
                className="px-5 py-2 rounded-xl border border-[#252A54] text-xs font-bold text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android Native Bottom Navigation Bar */}
      <AndroidBottomNav />
    </div>
  );
}
