export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: string; institutionId: string | null };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new ApiError('E-posta veya şifre hatalı.', 401);
    throw new ApiError('Sunucuya ulaşılamadı, lütfen tekrar deneyin.', res.status);
  }
  return res.json();
}
