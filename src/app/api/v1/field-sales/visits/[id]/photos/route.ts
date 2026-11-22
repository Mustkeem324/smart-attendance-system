export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { ShopVisit } from '@/models/electronics-sales';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { id } = params;
    const body = await req.json();

    const {
      shopFrontPhoto,
      shopInteractionPhoto,
    } = body;

    if (!shopFrontPhoto && !shopInteractionPhoto) {
      return apiError('At least one photograph (shop front or shopkeeper interaction) is required', 400);
    }

    const visit = await ShopVisit.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { visitId: id }],
    });

    if (!visit) {
      return apiError('Shop visit not found', 404);
    }

    const now = new Date();

    // Process Photo 1: Shop Front
    if (shopFrontPhoto) {
      if (!shopFrontPhoto.photoUrl) {
        return apiError('Shop front photograph data/URL is required', 400);
      }

      const fileId = shopFrontPhoto.fileId || `IMG-FRONT-${Date.now()}`;
      visit.shopFrontPhoto = {
        fileId,
        photoUrl: shopFrontPhoto.photoUrl,
        storageReference: shopFrontPhoto.storageReference || `visits/${visit.visitId || visit._id}/front.jpg`,
        mimeType: shopFrontPhoto.mimeType || 'image/jpeg',
        fileSize: shopFrontPhoto.fileSize || 184500,
        capturedAt: shopFrontPhoto.capturedAt ? new Date(shopFrontPhoto.capturedAt) : now,
        captureMethod: shopFrontPhoto.captureMethod || 'LIVE_CAMERA',
        verificationStatus: 'VERIFIED',
      };
    }

    // Process Photo 2: Shopkeeper / Interaction
    if (shopInteractionPhoto) {
      const fileId = shopInteractionPhoto.fileId || `IMG-INTERACT-${Date.now()}`;
      visit.shopInteractionPhoto = {
        fileId,
        photoUrl: shopInteractionPhoto.photoUrl || '',
        storageReference: shopInteractionPhoto.storageReference || `visits/${visit.visitId || visit._id}/interaction.jpg`,
        mimeType: shopInteractionPhoto.mimeType || 'image/jpeg',
        fileSize: shopInteractionPhoto.fileSize || 172000,
        capturedAt: shopInteractionPhoto.capturedAt ? new Date(shopInteractionPhoto.capturedAt) : now,
        captureMethod: shopInteractionPhoto.captureMethod || 'LIVE_CAMERA',
        verificationStatus: shopInteractionPhoto.interactionConsentGiven === false ? 'FLAGGED' : 'VERIFIED',
        interactionConsentGiven: shopInteractionPhoto.interactionConsentGiven !== false,
        declinedReason: shopInteractionPhoto.declinedReason || undefined,
      };
    }

    // Maintain backwards compatibility with photos array
    visit.photos = [];
    if (visit.shopFrontPhoto?.photoUrl) {
      visit.photos.push({
        photoUrl: visit.shopFrontPhoto.photoUrl,
        category: 'EXTERIOR',
        caption: 'Storefront and physical retail signage',
        timestamp: visit.shopFrontPhoto.capturedAt || now,
      });
    }
    if (visit.shopInteractionPhoto?.photoUrl) {
      visit.photos.push({
        photoUrl: visit.shopInteractionPhoto.photoUrl,
        category: 'DISPLAY_COUNTER',
        caption: 'Shopkeeper and in-store business interaction evidence',
        timestamp: visit.shopInteractionPhoto.capturedAt || now,
      });
    }

    await visit.save();

    return apiSuccess({
      visitId: visit.visitId || visit._id,
      shopFrontPhoto: visit.shopFrontPhoto,
      shopInteractionPhoto: visit.shopInteractionPhoto,
      hasBothPhotos: Boolean(
        visit.shopFrontPhoto?.photoUrl &&
        (visit.shopInteractionPhoto?.photoUrl || visit.shopInteractionPhoto?.declinedReason)
      ),
      updatedAt: now,
    });
  } catch (err: any) {
    console.error('Visit Photos POST Error:', err);
    return apiError(err.message || 'Failed to save visit photographs', 500);
  }
}
