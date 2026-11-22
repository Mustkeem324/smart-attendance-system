export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'employees');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Case 1: multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || '.jpg';
      const cleanExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : '.jpg';
      const filename = `emp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${cleanExt}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/employees/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        size: buffer.length,
        fileName: filename,
      });
    }

    // Case 2: JSON payload (base64 data URL or preset selection)
    const body = await req.json();
    const { base64Data, filename: originalName, presetUrl } = body;

    if (presetUrl) {
      return NextResponse.json({
        success: true,
        url: presetUrl,
      });
    }

    if (base64Data) {
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = '.jpg';

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('png')) ext = '.png';
        else if (mime.includes('webp')) ext = '.webp';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64Data, 'base64');
      }

      const filename = `emp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/employees/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        size: buffer.length,
        fileName: filename,
      });
    }

    return NextResponse.json({ error: 'Invalid upload request. File or base64Data required.' }, { status: 400 });
  } catch (error: any) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
