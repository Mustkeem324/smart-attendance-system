import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { UploadedProfilePhoto, UserAvatar } from '@/models/electronics-sales';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{4,64}$/;
const SAFE_FILE_REGEX = /^[a-zA-Z0-9._-]{4,120}$/;

export function sanitizeFolderId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  return SAFE_ID_REGEX.test(trimmed) ? trimmed : null;
}

export function sanitizeFilename(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) return null;
  return SAFE_FILE_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Validates actual binary image magic bytes (JPEG, PNG, WebP) so spoofed files cannot be uploaded.
 */
export function detectImageType(buffer: Buffer): { ext: string; mimeType: string } | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mimeType: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ext: '.png', mimeType: 'image/png' };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: '.webp', mimeType: 'image/webp' };
  }

  return null;
}

/**
 * Persists an uploaded profile photo inside a folder named by the employee or user ID.
 * Writes directly to public/uploads/profiles/<ownerId>/ on writable filesystems and
 * stores an immutable copy in MongoDB so uploads also work on read-only serverless hosts.
 */
export async function saveProfilePhotoAsset(params: {
  ownerId: string;
  ownerType: 'employee' | 'user';
  organizationId?: string;
  uploadedByUserId?: string;
  buffer: Buffer;
  mimeType: string;
  ext: string;
}) {
  const safeFolder = sanitizeFolderId(params.ownerId);
  if (!safeFolder) {
    throw new Error('Invalid employee or user ID folder identifier.');
  }

  const filename = `photo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${params.ext}`;
  const storagePath = `uploads/profiles/${safeFolder}/${filename}`;
  const url = `/api/uploads/profiles/${safeFolder}/${filename}`;

  let persistedToDisk = false;
  let persistedToDb = false;

  // 1. Store inside <cwd>/public/uploads/profiles/<ownerId>/ when disk is writable
  try {
    const folderDir = path.join(process.cwd(), 'public', 'uploads', 'profiles', safeFolder);
    if (!fs.existsSync(folderDir)) {
      fs.mkdirSync(folderDir, { recursive: true });
    }
    fs.writeFileSync(path.join(folderDir, filename), params.buffer);
    persistedToDisk = true;
  } catch {
    // Expected on read-only serverless filesystems (e.g., Vercel /var/task)
  }

  // 2. Store asset in MongoDB so serverless environments serve the exact folder route reliably
  try {
    await connectToDatabase();
    await UploadedProfilePhoto.create({
      folder: safeFolder,
      ownerType: params.ownerType,
      filename,
      storagePath,
      mimeType: params.mimeType,
      size: params.buffer.length,
      data: params.buffer,
      organizationId: params.organizationId,
      uploadedByUserId: params.uploadedByUserId,
    });
    persistedToDb = true;
  } catch (err) {
    console.error('Mongo photo storage fallback error:', err);
  }

  if (!persistedToDisk && !persistedToDb) {
    throw new Error('Unable to persist uploaded photo to storage.');
  }

  return {
    url,
    folder: safeFolder,
    ownerType: params.ownerType,
    storagePath,
    fileName: filename,
    size: params.buffer.length,
    mimeType: params.mimeType,
  };
}

/**
 * Retrieves an uploaded profile photo from the <ownerId> disk folder or MongoDB asset collection.
 */
export async function loadProfilePhotoAsset(
  rawOwnerId: string,
  rawFilename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const folder = sanitizeFolderId(rawOwnerId);
  const filename = sanitizeFilename(rawFilename);
  if (!folder || !filename) return null;

  const diskPath = path.join(process.cwd(), 'public', 'uploads', 'profiles', folder, filename);
  if (fs.existsSync(diskPath)) {
    const buffer = fs.readFileSync(diskPath);
    const ext = path.extname(filename).toLowerCase();
    const mimeType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { buffer, mimeType };
  }

  try {
    await connectToDatabase();
    const doc = await UploadedProfilePhoto.findOne({ folder, filename }).lean();
    if (doc && doc.data) {
      const rawBuf = Buffer.isBuffer(doc.data)
        ? doc.data
        : Buffer.from((doc.data as any).buffer || doc.data);
      return {
        buffer: rawBuf,
        mimeType: doc.mimeType || 'image/jpeg',
      };
    }
  } catch (err) {
    console.error('Load photo from DB error:', err);
  }

  return null;
}

/**
 * Copies a pre-creation upload into the newly created employee's own ID folder.
 */
export async function relocatePhotoToEmployeeFolder(
  photoUrl: string | undefined | null,
  employeeId: string,
  organizationId: string,
  uploadedByUserId: string
): Promise<string | null> {
  if (!photoUrl) return null;
  const match = photoUrl.match(/^\/api\/uploads\/profiles\/([a-zA-Z0-9_-]{4,64})\/([a-zA-Z0-9._-]+)$/);
  if (!match) return photoUrl;

  const [, currentFolder, currentFilename] = match;
  if (currentFolder === employeeId) return photoUrl;

  const asset = await loadProfilePhotoAsset(currentFolder, currentFilename);
  if (!asset) return photoUrl;

  const detected = detectImageType(asset.buffer);
  const ext = detected?.ext || path.extname(currentFilename) || '.jpg';
  const mimeType = detected?.mimeType || asset.mimeType || 'image/jpeg';

  const saved = await saveProfilePhotoAsset({
    ownerId: employeeId,
    ownerType: 'employee',
    organizationId,
    uploadedByUserId,
    buffer: asset.buffer,
    mimeType,
    ext,
  });

  return saved.url;
}

/**
 * Resolves the effective profile photo for any signed-in user (employee column first, then UserAvatar).
 */
export async function resolveUserAvatar(
  userId: string,
  employeeProfilePhoto?: string | null
): Promise<string | null> {
  if (employeeProfilePhoto) return employeeProfilePhoto;

  try {
    await connectToDatabase();
    const doc = await UserAvatar.findOne({ userId }).select('profilePhoto').lean();
    return doc?.profilePhoto || null;
  } catch {
    return null;
  }
}
