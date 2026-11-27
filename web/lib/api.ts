import type { AuthResponse, userlogin } from '../types';

type AuthMode = 'login' | 'signup';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (!isRecord(value) || !isRecord(value.user)) return false;

  return (
    typeof value.message === 'string' &&
    typeof value.token === 'string' &&
    typeof value.user.id === 'number' &&
    typeof value.user.name === 'string' &&
    typeof value.user.email === 'string' &&
    typeof value.user.role === 'string'
  );
}

function getErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.message === 'string') return value.message;
  if (!isRecord(value.errors)) return undefined;

  for (const fieldErrors of Object.values(value.errors)) {
    if (Array.isArray(fieldErrors)) {
      const firstMessage = fieldErrors.find((message): message is string => typeof message === 'string');
      if (firstMessage) return firstMessage;
    }
  }

  return undefined;
}

export async function authenticateUser(mode: AuthMode, credentials: userlogin): Promise<AuthResponse> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  const endpoint = mode === 'signup' ? 'register' : 'login';
  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new Error(`Authentication API returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(responseBody) ?? `Authentication failed (${response.status}).`);
  }

  if (!isAuthResponse(responseBody)) {
    throw new Error('Authentication API returned an unexpected response.');
  }

  return responseBody;
}