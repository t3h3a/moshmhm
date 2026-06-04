export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  points: number;
  walletBalance: number;
  rank: string;
  isVerified: boolean;
  isBanned: boolean;
  gender?: "male" | "female";
  createdAt?: string;
  twoFactorEnabled?: boolean;
  twoFactorRequired?: boolean;
  twoFactorVerifiedAt?: string | null;
}

export const AUTH_EVENT = "grove-auth-change";

export function getUser(): User | null {
  try {
    const token = getToken();
    if (!token || !isValidStoredToken(token)) {
      clearStoredAuth();
      return null;
    }

    const s = localStorage.getItem("grove_user");
    const stored = s ? JSON.parse(s) : null;

    // Ensure token actually belongs to the stored user to avoid frontend/server mismatch
    try {
      const parts = token.split(".");
      const tokenUserId = parts.length >= 1 ? Number(parts[0]) : NaN;
      if (stored && Number.isInteger(tokenUserId) && stored.id !== tokenUserId) {
        // token/user mismatch -> clear cached auth
        clearStoredAuth();
        return null;
      }
    } catch {
      clearStoredAuth();
      return null;
    }

    return stored;
  } catch {
    clearStoredAuth();
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem("grove_token");
}

export function setUser(user: User | any, token?: string) {
  localStorage.setItem("grove_user", JSON.stringify(user));
  if (token) localStorage.setItem("grove_token", token);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: user }));
}

export function clearUser() {
  clearStoredAuth();
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

function clearStoredAuth() {
  localStorage.removeItem("grove_user");
  localStorage.removeItem("grove_token");
}

function isValidStoredToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [userId, issuedAt, nonce, signature] = parts;
  return Boolean(
    /^\d+$/.test(userId) &&
    /^\d+$/.test(issuedAt) &&
    nonce &&
    /^[a-f0-9]{64}$/i.test(signature)
  );
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === "admin" || user?.role === "owner";
}

export function isOwner(): boolean {
  const user = getUser();
  return user?.role === "owner";
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}
