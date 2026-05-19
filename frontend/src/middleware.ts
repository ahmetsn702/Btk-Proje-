import { NextResponse, type NextRequest } from 'next/server';

type JwtPayload = {
  role?: string;
  user?: {
    role?: string;
  };
};

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

function getToken(request: NextRequest) {
  return (
    request.cookies.get('accessToken')?.value ??
    request.cookies.get('token')?.value ??
    request.cookies.get('Authorization')?.value?.replace(/^Bearer\s+/i, '') ??
    null
  );
}

function getRoleFromToken(token: string): string | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const data = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
    return data.role ?? data.user?.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = getToken(request);

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = getRoleFromToken(token);
  if (role === 'USER') {
    return NextResponse.redirect(new URL('/products', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [],
};
