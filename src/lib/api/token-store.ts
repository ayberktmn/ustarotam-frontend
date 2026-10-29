let accessToken: string | null = null;
let sessionController = new AbortController();
let signedOut = false;

export function getSessionSignal(): AbortSignal {
  return sessionController.signal;
}

export function isSignedOut(): boolean {
  return signedOut;
}

export function beginSession(): void {
  signedOut = false;
}

export function endSession(): void {
  signedOut = true;
  accessToken = null;
  sessionController.abort();
  sessionController = new AbortController();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
