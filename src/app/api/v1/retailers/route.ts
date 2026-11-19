import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Retailer } from '@/models/electronics-sales';
import { authenticateApi, apiSuccess, apiError, logDistributionAction } from '@/lib/distribution-helper';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const city = searchParams.get('city');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status && status !== 'ALL') filter.status = status;
    if (city && city !== 'ALL') filter.city = city;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { dealerCode: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, retailers] = await Promise.all([
      Retailer.countDocuments(filter),
      Retailer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return apiSuccess(retailers, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('V1 Retailers GET Error:', err);
    return apiError(err.message || 'Failed to fetch retailers', 500);
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES_MANAGER']);
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
      city,
      state = 'Karnataka',
      area,
      pincode,
      latitude = 12.9716,
      longitude = 77.5946,
      shopCategory = 'MOBILE_RETAIL',
      gstin,
      creditLimit = 100000,
      paymentTerms = 'Net 15 Days',
      assignedEmployeeId,
    } = body;

    if (!name || !ownerName || !phone || !address || !city || !area || !pincode) {
      return apiError('Name, ownerName, phone, address, city, area and pincode are required', 400);
    }

    // Auto-generate unique dealer code: APX-RET-XXXX
    const count = await Retailer.countDocuments();
    const dealerCode = body.dealerCode || `APX-DLR-${(count + 101).toString()}`;

    const retailer = await Retailer.create({
      name: name.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      altPhone,
      email: email ? email.toLowerCase().trim() : undefined,
      address: address.trim(),
      city: city.trim(),
      state,
      area: area.trim(),
      pincode: pincode.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      geofenceRadiusMeters: 100,
      shopCategory,
      gstin: gstin ? gstin.toUpperCase().trim() : undefined,
      dealerCode,
      assignedEmployeeId,
      creditLimit: Number(creditLimit),
      paymentTerms,
      status: 'ACTIVE',
      outstandingBalance: 0,
    });

    await logDistributionAction({
      action: 'RETAILER_REGISTERED',
      userId: user.id,
      entityType: 'Retailer',
      entityId: retailer._id.toString(),
      details: { name: retailer.name, dealerCode: retailer.dealerCode, creditLimit: retailer.creditLimit },
      req,
    });

    return apiSuccess(retailer, undefined, 201);
  } catch (err: any) {
    console.error('V1 Retailers POST Error:', err);
    return apiError(err.message || 'Failed to register retailer', 500);
  }
}
