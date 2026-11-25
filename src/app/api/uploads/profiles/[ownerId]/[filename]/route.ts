export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { loadProfilePhotoAsset } from '@/lib/profile-photo-storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: { ownerId: string; filename: string } }
) {
  try {
    const asset = await loadProfilePhotoAsset(params.ownerId, params.filename);
    if (!asset) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(asset.buffer), {
      status: 200,
      headers: {
        'Content-Type': asset.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Serve profile photo error:', error);
    return NextResponse.json({ error: 'Unable to load photo' }, { status: 500 });
  }
}
