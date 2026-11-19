import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { Retailer, ShopApplication } from '@/models/electronics-sales';
import { calculateHaversineDistanceMeters } from '@/lib/geo';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      ownerName,
      phone,
      altPhone,
      email,
      address,
      locality,
      city,
      state = 'Karnataka',
      pincode,
      gstin,
      shopCategory = 'MOBILE_RETAIL',
      businessType = 'Retailer',
      latitude,
      longitude,
      remarks,
      forceSubmitReview = false,
    } = body;

    // Validation
    if (!name || !name.trim()) return apiError('Shop Name is required', 400);
    if (!ownerName || !ownerName.trim()) return apiError('Owner Name is required', 400);
    if (!phone || !phone.trim()) return apiError('Contact phone number is required', 400);
    if (!address || !address.trim()) return apiError('Shop address is required', 400);
    if (!city || !city.trim()) return apiError('City is required', 400);
    if (!pincode || !pincode.trim()) return apiError('PIN code is required', 400);
    if (latitude === undefined || longitude === undefined) {
      return apiError('GPS latitude and longitude are required to register shop location', 400);
    }

    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    const cleanGstin = gstin?.trim();

    // 1. Comprehensive Duplicate Checks
    // Check A: Phone match (Exact duplicate)
    const phoneDuplicate = await Retailer.findOne({ phone: cleanPhone }).lean();
    if (phoneDuplicate && !forceSubmitReview) {
      return apiError(
        `A retailer with phone number "${cleanPhone}" already exists: "${phoneDuplicate.name}" (Code: ${phoneDuplicate.dealerCode}).`,
        409,
        {
          duplicateType: 'EXACT_PHONE_MATCH',
          matchingShop: phoneDuplicate,
        }
      );
    }

    // Check B: GSTIN match
    if (cleanGstin) {
      const gstinDuplicate = await Retailer.findOne({ gstin: cleanGstin }).lean();
      if (gstinDuplicate && !forceSubmitReview) {
        return apiError(
          `A retailer with GSTIN "${cleanGstin}" is already registered: "${gstinDuplicate.name}" (Code: ${gstinDuplicate.dealerCode}).`,
          409,
          {
            duplicateType: 'EXACT_GSTIN_MATCH',
            matchingShop: gstinDuplicate,
          }
        );
      }
    }

    // Check C: Proximity Check (within 50 meters of existing shop with similar name)
    const nearbyShops = await Retailer.find({
      latitude: { $gte: Number(latitude) - 0.005, $lte: Number(latitude) + 0.005 },
      longitude: { $gte: Number(longitude) - 0.005, $lte: Number(longitude) + 0.005 },
    }).lean();

    const proximityMatches = nearbyShops.filter((s: any) => {
      const dist = calculateHaversineDistanceMeters(Number(latitude), Number(longitude), s.latitude, s.longitude);
      return dist <= 50;
    });

    let duplicateStatus: 'VERIFIED' | 'PENDING_VERIFICATION' | 'DUPLICATE_REVIEW' = 'PENDING_VERIFICATION';
    let duplicateReasons: string[] = [];

    if (proximityMatches.length > 0) {
      duplicateStatus = 'DUPLICATE_REVIEW';
      duplicateReasons.push(`Another shop exists within 50m: "${proximityMatches[0].name}" (${proximityMatches[0].dealerCode})`);
    }

    // Check D: Name similarity in same city
    const sameCityName = await Retailer.findOne({
      city: { $regex: new RegExp(`^${city.trim()}$`, 'i') },
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
    }).lean();

    if (sameCityName) {
      duplicateStatus = 'DUPLICATE_REVIEW';
      duplicateReasons.push(`Similar shop name already registered in ${city}: "${sameCityName.name}" (${sameCityName.dealerCode})`);
    }

    // Generate unique Registration Reference & Dealer Code
    const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(0, 6);
    const countTotal = await Retailer.countDocuments();
    const registrationRef = `REG-SHOP-${todayCompact}-${String(countTotal + 1).padStart(4, '0')}`;
    const dealerCode = `DLR-${todayCompact.slice(2)}-${String(countTotal + 1).padStart(4, '0')}`;
    const googleMapsUrl = `https://www.google.com/maps?q=${Number(latitude).toFixed(6)},${Number(longitude).toFixed(6)}`;

    // Resolve employee
    let employeeId = user.id;
    let employeeName = user.name || 'Sales Representative';
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { employee: true },
    });
    if (dbUser?.employee) {
      employeeId = dbUser.employee.id;
      employeeName = `${dbUser.employee.firstName} ${dbUser.employee.lastName}`;
    }

    // Create Retailer record
    const retailer = await Retailer.create({
      name: cleanName,
      ownerName: ownerName.trim(),
      phone: cleanPhone,
      altPhone: altPhone?.trim(),
      email: email?.trim(),
      address: address.trim(),
      locality: locality?.trim() || address.trim(),
      area: locality?.trim() || city.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      geofenceRadiusMeters: 100,
      googleMapsUrl,
      shopCategory,
      businessType,
      gstin: cleanGstin,
      dealerCode,
      assignedEmployeeId: employeeId,
      registeredByEmployeeId: employeeId,
      registrationReference: registrationRef,
      creditLimit: 250000,
      paymentTerms: 'Net 15 Days',
      status: 'ACTIVE',
      verificationStatus: duplicateStatus,
      duplicateCheckResults: duplicateReasons.length > 0 ? duplicateReasons : undefined,
    });

    // Create ShopApplication for Admin Audit
    const application = await ShopApplication.create({
      applicationId: registrationRef,
      shopDetails: {
        name: cleanName,
        ownerName: ownerName.trim(),
        phone: cleanPhone,
        altPhone: altPhone?.trim(),
        email: email?.trim(),
        address: address.trim(),
        locality: locality?.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gstin: cleanGstin,
        shopCategory,
        businessType,
        latitude: Number(latitude),
        longitude: Number(longitude),
        googleMapsUrl,
        remarks: remarks?.trim(),
      },
      submittedByEmployeeId: employeeId,
      submittedByEmployeeName: employeeName,
      verificationStatus: duplicateStatus === 'DUPLICATE_REVIEW' ? 'DUPLICATE_REVIEW' : 'PENDING',
      duplicateCheckResults: duplicateReasons,
      createdRetailerId: retailer._id,
    });

    return apiSuccess(
      {
        shop: retailer,
        application,
        registrationReference: registrationRef,
        isDuplicateReview: duplicateStatus === 'DUPLICATE_REVIEW',
        duplicateReasons,
      },
      {
        message: duplicateStatus === 'DUPLICATE_REVIEW'
          ? 'New shop registered and submitted for administrator duplicate review.'
          : 'New shop successfully registered and linked to visit.',
      },
      201
    );
  } catch (err: any) {
    console.error('Shop Registration POST Error:', err);
    return apiError(err.message || 'Failed to register new shop', 500);
  }
}
