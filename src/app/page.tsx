'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/public/PublicNavbar';
import {
  Smartphone,
  Tablet,
  Watch,
  Headphones,
  BatteryCharging,
  Zap,
  ShieldCheck,
  Truck,
  Users,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  QrCode,
  Store,
  DollarSign,
  TrendingUp,
  Boxes,
  ExternalLink,
  Lock,
  ChevronDown,
  Sliders,
  Calculator,
  Shield,
  Briefcase,
  Info,
  Check,
} from 'lucide-react';

interface CategorySpec {
  id: string;
  title: string;
  badge: string;
  hsnCode: string;
  gstRate: string;
  chipset: string;
  displayOrAcoustics: string;
  cameraOrPorts: string;
  batteryOrPower: string;
  wholesalePrice: number;
  retailMSRP: number;
  marginPercent: number;
  moq: string;
  inStockHubs: string;
  warranty: string;
  boxContents: string;
}

const CATEGORY_SPECS: Record<string, CategorySpec> = {
  smartphones: {
    id: 'smartphones',
    title: 'Flagship 5G Smartphones',
    badge: 'HSN 85171200',
    hsnCode: '85171200',
    gstRate: '18% GST (9% CGST + 9% SGST)',
    chipset: 'Qualcomm Snapdragon 8 Gen 3 / MediaTek Dimensity 9300 (4nm 3.3GHz)',
    displayOrAcoustics: '6.78" 1.5K 120Hz LTPO AMOLED, 4500 nits peak brightness',
    cameraOrPorts: '50MP Sony IMX906 OIS Primary + 50MP Periscope + 50MP Ultra-Wide',
    batteryOrPower: '5400mAh Silicon-Carbon Cell, 100W SuperVOOC Dual-Cell Fast Charge',
    wholesalePrice: 42000,
    retailMSRP: 48999,
    marginPercent: 14.3,
    moq: '5 Units',
    inStockHubs: 'Bangalore Central DC, Mumbai Bhiwandi Hub, Delhi NCR Hub',
    warranty: '1 Year Brand Comprehensive Warranty + 6 Months Accessories',
    boxContents: 'Handset, 100W GaN SuperVOOC Adapter, 6A USB-C Cable, TPU Case, SIM Ejector, Tax Invoice',
  },
  tablets: {
    id: 'tablets',
    title: 'Commercial Productivity Tablets',
    badge: 'Enterprise Displays',
    hsnCode: '84713010',
    gstRate: '18% GST (9% CGST + 9% SGST)',
    chipset: 'MediaTek Helio G99 / Snapdragon 7s Gen 2 Octa-Core',
    displayOrAcoustics: '11.5" 2.4K 120Hz Eye-Care IPS Display with 4096-Level Stylus Support',
    cameraOrPorts: '13MP AF Rear Camera + 8MP Wide Front for HD Video Conferencing',
    batteryOrPower: '8800mAh Battery with 33W Fast Charge & Reverse Power Bank Output',
    wholesalePrice: 21500,
    retailMSRP: 26999,
    marginPercent: 20.4,
    moq: '3 Units',
    inStockHubs: 'Bangalore DC, Delhi NCR Hub',
    warranty: '1 Year Brand On-Site Service Warranty',
    boxContents: 'Tablet, 33W Fast Adapter, Type-C Cable, Magnetic Folio Stand, User Manual',
  },
  smartwatches: {
    id: 'smartwatches',
    title: 'Cellular & AMOLED Smartwatches',
    badge: 'Wearable Tech',
    hsnCode: '85176290',
    gstRate: '18% GST',
    chipset: 'Dual-Engine Architecture (Smart OS + Ultra-Low-Power RTOS Chip)',
    displayOrAcoustics: '1.43" HD AMOLED Always-On Display, Sapphire Crystal Glass',
    cameraOrPorts: 'Built-in GPS, NFC Access, Dual-Frequency GNSS, Optical PPG Bio-Sensor',
    batteryOrPower: '450mAh High-Density Battery, Up to 14 Days Typical Use, Fast Magnetic Dock',
    wholesalePrice: 3800,
    retailMSRP: 5499,
    marginPercent: 30.9,
    moq: '10 Units',
    inStockHubs: 'Bangalore, Mumbai, Delhi, Hyderabad Hubs',
    warranty: '1 Year Doorstep Brand Warranty',
    boxContents: 'Smartwatch, Fluoroelastomer Strap, Magnetic Fast Charger, User Guide',
  },
  earbuds: {
    id: 'earbuds',
    title: 'Active Noise Cancelling (ANC) Earbuds',
    badge: 'Hi-Fi Wireless Audio',
    hsnCode: '85183000',
    gstRate: '18% GST',
    chipset: 'Airoha Dual-Core Bluetooth 5.4 Low-Latency SoC',
    displayOrAcoustics: '12.4mm Titanized Diaphragm Drivers with 48dB Hybrid ANC',
    cameraOrPorts: 'Triple Mic ENC with AI DNN Noise Reduction for Crystal Calls',
    batteryOrPower: 'Up to 42 Hours Total Playback, 10 Min Fast Charge for 5 Hours Play',
    wholesalePrice: 1450,
    retailMSRP: 2299,
    marginPercent: 36.9,
    moq: '15 Units',
    inStockHubs: 'All 6 Tier-1 Regional Distribution Centers',
    warranty: '1 Year Direct Replacement Warranty',
    boxContents: 'Earbuds, Charging Case, 3 Pairs Silicone Tips (S/M/L), USB-C Cable',
  },
  headphones: {
    id: 'headphones',
    title: 'Over-Ear Wireless Studio Headphones',
    badge: 'Acoustic Monitoring',
    hsnCode: '85183000',
    gstRate: '18% GST',
    chipset: 'High-Resolution LDAC & aptX HD Wireless Audio Codec',
    displayOrAcoustics: '40mm Custom Dynamic Drivers with Spatial Audio Head Tracking',
    cameraOrPorts: 'Multi-Point Bluetooth 5.3 + 3.5mm Lossless Analog Audio Jack',
    batteryOrPower: '60 Hours ANC Battery Life, USB-C Fast Charge (5 min for 4 hours)',
    wholesalePrice: 3200,
    retailMSRP: 4999,
    marginPercent: 35.9,
    moq: '5 Units',
    inStockHubs: 'Bangalore, Mumbai, Delhi Hubs',
    warranty: '1 Year Brand Comprehensive Warranty',
    boxContents: 'Headphones, Hard Protective Travel Case, 3.5mm Audio Cable, Type-C Cable',
  },
  chargers: {
    id: 'chargers',
    title: 'Gallium Nitride (GaN) Fast Chargers',
    badge: 'HSN 85044090',
    hsnCode: '85044090',
    gstRate: '18% GST',
    chipset: 'Navitas GaNFast™ Power IC Architecture with ThermalGuard 3.0',
    displayOrAcoustics: 'Dual USB-C (PD 3.1) + 1x USB-A (QC 4.0+) Smart Power Distribution',
    cameraOrPorts: '100W Max USB-C Output, PPS 3.3V-21V/5A Multi-Protocol Support',
    batteryOrPower: 'Flame-retardant PC shell (UL94 V-0), 9-Layer Protection Protocol',
    wholesalePrice: 850,
    retailMSRP: 1499,
    marginPercent: 43.3,
    moq: '20 Units',
    inStockHubs: 'All Regional Depots (Bulk Master Cartons Available)',
    warranty: '18 Months No-Hassle Direct Replacement Warranty',
    boxContents: 'GaN Charger, Braided 100W 1.2m E-Marker Type-C Cable, Quick Guide',
  },
  powerbanks: {
    id: 'powerbanks',
    title: 'MagSafe & High-Capacity GaN Power Banks',
    badge: 'Fast Charge Power',
    hsnCode: '85076000',
    gstRate: '18% GST',
    chipset: 'Smart Power MCU with Bi-Directional USB-PD 65W High-Speed Output',
    displayOrAcoustics: 'Smart Digital LED Battery Percentage & Power Output Display',
    cameraOrPorts: '20000mAh High-Density Lithium-Polymer Cells, Flight-Safe Approved',
    batteryOrPower: '65W Laptop PD Input/Output, 15W Qi Magnetic Wireless Pad',
    wholesalePrice: 1850,
    retailMSRP: 2899,
    marginPercent: 36.2,
    moq: '10 Units',
    inStockHubs: 'Bangalore, Mumbai, Delhi Hubs',
    warranty: '12 Months Replacement Warranty',
    boxContents: 'Power Bank, 60W Braided Cable, Travel Pouch',
  },
  accessories: {
    id: 'accessories',
    title: 'Military-Grade Drop Cases & 9H Glass',
    badge: 'Protection Armor',
    hsnCode: '39269099',
    gstRate: '18% GST',
    chipset: 'Air-Cushion TPU + Polycarbonate Dual Composite with N52 Neodymium Ring',
    displayOrAcoustics: 'Anti-Yellowing Bayer Germany Polymers, Oleophobic Electroplated Coating',
    cameraOrPorts: 'Raised Camera Bezels 1.5mm, 100% Screen Coverage 9H Scratch Defense',
    batteryOrPower: 'Full Qi2 & MagSafe 15W Magnetic Alignment Tested',
    wholesalePrice: 110,
    retailMSRP: 299,
    marginPercent: 63.2,
    moq: '50 Units (Mixed Assortment)',
    inStockHubs: 'All Regional Depots (Bulk Master Cartons Available)',
    warranty: 'Lifetime Anti-Yellowing & Adhesion Guarantee',
    boxContents: 'Protective Case, Dust Removal Kit, Alignment Tray',
  },
  'smart-electronics': {
    id: 'smart-electronics',
    title: 'Smart Home & Lifestyle Audio Gear',
    badge: 'IoT Connected',
    hsnCode: '85437099',
    gstRate: '18% GST',
    chipset: 'Espressif Dual-Band Wi-Fi + BLE 5.0 Matter-Certified SoC',
    displayOrAcoustics: 'Dolby Atmos Certified 120W Soundbars with Wireless Subwoofer',
    cameraOrPorts: 'HDMI eARC, Optical In, AUX 3.5mm, USB Playback, Wireless Sub Link',
    batteryOrPower: 'AC 100-240V 50/60Hz, Energy Star 8.0 Low-Standby Certified',
    wholesalePrice: 4800,
    retailMSRP: 7499,
    marginPercent: 36.0,
    moq: '4 Units',
    inStockHubs: 'Bangalore Central DC, Mumbai Hub',
    warranty: '1 Year Brand Comprehensive Warranty',
    boxContents: 'Soundbar, Wireless Subwoofer, Remote, HDMI Cable, Wall Mount Bracket',
  },
};



export default function B2BDistributionHomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrandCategory, setSelectedBrandCategory] = useState<string>('ALL');

  // Partnership Form State
  const [partnerForm, setPartnerForm] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    businessType: 'MOBILE_RETAILER',
    gstin: '',
    interestedCategories: ['SMARTPHONES', 'ACCESSORIES'],
    message: '',
  });
  const [partnerSubmitting, setPartnerSubmitting] = useState(false);
  const [partnerFeedback, setPartnerFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    inquiryId?: string;
  } | null>(null);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactFeedback, setContactFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    inquiryId?: string;
  } | null>(null);

  // Quick Catalog Search Modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Tech Specs Modal
  const [selectedSpecModal, setSelectedSpecModal] = useState<CategorySpec | null>(null);



  // Interactive B2B Profit Margin Calculator State
  const [calcCategory, setCalcCategory] = useState<string>('smartphones');
  const [calcVolume, setCalcVolume] = useState<number>(30);

  // Scroll detection for frosted glass navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle smooth scroll to hash anchors on mount and hash changes
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        const el = document.querySelector(hash);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    };
    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, []);

  // Fetch verified company info from MongoDB
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const res = await fetch('/api/public/company-info');
        if (res.ok) {
          const data = await res.json();
          setCompanyInfo(data);
        }
      } catch (err) {
        console.error('Failed to load company data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyData();
  }, []);

  // Handle Retailer Partnership Submission
  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerSubmitting(true);
    setPartnerFeedback(null);

    try {
      const res = await fetch('/api/public/retailer-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPartnerFeedback({
          type: 'success',
          message: data.message,
          inquiryId: data.inquiryNumber,
        });
        setPartnerForm({
          businessName: '',
          ownerName: '',
          phone: '',
          email: '',
          city: '',
          state: '',
          businessType: 'MOBILE_RETAILER',
          gstin: '',
          interestedCategories: ['SMARTPHONES', 'ACCESSORIES'],
          message: '',
        });
      } else {
        setPartnerFeedback({ type: 'error', message: data.error || 'Failed to submit application.' });
      }
    } catch (err: any) {
      setPartnerFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setPartnerSubmitting(false);
    }
  };

  // Handle Contact Form Submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactFeedback(null);

    try {
      const res = await fetch('/api/public/contact-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setContactFeedback({
          type: 'success',
          message: data.message,
          inquiryId: data.inquiryNumber,
        });
        setContactForm({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        });
      } else {
        setContactFeedback({ type: 'error', message: data.error || 'Failed to submit inquiry.' });
      }
    } catch (err: any) {
      setContactFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setContactSubmitting(false);
    }
  };



  const prefillCategoryInquiry = (categoryKey: string, volume?: number) => {
    const catMap: Record<string, string> = {
      smartphones: 'SMARTPHONES',
      tablets: 'TABLETS',
      chargers: 'CHARGERS',
      earbuds: 'AUDIO',
      headphones: 'AUDIO',
      powerbanks: 'POWERBANKS',
      accessories: 'ACCESSORIES',
      'smart-electronics': 'SMART_DEVICES',
      smartwatches: 'WEARABLES',
    };
    const mapped = catMap[categoryKey] || 'SMARTPHONES';
    setPartnerForm((prev) => ({
      ...prev,
      interestedCategories: [mapped],
      message: volume
        ? `Inquiry for estimated monthly wholesale order of ${volume} units of ${mapped}.`
        : prev.message,
    }));
    setSelectedSpecModal(null);
    const element = document.getElementById('partnership');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const content = companyInfo?.content || {
    companyName: 'Salman Enterprises Distribution Ltd.',
    tagline: 'Authorized Master Distributor for Leading Mobile & Electronics Brands',
    headline: 'Powering the Future of Mobile & Electronics Distribution.',
    subheadline:
      'Connecting leading technology brands with retailers through reliable distribution, genuine products and smarter business partnerships.',
    phone: '+91 (080) 4129-8800',
    email: 'distribution@apexelectronics.in',
    address: 'Nexus Technology Park, 4th Floor, Electronic City Phase 1',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560100',
    workingHours: 'Monday - Saturday: 9:00 AM - 7:00 PM IST',
  };

  const liveStats = companyInfo?.liveStats;

  // 9 Distinct Product Categories
  const productCategories = [
    {
      id: 'smartphones',
      title: 'Smartphones',
      description: 'Flagship 5G handsets, mid-range powerhouses, and commercial devices with dual IMEI tracking.',
      icon: Smartphone,
      image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80',
      badge: 'HSN 85171200',
    },
    {
      id: 'tablets',
      title: 'Tablets & Displays',
      description: 'High-performance commercial tablets, stylus-enabled pads, and enterprise retail touchscreen displays.',
      icon: Tablet,
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80',
      badge: 'Productivity',
    },
    {
      id: 'smartwatches',
      title: 'Smartwatches & Wearables',
      description: 'AMOLED fitness trackers, cellular-connected smartwatches, and premium health wearables.',
      icon: Watch,
      image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
      badge: 'Wearables',
    },
    {
      id: 'earbuds',
      title: 'Wireless Earbuds',
      description: 'Active Noise Cancelling (ANC) true-wireless audio with low-latency Bluetooth 5.4 transmission.',
      icon: Headphones,
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      badge: 'Hi-Fi Audio',
    },
    {
      id: 'headphones',
      title: 'Headphones',
      description: 'Over-ear studio monitors, wireless noise-cancelling travel headsets, and gaming acoustics.',
      icon: Headphones,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      badge: 'Studio Sound',
    },
    {
      id: 'chargers',
      title: 'Chargers & Adapters',
      description: 'Ultra-compact Gallium Nitride (GaN) fast chargers up to 120W with multi-port USB-C Power Delivery.',
      icon: Zap,
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
      badge: 'HSN 85044090',
    },
    {
      id: 'powerbanks',
      title: 'Power Banks',
      description: 'High-capacity 20,000mAh to 30,000mAh portable battery packs with MagSafe and laptop PD charging.',
      icon: BatteryCharging,
      image: 'https://images.unsplash.com/photo-1609592424368-80e227ff4b8e?auto=format&fit=crop&w=800&q=80',
      badge: 'Fast Charge',
    },
    {
      id: 'accessories',
      title: 'Mobile Accessories',
      description: 'Military-grade protective cases, 9H tempered glass screen guards, braided cables, and vehicle mounts.',
      icon: Boxes,
      image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80',
      badge: 'Protection',
    },
    {
      id: 'smart-electronics',
      title: 'Smart Electronics',
      description: 'IoT smart plugs, lifestyle audio soundbars, digital streaming gear, and smart home appliances.',
      icon: Sparkles,
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
      badge: 'IoT Connected',
    },
  ];

  // Verified Brand Supply Partners with Real Scraped Product Images and Official SVGs
  const featuredBrands = [
    {
      name: 'Samsung',
      brandCode: 'SAMSUNG',
      category: 'Smartphones & Tablets',
      type: 'SMARTPHONES',
      tier: 'Official Master Partner',
      logoUrl: '/brands/samsung.svg',
      productImage: '/brands/products/samsung.jpg',
      flagshipProduct: 'Galaxy S24 Ultra & Tab S9',
      tagline: 'Titanium chassis, Galaxy AI & S-Pen enterprise productivity.',
      keySpecs: ['Knox 3.9 Vault', 'Snapdragon 8 Gen 3', 'Dynamic AMOLED 2X', '200MP Quad Cam'],
      accentColor: '#1428A0',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      warranty: '1-Yr National OEM Warranty',
      dealerMargin: '11% Base Margin',
      inStockUnits: '1,240 Units in Hubs',
    },
    {
      name: 'Apple',
      brandCode: 'APPLE',
      category: 'Handsets & Accessories',
      type: 'SMARTPHONES',
      tier: 'Master Tier 1 Channel',
      logoUrl: '/brands/apple.svg',
      productImage: '/brands/products/apple.jpg',
      flagshipProduct: 'iPhone 16 Pro Max & MagSafe',
      tagline: 'Grade 5 Titanium, A18 Pro silicon & Camera Control ecosystem.',
      keySpecs: ['A18 Pro Silicon', 'Super Retina XDR', '48MP Fusion Camera', 'MagSafe Ready'],
      accentColor: '#A2AAAD',
      badgeBg: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
      warranty: 'AppleCare Direct Support',
      dealerMargin: '9% Base Margin',
      inStockUnits: '860 Units in Hubs',
    },
    {
      name: 'Xiaomi',
      brandCode: 'XIAOMI',
      category: 'Smartphones & Smart Life',
      type: 'SMARTPHONES',
      tier: 'Authorized National Hub',
      logoUrl: '/brands/xiaomi.svg',
      productImage: '/brands/products/xiaomi.jpg',
      flagshipProduct: 'Xiaomi 14 Ultra 5G & Pad 6',
      tagline: 'Leica quad periscope optics with HyperOS cross-device connectivity.',
      keySpecs: ['Leica Summilux Lens', '1-inch LYT-900', '90W HyperCharge', 'Xiaomi HyperOS'],
      accentColor: '#FF6900',
      badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      warranty: 'Genuine IMEI Verified',
      dealerMargin: '7.5% Base Margin',
      inStockUnits: '1,500 Units in Hubs',
    },
    {
      name: 'OnePlus',
      brandCode: 'ONEPLUS',
      category: 'Performance Phones',
      type: 'SMARTPHONES',
      tier: 'Direct Tier 1 Partner',
      logoUrl: '/brands/oneplus.svg',
      productImage: '/brands/products/oneplus.jpg',
      flagshipProduct: 'OnePlus 12 5G & Nord 4',
      tagline: 'Never Settle performance with 4th Gen Hasselblad camera for mobile.',
      keySpecs: ['Hasselblad Gen 4', '100W SUPERVOOC', 'Dual Cryo VC Cooling', '2K 120Hz ProXDR'],
      accentColor: '#EB0029',
      badgeBg: 'bg-red-500/10 text-red-400 border-red-500/20',
      warranty: 'Official Brand Warranty',
      dealerMargin: '8.5% Base Margin',
      inStockUnits: '940 Units in Hubs',
    },
    {
      name: 'Realme',
      brandCode: 'REALME',
      category: 'Youth Smartphones',
      type: 'SMARTPHONES',
      tier: 'Authorized Channel Partner',
      logoUrl: '/brands/realme.svg',
      productImage: '/brands/products/realme.jpg',
      flagshipProduct: 'Realme GT 6 & 13 Pro+',
      tagline: 'Flagship killer speed with 6000nit ultra-bright display and AI smarts.',
      keySpecs: ['Sony LYT-808 OIS', '120W Ultra Charge', '6000nit Sunlight Display', 'Snapdragon 8s Gen 3'],
      accentColor: '#FFC915',
      badgeBg: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
      warranty: 'Realme Official Seal',
      dealerMargin: '8% Base Margin',
      inStockUnits: '1,120 Units in Hubs',
    },
    {
      name: 'Vivo',
      brandCode: 'VIVO',
      category: 'Camera Smartphones',
      type: 'SMARTPHONES',
      tier: 'Direct Tier 1 Partner',
      logoUrl: '/brands/vivo.svg',
      productImage: '/brands/products/vivo.jpg',
      flagshipProduct: 'Vivo X100 Pro 5G & V40',
      tagline: 'ZEISS APO floating telephoto with customized V3+ imaging processor.',
      keySpecs: ['ZEISS APO Optics', 'Vivo V3 Imaging Chip', '5400mAh BlueVolt', 'IP68 Certified'],
      accentColor: '#415FFF',
      badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      warranty: 'Manufacturer Direct',
      dealerMargin: '10% Base Margin',
      inStockUnits: '780 Units in Hubs',
    },
    {
      name: 'OPPO',
      brandCode: 'OPPO',
      category: 'Imaging Flagships',
      type: 'SMARTPHONES',
      tier: 'Authorized National Distributor',
      logoUrl: '/brands/oppo.svg',
      productImage: '/brands/products/oppo.jpg',
      flagshipProduct: 'OPPO Find X7 Ultra & Reno 12',
      tagline: 'Pioneering quad main camera system with dual periscope lenses.',
      keySpecs: ['Hasselblad Master', 'Dual Periscope Zoom', '100W Flash Charge', 'ColorOS 14 AI'],
      accentColor: '#008753',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      warranty: 'OPPO Direct Verified',
      dealerMargin: '9.5% Base Margin',
      inStockUnits: '690 Units in Hubs',
    },
    {
      name: 'Motorola',
      brandCode: 'MOTOROLA',
      category: '5G Mobile Technology',
      type: 'SMARTPHONES',
      tier: 'Regional Partner',
      logoUrl: '/brands/motorola.svg',
      productImage: '/brands/products/motorola.jpg',
      flagshipProduct: 'Motorola Razr 50 Ultra & Edge 50',
      tagline: 'Largest external display flip foldable with moto ai intelligence.',
      keySpecs: ['4.0" External p-OLED', 'Pantone™ Validated', 'Snapdragon 8s Gen 3', 'IPX8 Waterproof'],
      accentColor: '#804DFF',
      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      warranty: 'Motorola Genuine IMEI',
      dealerMargin: '9.5% Base Margin',
      inStockUnits: '520 Units in Hubs',
    },
    {
      name: 'Anker',
      brandCode: 'ANKER',
      category: 'GaN Chargers & Cables',
      type: 'ACCESSORIES',
      tier: 'Exclusive Channel Distributor',
      logoUrl: '/brands/anker.svg',
      productImage: '/brands/products/anker.jpg',
      flagshipProduct: 'Anker Prime 100W/140W GaN Chargers',
      tagline: 'Gallium Nitride multi-port ultra-fast wall chargers, power banks & braided cables.',
      keySpecs: ['GaNPrime™ Tech', 'ActiveShield™ 2.0', '100W Triple Port', 'PowerIQ 4.0 Fast'],
      accentColor: '#00A0E9',
      badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      warranty: '24-Mo Extended Warranty',
      dealerMargin: '18% Base Margin',
      inStockUnits: '3,400 Units in Hubs',
    },
    {
      name: 'boAt',
      brandCode: 'BOAT',
      category: 'Audio & Wearables',
      type: 'AUDIO',
      tier: 'National Tier 1 Distribution',
      logoUrl: '/brands/boat.svg',
      productImage: '/brands/products/boat.jpg',
      flagshipProduct: 'boAt Nirvana Ion ANC & Storm Watch',
      tagline: 'High-definition wireless ANC earbuds with 120H playback & gaming BEAST mode.',
      keySpecs: ['Crystal Bionic Sound', '120 Hours Playback', 'Quad Mic ENx Noise Cancel', 'BEAST™ Low Latency'],
      accentColor: '#FF0038',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      warranty: 'boAt 1-Yr Replacement',
      dealerMargin: '22% Base Margin',
      inStockUnits: '4,100 Units in Hubs',
    },
  ];

  // Active Calculator Spec
  const activeCalcSpec = CATEGORY_SPECS[calcCategory] || CATEGORY_SPECS.smartphones;
  const calcMonthlyWholesale = activeCalcSpec.wholesalePrice * calcVolume;
  const calcMonthlyRevenue = activeCalcSpec.retailMSRP * calcVolume;
  const calcMonthlyGrossProfit = calcMonthlyRevenue - calcMonthlyWholesale;
  const calcAnnualProfit = calcMonthlyGrossProfit * 12;
  const calcAnnualRoi = ((calcAnnualProfit / calcMonthlyWholesale) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-[#080B1A] text-slate-100 font-sans selection:bg-[#5428E8] selection:text-white pb-16 sm:pb-0">
      {/* =========================================================================
          TOP NAVIGATION BAR (Responsive, Glassmorphic, Brand-Aligned)
          ========================================================================= */}
      <PublicNavbar onOpenSearch={() => setSearchOpen(true)} />

      {/* =========================================================================
          HERO SECTION (High-Polish B2B Technology Identity)
          ========================================================================= */}
      <section
        id="hero"
        className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-gradient-to-b from-[#080B1A] via-[#0E122A] to-[#080B1A]"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[#5428E8]/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Core Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>{content.tagline}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              Powering the Future of{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">
                Mobile &amp; Electronics
              </span>{' '}
              Distribution.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
              {content.subheadline}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <a
                href="#partnership"
                className="rounded-2xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:opacity-95 hover:shadow-indigo-600/40 active:scale-98 transition flex items-center gap-2"
              >
                <span>Become a Retail Partner</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              <a
                href="#calculator"
                className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-3.5 text-xs sm:text-sm font-bold text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                <span>Calculate Dealer Profit</span>
              </a>

              <Link
                href="/catalog"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-xs sm:text-sm font-bold text-slate-200 backdrop-blur-md hover:bg-white/10 transition flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4 text-indigo-400" />
                <span>Explore Catalog</span>
              </Link>
            </div>

            {/* Verified Compliance Micro-Strip */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Dual IMEI Traceability</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                <span>Rule 46 GST Invoicing</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-400" />
                <span>Express Regional Fulfillment</span>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Studio Product Composition */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-6 backdrop-blur-2xl shadow-2xl shadow-indigo-950/60 overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-[#5428E8]/30 blur-3xl" />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-extrabold text-emerald-300">
                      LIVE INWARDED STOCK
                    </span>
                    <span className="font-mono text-xs text-indigo-300 font-bold">FLAGSHIP SERIES</span>
                  </div>

                  <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden bg-[#0A0D1F] border border-white/10 group">
                    <img
                      src="https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80"
                      alt="Premium Flagship Smartphone"
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D1F] via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <div>
                        <h4 className="text-sm font-extrabold text-white">5G Flagship Master Series</h4>
                        <span className="text-[11px] text-slate-400">Snapdragon 8 Gen 3 • 120Hz AMOLED</span>
                      </div>
                      <span className="rounded-lg bg-indigo-600/80 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                        12GB / 256GB
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-white/5 p-2 border border-white/10">
                      <span className="text-[10px] text-slate-400 block">HSN Code</span>
                      <span className="font-mono font-bold text-white">85171200</span>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 border border-white/10">
                      <span className="text-[10px] text-slate-400 block">GST Rate</span>
                      <span className="font-mono font-bold text-emerald-400">18% (9+9)</span>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Warranty</span>
                      <span className="font-mono font-bold text-indigo-300">12 Months</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-5 sm:-left-8 rounded-2xl border border-indigo-400/30 bg-[#0E122A]/95 p-3.5 backdrop-blur-xl shadow-xl flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Official Channel Source</span>
                  <span className="text-[10px] text-slate-400">Direct authorized brand consignments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMPANY TRUST STRIP
          ========================================================================= */}
      <section className="relative z-10 border-y border-white/10 bg-[#0B0E22]/90 backdrop-blur-md py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="pt-2 md:pt-0">
              <span className="text-3xl font-black text-white tracking-tight">12+</span>
              <span className="block text-xs font-medium text-slate-400 mt-0.5">Years in B2B Electronics</span>
            </div>
            <div className="pt-4 md:pt-0">
              <span className="text-3xl font-black text-indigo-400 tracking-tight">1,450+</span>
              <span className="block text-xs font-medium text-slate-400 mt-0.5">Verified Retail Partners</span>
            </div>
            <div className="pt-4 md:pt-0">
              <span className="text-3xl font-black text-white tracking-tight">100%</span>
              <span className="block text-xs font-medium text-slate-400 mt-0.5">Dual IMEI Traceability</span>
            </div>
            <div className="pt-4 md:pt-0">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">24h</span>
              <span className="block text-xs font-medium text-slate-400 mt-0.5">Same-Day Dispatch SLA</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PRODUCT CATEGORIES (With Tech Specs Modal Trigger)
          ========================================================================= */}
      <section id="categories" className="py-24 relative bg-[#080B1A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">COMMERCIAL CATALOG</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Technology for Every Business.
            </h2>
            <p className="text-sm text-slate-400">
              Curated portfolios of authentic flagship smartphones, mobile accessories, and electronic devices. Click any category to inspect full commercial specs and dealer margin terms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productCategories.map((cat) => {
              const Icon = cat.icon;
              const specData = CATEGORY_SPECS[cat.id];
              return (
                <div
                  key={cat.id}
                  className="group relative rounded-3xl border border-white/10 bg-[#0E122A] overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E122A] via-[#0E122A]/40 to-transparent" />
                    <div className="absolute top-4 right-4">
                      <span className="rounded-full bg-[#080B1A]/80 border border-white/15 px-3 py-1 text-[10px] font-bold text-indigo-300 backdrop-blur-md">
                        {cat.badge}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/80 text-white backdrop-blur-md">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">
                        {cat.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => specData && setSelectedSpecModal(specData)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-white transition"
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span>Inspect Tech Specs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => prefillCategoryInquiry(cat.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 transition"
                      >
                        <span>Book Allocation</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE B2B PROFIT MARGIN & RETAILER ROI CALCULATOR
          ========================================================================= */}
      <section id="calculator" className="py-20 relative bg-[#0B0E22] border-y border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-300">
              <Calculator className="h-3.5 w-3.5 text-indigo-400" />
              <span>INTERACTIVE RETAILER TOOL</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Calculate Your Retail Margin &amp; ROI
            </h2>
            <p className="text-sm text-slate-400">
              Explore your projected gross margins, working capital turnover, and annualized returns based on your store&apos;s monthly purchasing volume.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-[#0E122A] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Sliders & Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* Category Pills */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    1. Select Product Line:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'smartphones', label: 'Flagship 5G Handsets', icon: Smartphone },
                      { key: 'tablets', label: 'Commercial Tablets', icon: Tablet },
                      { key: 'chargers', label: 'GaN Fast Chargers', icon: Zap },
                      { key: 'earbuds', label: 'ANC Wireless Audio', icon: Headphones },
                      { key: 'accessories', label: 'Protective Armor', icon: Boxes },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = calcCategory === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setCalcCategory(tab.key)}
                          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-[#5428E8] text-white shadow-lg shadow-[#5428E8]/30'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      2. Estimated Monthly Order Volume:
                    </label>
                    <span className="font-mono text-lg font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/20">
                      {calcVolume} Units / mo
                    </span>
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={250}
                    step={5}
                    value={calcVolume}
                    onChange={(e) => setCalcVolume(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#5428E8]"
                  />

                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>5 Units (Trial Tier)</span>
                    <span>50 Units (Standard Dealer)</span>
                    <span>150 Units (Preferred)</span>
                    <span>250+ (Master Distributor)</span>
                  </div>
                </div>

                {/* Unit Price Metrics Strip */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <span className="text-[10px] text-slate-400 block">Wholesale Price (Unit)</span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      ₹{activeCalcSpec.wholesalePrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <span className="text-[10px] text-slate-400 block">Suggested Retail (MSRP)</span>
                    <span className="text-sm sm:text-base font-extrabold text-indigo-300">
                      ₹{activeCalcSpec.retailMSRP.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <span className="text-[10px] text-slate-400 block">Unit Gross Margin</span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                      +₹{(activeCalcSpec.retailMSRP - activeCalcSpec.wholesalePrice).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Projections Card */}
              <div className="lg:col-span-5 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-[#0A0D1F] p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                    PROJECTED RETAIL RETURNS
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    Financial Summary ({calcVolume} Units)
                  </h3>
                </div>

                <div className="space-y-3 divide-y divide-white/10 text-xs">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-slate-400">Monthly Wholesale Inventory Cost:</span>
                    <span className="font-mono font-bold text-white">
                      ₹{calcMonthlyWholesale.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-400">Projected Monthly Retail Turnover:</span>
                    <span className="font-mono font-bold text-indigo-300">
                      ₹{calcMonthlyRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-400">Gross Margin Percentage:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {activeCalcSpec.marginPercent}% Per Unit
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 bg-emerald-500/10 px-3 rounded-xl border border-emerald-500/20">
                    <span className="font-bold text-emerald-300">Monthly Retail Net Profit:</span>
                    <span className="font-mono font-extrabold text-emerald-300 text-sm">
                      ₹{calcMonthlyGrossProfit.toLocaleString('en-IN')} / mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <span className="font-bold text-slate-200">Annualized Profit Projection:</span>
                    <span className="font-mono font-black text-white text-base">
                      ₹{calcAnnualProfit.toLocaleString('en-IN')} / yr
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => prefillCategoryInquiry(calcCategory, calcVolume)}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:opacity-95 transition flex items-center justify-center gap-2"
                >
                  <span>Lock Allocation for this Tier</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURED BRANDS ("Leading Technology Brands")
          ========================================================================= */}
      <section id="brands" className="py-24 border-y border-white/10 bg-gradient-to-b from-[#080B1A] via-[#0B0E22] to-[#080B1A] relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-indigo-600/10 blur-[110px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>MANUFACTURER PORTFOLIO &bull; DIRECT OEM CHANNELS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Leading Technology Brands
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              We supply authentic hardware sourced through established authorized channels with verified serial numbers and manufacturer warranties.
            </p>

            {/* 4 Trust Metrics */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E122A] border border-white/10 text-slate-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>10 Tier 1 Authorized Brands</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E122A] border border-white/10 text-slate-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>100% Genuine Dual TAC IMEI</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E122A] border border-white/10 text-slate-300 font-medium">
                <Boxes className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Karnataka Hubs Ready Stock</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E122A] border border-white/10 text-slate-300 font-medium">
                <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Same-Day B2B Dispatch</span>
              </div>
            </div>
          </div>

          {/* Interactive Category Filter Tabs */}
          <div className="flex items-center justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-[#0E122A] border border-white/10 shadow-lg text-xs font-semibold">
              <button
                onClick={() => setSelectedBrandCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  selectedBrandCategory === 'ALL'
                    ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All 10 Brands
              </button>
              <button
                onClick={() => setSelectedBrandCategory('SMARTPHONES')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  selectedBrandCategory === 'SMARTPHONES'
                    ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Smartphones &amp; Tablets (8)
              </button>
              <button
                onClick={() => setSelectedBrandCategory('ACCESSORIES')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  selectedBrandCategory === 'ACCESSORIES'
                    ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                GaN Power &amp; Cables (1)
              </button>
              <button
                onClick={() => setSelectedBrandCategory('AUDIO')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  selectedBrandCategory === 'AUDIO'
                    ? 'bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Audio &amp; Wearables (1)
              </button>
            </div>
          </div>

          {/* 10 Brand Cards Grid with Scraped Images and Official Vector SVGs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
            {featuredBrands
              .filter((b) => selectedBrandCategory === 'ALL' || b.type === selectedBrandCategory)
              .map((b) => (
                <div
                  key={b.name}
                  className="group rounded-2xl border border-white/10 bg-[#0E122A]/85 p-4 backdrop-blur-md hover:border-purple-500/50 hover:bg-[#121736] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-950/40 flex flex-col justify-between overflow-hidden relative"
                >
                  {/* Subtle Brand Ambient Highlight */}
                  <div
                    className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                    style={{ backgroundColor: b.accentColor }}
                  />

                  {/* Top Bar: Brand Logo & Tier Pill */}
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
                      <div className="h-8 px-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-purple-400/40 transition">
                        <img
                          src={b.logoUrl}
                          alt={`${b.name} Official Logo`}
                          className="h-4 max-w-[80px] object-contain filter brightness-100"
                        />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border truncate max-w-[130px] ${b.badgeBg}`}>
                        {b.tier}
                      </span>
                    </div>

                    {/* Scraped Hardware Product Image */}
                    <div className="relative h-40 w-full rounded-xl overflow-hidden my-3 border border-white/10 bg-black/40">
                      <img
                        src={b.productImage}
                        alt={`${b.name} ${b.flagshipProduct}`}
                        className="h-full w-full object-cover group-hover:scale-108 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E22] via-[#0B0E22]/30 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <span className="text-[10px] text-purple-300 font-mono font-bold block truncate">
                          {b.flagshipProduct}
                        </span>
                      </div>
                    </div>

                    {/* Brand Name & Category */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-extrabold text-white tracking-tight">
                          {b.name}
                        </h3>
                        <span className="font-mono text-[10px] text-purple-400 font-semibold">
                          {b.brandCode}
                        </span>
                      </div>
                      <span className="block text-[10px] font-semibold text-indigo-300">
                        {b.category}
                      </span>
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 pt-0.5">
                        {b.tagline}
                      </p>
                    </div>

                    {/* Key Specs Tags */}
                    <div className="grid grid-cols-2 gap-1.5 pt-3">
                      {b.keySpecs.map((spec, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono text-slate-300 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 truncate text-center"
                          title={spec}
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom: Margin, Warranty & CTA */}
                  <div className="pt-4 border-t border-white/5 mt-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-emerald-400 font-semibold">{b.dealerMargin}</span>
                      <span className="text-slate-400 flex items-center gap-1 truncate max-w-[120px]">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{b.warranty}</span>
                      </span>
                    </div>

                    <Link
                      href={`/catalog?search=${encodeURIComponent(b.name)}`}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600 hover:to-indigo-600 text-purple-200 hover:text-white border border-purple-500/30 hover:border-transparent text-xs font-bold transition-all shadow-sm"
                    >
                      <span>Explore B2B Stock</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
          </div>

          {/* Allocation & Trademark Disclaimer Banner */}
          <div className="rounded-2xl border border-white/10 bg-[#0E122A]/80 p-5 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Legitimate B2B Wholesale Allocation
                </span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-3xl leading-relaxed">
                Note: All brand logos and trademarks belong to their respective proprietary manufacturers. Commercial supplies are governed by legitimate authorized B2B wholesale distribution contracts with GST tax invoices and full manufacturer warranties.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/catalog"
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition"
              >
                Browse Full Catalog
              </Link>
              <Link
                href="#partnership"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] text-white text-xs font-bold shadow-md shadow-purple-900/30 hover:brightness-110 transition"
              >
                Apply for Dealership
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          WHY CHOOSE US ("Your Trusted Partner in Electronics Distribution")
          ========================================================================= */}
      <section id="about" className="py-24 relative bg-[#080B1A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              DISTRIBUTION CREDIBILITY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Your Trusted Partner in Electronics Distribution.
            </h2>
            <p className="text-sm text-slate-400">
              Built from the ground up for mobile shop owners, multi-brand electronics dealers, and regional retail networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-white/10 bg-[#0E122A] p-7 space-y-4 hover:border-indigo-500/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Genuine Products</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct source procurement ensures zero gray-market or counterfeit stock. Every device undergoes serial and dual 15-digit IMEI verification before dispatch.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0E122A] p-7 space-y-4 hover:border-indigo-500/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Reliable Distribution</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dedicated regional distribution warehouses maintain ready stock. Orders booked before cutoff are processed same-day with tracked electronic delivery challans.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0E122A] p-7 space-y-4 hover:border-indigo-500/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Strong Retailer Support</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Competitive dealer margins, dedicated relationship managers, revolving credit lines (Net 15 / Net 30), and marketing point-of-sale display kits.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0E122A] p-7 space-y-4 hover:border-indigo-500/40 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Compliant GST Billing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                100% formal invoices with correct HSN coding, itemized CGST/SGST/IGST breakdown, and instantaneous e-invoicing for seamless input tax credit recovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          LOGISTICS & WAREHOUSING INFRASTRUCTURE
          ========================================================================= */}
      <section id="network" className="py-20 relative bg-[#0B0E22] border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              SUPPLY CHAIN CORRIDORS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Distribution &amp; Warehousing Network
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Hub-and-spoke logistics infrastructure designed to reduce transit times and protect high-value electronics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/10 bg-[#0E122A] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white">South Corridor DC</h4>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                  HUB-01
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Central Logistics DC, Electronic City Phase 1, Bangalore. Servicing Karnataka, Tamil Nadu, Kerala, Andhra Pradesh &amp; Telangana.
              </p>
              <div className="text-[11px] text-emerald-400 font-medium">✓ Same-Day &bull; 24h Transit SLA</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0E122A] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white">West Logistics Depot</h4>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                  HUB-02
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bhiwandi Logistics Hub, Mumbai MMR. Servicing Maharashtra, Gujarat, Goa, and Western Trade Corridors.
              </p>
              <div className="text-[11px] text-emerald-400 font-medium">✓ High-Capacity Dual Inwarding</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0E122A] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white">North Logistics Hub</h4>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                  HUB-03
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sector 62, Innovation Zone, Delhi NCR. Servicing Delhi NCR, Uttar Pradesh, Haryana, Punjab &amp; Rajasthan.
              </p>
              <div className="text-[11px] text-emerald-400 font-medium">✓ Temperature-Regulated Battery Vault</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          RETAILER PARTNERSHIP APPLICATION FORM
          ========================================================================= */}
      <section id="partnership" className="py-24 relative bg-[#080B1A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              GROW YOUR BUSINESS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Apply for Retailer Partnership
            </h2>
            <p className="text-sm text-slate-400">
              Complete the verified retailer enrollment form below to unlock dealer wholesale pricing, revolving credit, and priority allocations.
            </p>
          </div>

          <div className="mx-auto max-w-3xl rounded-3xl border border-white/15 bg-[#0E122A] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            {partnerFeedback && (
              <div
                className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 ${
                  partnerFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {partnerFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <X className="h-5 w-5 shrink-0 text-rose-400" />
                )}
                <div>
                  <p>{partnerFeedback.message}</p>
                  {partnerFeedback.inquiryId && (
                    <p className="mt-1 font-mono text-[11px] opacity-80">
                      Tracking Application ID: {partnerFeedback.inquiryId}
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handlePartnerSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Store / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Salman Mobile Hub"
                    value={partnerForm.businessName}
                    onChange={(e) => setPartnerForm({ ...partnerForm, businessName: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Proprietor / Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikas Malhotra"
                    value={partnerForm.ownerName}
                    onChange={(e) => setPartnerForm({ ...partnerForm, ownerName: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Mobile / WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9811002233"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. store@apexmobile.com"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bangalore"
                    value={partnerForm.city}
                    onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karnataka"
                    value={partnerForm.state}
                    onChange={(e) => setPartnerForm({ ...partnerForm, state: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="29ABCDE1234F1Z5"
                    value={partnerForm.gstin}
                    onChange={(e) => setPartnerForm({ ...partnerForm, gstin: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white font-mono focus:border-[#5428E8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Business Comments / Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Specify desired brands, expected monthly volume, or existing retail showroom details..."
                  value={partnerForm.message}
                  onChange={(e) => setPartnerForm({ ...partnerForm, message: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={partnerSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-3 text-xs sm:text-sm font-bold text-white shadow-xl hover:opacity-95 transition disabled:opacity-50"
              >
                {partnerSubmitting ? 'Submitting Application...' : 'Submit Partnership Application'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BUSINESS PORTAL CTA SECTION
          ========================================================================= */}
      <section className="py-20 relative bg-gradient-to-r from-[#5428E8]/20 via-[#0E122A] to-[#5428E8]/20 border-y border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            REGISTERED PARTNERS &amp; STAFF
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Access Your Partner Distribution Portal
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto">
            View live dealer ledger balances, track dispatch shipments, verify dual-IMEI inventory serials, and place replenishment bookings directly through our automated portal.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="rounded-2xl bg-white px-6 py-3 text-xs sm:text-sm font-bold text-slate-900 shadow-xl hover:bg-slate-100 transition"
            >
              Sign In to Portal
            </Link>
            <Link
              href="/distribution"
              className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition flex items-center gap-2"
            >
              <Building2 className="h-4 w-4 text-purple-300" />
              <span>Distribution Management</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CONTACT OFFICE
          ========================================================================= */}
      <section id="contact" className="py-24 relative bg-[#080B1A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              DIRECT REACH
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Corporate Headquarters &amp; Contacts
            </h2>
            <p className="text-sm text-slate-400">
              Reach our enterprise corporate distribution desk for supply contracts, brand inquiries, or regional partnerships.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-[#0E122A] p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">{content.companyName}</h3>
                <p className="text-xs text-slate-400 mt-1">{content.tagline}</p>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-white">Central Warehouse &amp; Registered Office:</span>
                    <span>
                      {content.address}, {content.city}, {content.state} - {content.pincode}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-white">Wholesale Desk:</span>
                    <span>{content.phone}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-white">Distribution Desk:</span>
                    <span>{content.email}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-white">Operational Hours:</span>
                    <span>{content.workingHours}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-[#0E122A] p-6 sm:p-8">
              <h3 className="text-lg font-bold text-white mb-4">Send a General Corporate Message</h3>

              {contactFeedback && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                    contactFeedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {contactFeedback.message}
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rajesh@company.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Supply Agreement Inquiry"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Message Content *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:border-[#5428E8] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-3 text-xs font-bold text-white shadow-lg hover:opacity-95 transition disabled:opacity-50"
                >
                  {contactSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ENTERPRISE FOOTER
          ========================================================================= */}
      <footer className="border-t border-white/10 bg-[#080B1A] pt-16 pb-12 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#5428E8] to-[#8055F7] text-white">
                  <Smartphone className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-sm text-white tracking-tight">SALMAN ENTERPRISES</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Authorized B2B distributor of smartphones, accessories, and electronics to retail dealers, enterprise networks, and showroom partners nationwide.
              </p>
              <p className="text-[11px] text-slate-500">
                GSTIN: <span className="font-mono text-slate-300">29AAACA1234A1Z5</span> • State Intra-Supply Code: 29
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Products</h4>
              <ul className="space-y-2">
                <li><a href="#categories" className="hover:text-white transition">Smartphones</a></li>
                <li><a href="#categories" className="hover:text-white transition">Tablets &amp; Displays</a></li>
                <li><a href="#categories" className="hover:text-white transition">Smartwatches</a></li>
                <li><a href="#categories" className="hover:text-white transition">GaN Fast Chargers</a></li>
                <li><a href="#categories" className="hover:text-white transition">Wireless Audio</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Business</h4>
              <ul className="space-y-2">
                <li><a href="#partnership" className="hover:text-white transition">Become a Retailer</a></li>
                <li><a href="#calculator" className="hover:text-white transition">ROI Calculator</a></li>
                <li><a href="#network" className="hover:text-white transition">Distribution Network</a></li>
                <li><Link href="/login" className="hover:text-white transition">Retailer Portal Login</Link></li>
                <li><a href="#contact" className="hover:text-white transition">Corporate Contact</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Compliance</h4>
              <ul className="space-y-2">
                <li><span className="text-slate-500">Rule 46 CGST Billing</span></li>
                <li><span className="text-slate-500">Dual IMEI Tracking Policy</span></li>
                <li><span className="text-slate-500">Manufacturer Warranty</span></li>
                <li><span className="text-slate-500">Privacy &amp; Terms</span></li>
                <li><span className="text-slate-500">Zero Gray-Market Sourcing</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>&copy; {new Date().getFullYear()} {content.companyName}. All rights reserved.</p>
            <p>Integrated within SmartAttendance Pro Enterprise Technology Ecosystem.</p>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          PRODUCT SPECIFICATIONS & WHOLESALE SHEET MODAL
          ========================================================================= */}
      {selectedSpecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-[#0E122A] border border-white/15 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-0.5 text-[10px] font-mono font-bold">
                  {selectedSpecModal.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {selectedSpecModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSpecModal(null)}
                className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Spec Sheet Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Processor / Architecture
                </span>
                <span className="font-semibold text-white">{selectedSpecModal.chipset}</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Display / Acoustics
                </span>
                <span className="font-semibold text-white">{selectedSpecModal.displayOrAcoustics}</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Optics / Ports / Sensors
                </span>
                <span className="font-semibold text-white">{selectedSpecModal.cameraOrPorts}</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Battery &amp; Charging SLA
                </span>
                <span className="font-semibold text-white">{selectedSpecModal.batteryOrPower}</span>
              </div>
            </div>

            {/* Commercial Pricing Strip */}
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/40 p-4 grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Wholesale Unit Price</span>
                <span className="font-mono text-base font-black text-white">
                  ₹{selectedSpecModal.wholesalePrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Recommended MSRP</span>
                <span className="font-mono text-base font-black text-indigo-300">
                  ₹{selectedSpecModal.retailMSRP.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Dealer Gross Margin</span>
                <span className="font-mono text-base font-black text-emerald-400">
                  {selectedSpecModal.marginPercent}%
                </span>
              </div>
            </div>

            {/* Additional Terms */}
            <div className="space-y-2 text-xs divide-y divide-white/10 text-slate-300">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">HSN &amp; Tax:</span>
                <span className="font-mono font-semibold text-white">{selectedSpecModal.hsnCode} ({selectedSpecModal.gstRate})</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Minimum Order Qty (MOQ):</span>
                <span className="font-semibold text-white">{selectedSpecModal.moq}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Warehousing Availability:</span>
                <span className="font-semibold text-emerald-300">{selectedSpecModal.inStockHubs}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Manufacturer Warranty:</span>
                <span className="font-semibold text-white">{selectedSpecModal.warranty}</span>
              </div>
              <div className="py-1.5">
                <span className="text-slate-400 block mb-0.5">Commercial Package Contents:</span>
                <span className="text-[11px] text-slate-300">{selectedSpecModal.boxContents}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSpecModal(null)}
                className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
              >
                Close Sheet
              </button>
              <button
                type="button"
                onClick={() => prefillCategoryInquiry(selectedSpecModal.id)}
                className="flex-1 rounded-2xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-3 text-xs font-bold text-white shadow-lg hover:opacity-95 transition"
              >
                Book Wholesale Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MOBILE STICKY ACTION STRIP (Visible only on < 640px)
          ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-[#0E122A]/95 border-t border-white/10 backdrop-blur-md p-2.5 flex items-center justify-between gap-2 shadow-2xl">
        <Link
          href="/catalog"
          className="flex-1 rounded-xl bg-indigo-500/20 border border-indigo-500/40 py-2.5 text-center text-[11px] font-bold text-indigo-300"
        >
          Catalog
        </Link>
        <a
          href="#partnership"
          className="flex-1 rounded-xl bg-gradient-to-r from-[#5428E8] to-[#8055F7] py-2.5 text-center text-[11px] font-bold text-white shadow-md"
        >
          Become Retailer
        </a>
        <Link
          href="/login"
          className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-[11px] font-bold text-slate-200"
        >
          Portal Login
        </Link>
      </div>

      {/* Quick Catalog Search Drawer Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-20 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl bg-[#0E122A] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white">
                <Search className="h-4 w-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Search Commercial Catalog</h3>
              </div>
              <button onClick={() => setSearchOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search by brand (e.g. Samsung, Apple, Xiaomi), model, or HSN code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#5428E8] focus:outline-none"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Suggested Product Lines</p>
              {productCategories
                .filter((c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      const spec = CATEGORY_SPECS[cat.id];
                      if (spec) setSelectedSpecModal(spec);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs transition text-left"
                  >
                    <span className="font-semibold text-white">{cat.title}</span>
                    <span className="text-[10px] text-indigo-300 font-mono">{cat.badge}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
