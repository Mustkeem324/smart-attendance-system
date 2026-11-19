import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ContactInquiry } from '@/models/electronics-sales';

// In-memory rate limiting map (IP -> timestamps)
const contactRateLimitMap = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const timestamps = contactRateLimitMap.get(ip) || [];
    const recent = timestamps.filter((t) => now - t < 10 * 60 * 1000); // 10 min window

    if (recent.length >= 8) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again shortly.' },
        { status: 429 }
      );
    }
    recent.push(now);
    contactRateLimitMap.set(ip, recent);

    await connectToDatabase();
    const body = await req.json();

    const { name, email, phone, subject, message } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }
    if (!subject || !String(subject).trim()) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }
    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    // Generate unique sequential inquiry ID: CNT-YYYYMM-XXXX
    const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(0, 6);
    const countThisMonth = await ContactInquiry.countDocuments({
      inquiryNumber: { $regex: `^CNT-${todayCompact}` },
    });
    const inquiryNumber = `CNT-${todayCompact}-${String(countThisMonth + 1).padStart(4, '0')}`;

    const inquiry = await ContactInquiry.create({
      inquiryNumber,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      subject: String(subject).trim(),
      message: String(message).trim(),
      status: 'NEW',
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      inquiryNumber: inquiry.inquiryNumber,
      message:
        'Your message has been received! Our corporate distribution desk will respond to your query shortly.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
