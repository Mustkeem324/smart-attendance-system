import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess } from '@/lib/distribution-helper';

export async function POST(req: NextRequest) {
  const response = apiSuccess({ message: 'Logged out successfully' });
  response.cookies.delete('auth_token');
  return response;
}
