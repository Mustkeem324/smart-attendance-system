export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateTokens } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { connectToDatabase } from '@/lib/mongodb';
import { Retailer, DistributionNotification, RetailerInquiry } from '@/models/electronics-sales';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      businessName,
      email,
      phone,
      password,
      role = 'RETAILER',
      city,
      state,
      gstin,
    } = body;

    // 1. Mandatory Fields Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, email address, and password are required.' },
        { status: 400 }
      );
    }

    // 2. Email Validation
    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid corporate or business email address.' },
        { status: 400 }
      );
    }

    // 3. Mobile Number Validation
    const cleanPhone = phone ? phone.trim().replace(/[\s-]/g, '') : null;
    if (cleanPhone && cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Mobile number must be at least 10 digits.' },
        { status: 400 }
      );
    }

    // 4. Password Strength Validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // 5. Duplicate Email Check (PostgreSQL)
    const existingUser = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please log in.' },
        { status: 409 }
      );
    }

    // 6. Organization Lookup
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Salman Enterprises Distribution Ltd.',
          code: 'SE-DIST-01',
          slug: 'salman-enterprises',
          email: 'contact@salmanenterprises.in',
        },
      });
    }

    // 7. Role Mapping
    let mappedRole: Role = Role.RETAILER;
    const rUpper = (role || '').toUpperCase();
    if (rUpper === 'DISTRIBUTOR') mappedRole = Role.DISTRIBUTOR;
    else if (rUpper === 'SALES_MANAGER' || rUpper === 'SALES_EXECUTIVE') mappedRole = Role.SALES_MANAGER;
    else if (rUpper === 'FIELD_SALES_REP') mappedRole = Role.FIELD_SALES_REP;
    else if (rUpper === 'COMPANY_ADMIN' || rUpper === 'ADMIN') mappedRole = Role.COMPANY_ADMIN;
    else mappedRole = Role.RETAILER;

    // 8. Hash Password
    const passwordHash = await hashPassword(password);

    // 9. Create User in PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
        role: mappedRole,
        isActive: true,
      },
    });

    // 10. Persist Retailer/Business in MongoDB Atlas
    let mongoRetailerId: string | null = null;
    try {
      await connectToDatabase();
      const splitNames = name.trim().split(' ');
      const firstName = splitNames[0] || name;
      const lastName = splitNames.slice(1).join(' ') || '';

      if (mappedRole === Role.RETAILER || mappedRole === Role.DISTRIBUTOR) {
        const retailerDoc = await Retailer.create({
          dealerCode: `RET-${Date.now().toString().slice(-6)}`,
          name: businessName || `${name}'s Electronics`,
          ownerName: name,
          phone: cleanPhone || '9876543210',
          email: cleanEmail,
          gstin: gstin || undefined,
          address: `${city || 'Bangalore'} Electronics Market`,
          area: 'Commercial Hub',
          city: city || 'Bangalore',
          state: state || 'Karnataka',
          pincode: '560001',
          latitude: 12.9716,
          longitude: 77.5946,
          status: 'ACTIVE',
          creditLimit: 250000,
          paymentTerms: '14 Days Net',
          outstandingBalance: 0,
        });
        mongoRetailerId = retailerDoc._id.toString();

        // Also track in RetailerInquiry
        await RetailerInquiry.create({
          inquiryNumber: `INQ-${Date.now().toString().slice(-6)}`,
          businessName: businessName || `${name}'s Electronics`,
          ownerName: name,
          phone: cleanPhone || '9876543210',
          email: cleanEmail,
          city: city || 'Bangalore',
          state: state || 'Karnataka',
          businessType: mappedRole,
          gstin: gstin || undefined,
          interestedCategories: ['SMARTPHONES', 'ACCESSORIES'],
          status: 'APPROVED',
          message: 'Direct portal retailer registration',
        });
      }

      // Log notification for Administrators
      await DistributionNotification.create({
        recipientRole: 'ALL',
        title: `New ${mappedRole} Registered`,
        message: `${name} (${cleanEmail}) registered as ${mappedRole} for ${businessName || 'Salman Enterprises Network'}.`,
        type: 'SYSTEM',
        link: '/distribution',
        isRead: false,
      });
    } catch (mErr) {
      console.error('MongoDB sync warning during user registration:', mErr);
    }

    // 11. Generate 30-Day Active JWT Session
    const { accessToken, refreshToken } = generateTokens({
      userId: newUser.id,
      organizationId: org.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Save refresh token
    await prisma.user.update({
      where: { id: newUser.id },
      data: {
        refreshToken,
        lastLoginAt: new Date(),
        lastLoginIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
      },
    });

    // 12. Audit Log
    await createAuditLog({
      organizationId: org.id,
      userId: newUser.id,
      action: 'USER_REGISTER',
      entity: 'User',
      entityId: newUser.id,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Browser',
    });

    // Determine target redirect route
    let redirectUrl = '/distribution';
    if (mappedRole === Role.RETAILER) {
      redirectUrl = '/catalog';
    } else if (mappedRole === Role.FIELD_SALES_REP) {
      redirectUrl = '/field-sales/mobile';
    }

    const response = NextResponse.json({
      success: true,
      message: 'Account successfully registered and verified.',
      token: accessToken,
      redirectUrl,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        mongoRetailerId,
        organization: {
          id: org.id,
          name: org.name,
          code: org.code,
        },
      },
    });

    // Set 30-Day HTTP-Only Cookie
    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
