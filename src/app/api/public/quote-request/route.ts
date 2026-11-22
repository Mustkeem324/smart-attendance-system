export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { QuoteRequest } from '@/models/electronics-sales';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getAuthSession(req);

    const body = await req.json();
    const {
      businessName,
      contactPerson,
      phone,
      email,
      items,
      preferredDeliveryLocation,
      city,
      state,
      pincode,
      additionalMessage,
    } = body;

    // Validation
    if (!businessName || !businessName.trim()) {
      return NextResponse.json({ success: false, error: 'Business name is required' }, { status: 400 });
    }
    if (!contactPerson || !contactPerson.trim()) {
      return NextResponse.json({ success: false, error: 'Contact person name is required' }, { status: 400 });
    }
    if (!phone || !phone.trim() || phone.trim().length < 8) {
      return NextResponse.json({ success: false, error: 'Valid phone number is required' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one product item is required for quotation' },
        { status: 400 }
      );
    }

    const validatedItems = items.map((item: any) => ({
      productId: item.productId || undefined,
      productName: item.productName || 'Electronic Hardware Item',
      brand: item.brand || 'General',
      modelName: item.modelName || 'Standard Model',
      variant: item.variant || undefined,
      quantity: Math.max(1, Number(item.quantity) || 1),
      targetPrice: item.targetPrice ? Number(item.targetPrice) : undefined,
    }));

    // Generate unique inquiry number QUO-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countThisMonth = await QuoteRequest.countDocuments({
      quoteNumber: { $regex: `^QUO-${yearMonth}-` },
    });
    const quoteNumber = `QUO-${yearMonth}-${String(countThisMonth + 1).padStart(4, '0')}`;

    const newQuote = await QuoteRequest.create({
      quoteNumber,
      businessName: businessName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      retailerId: session?.employee?.id ? undefined : undefined,
      items: validatedItems,
      preferredDeliveryLocation: (preferredDeliveryLocation || city || 'Registered Address').trim(),
      city: (city || 'Bangalore').trim(),
      state: (state || 'Karnataka').trim(),
      pincode: pincode?.trim() || undefined,
      additionalMessage: additionalMessage?.trim() || undefined,
      status: 'PENDING',
    });

    return NextResponse.json({
      success: true,
      quoteNumber: newQuote.quoteNumber,
      message: `Quotation request ${newQuote.quoteNumber} logged successfully. Our regional wholesale distribution desk will transmit formal pricing and allocation availability within 2 business hours.`,
      inquiry: {
        id: newQuote._id.toString(),
        quoteNumber: newQuote.quoteNumber,
        businessName: newQuote.businessName,
        itemCount: newQuote.items.length,
        status: newQuote.status,
        createdAt: newQuote.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating quote request:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit quotation request' },
      { status: 500 }
    );
  }
}
