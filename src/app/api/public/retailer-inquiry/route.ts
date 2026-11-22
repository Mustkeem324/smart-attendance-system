export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RetailerInquiry } from '@/models/electronics-sales';

// In-memory rate limiting map (IP -> timestamps)
const rateLimitMap = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    const recent = timestamps.filter((t) => now - t < 10 * 60 * 1000); // 10 min window

    if (recent.length >= 8) {
      return NextResponse.json(
        { error: 'Too many partnership requests. Please try again in a few minutes.' },
        { status: 429 }
      );
    }
    recent.push(now);
    rateLimitMap.set(ip, recent);

    await connectToDatabase();
    const body = await req.json();

    const {
      businessName,
      ownerName,
      phone,
      email,
      city,
      state,
      businessType,
      gstin,
      interestedCategories,
      message,
    } = body;

    // Strict Validations
    if (!businessName || !String(businessName).trim()) {
      return NextResponse.json({ error: 'Business / Shop name is required.' }, { status: 400 });
    }
    if (!ownerName || !String(ownerName).trim()) {
      return NextResponse.json({ error: 'Owner or Proprietor name is required.' }, { status: 400 });
    }
    if (!phone || String(phone).trim().length < 10) {
      return NextResponse.json({ error: 'Valid 10-digit contact mobile number is required.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid business email address is required.' }, { status: 400 });
    }
    if (!city || !state) {
      return NextResponse.json({ error: 'City and State are required.' }, { status: 400 });
    }

    // Generate unique sequential inquiry ID: INQ-YYYYMM-XXXX
    const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(0, 6);
    const countThisMonth = await RetailerInquiry.countDocuments({
      inquiryNumber: { $regex: `^INQ-${todayCompact}` },
    });
    const inquiryNumber = `INQ-${todayCompact}-${String(countThisMonth + 1).padStart(4, '0')}`;

    const inquiry = await RetailerInquiry.create({
      inquiryNumber,
      businessName: String(businessName).trim(),
      ownerName: String(ownerName).trim(),
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      city: String(city).trim(),
      state: String(state).trim(),
      businessType: businessType || 'MOBILE_RETAILER',
      gstin: gstin ? String(gstin).trim().toUpperCase() : undefined,
      interestedCategories: Array.isArray(interestedCategories) ? interestedCategories : ['SMARTPHONES'],
      message: message ? String(message).trim() : undefined,
      status: 'NEW',
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      inquiryNumber: inquiry.inquiryNumber,
      message:
        'Thank you for your interest! Your retailer partnership application has been submitted successfully. Our regional distributor team will review your credentials and contact you within 24 business hours.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
