/**
 * Authentication Service
 * Manages JWT tokens, user sessions, and API authentication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

class AuthService {
  // localStorage key for token (not authoritative for browser flows).
  // The server now sets a secure httpOnly cookie named `access_token`.
  private tokenKey = "access_token";
  private userKey = "nargis_user";

  /**
   * Store authentication token
   */
  setToken(token: string): void {
    if (typeof window !== "undefined") {
      // Keep a local copy for non-browser API consumers or to support legacy flows.
      localStorage.setItem(this.tokenKey, token);
    }
  }

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  /**
   * Remove authentication token
   */
  removeToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }

  /**
   * Store user data
   */
  setUser(user: User): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  /**
   * Get stored user data
   */
  getUser(): User | null {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem(this.userKey);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<User> {
    const response = await fetch(`${API_URL}/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      // Ensure browser accepts server-set httpOnly cookie on cross-origin requests
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }

    const tokens: AuthTokens = await response.json();
    // Server sets httpOnly cookie; keep token locally only for non-browser uses.
    this.setToken(tokens.access_token);

    // Fetch user profile
    const user = await this.getProfile();
    if (!user) {
      // This should not normally happen after registration; treat as fatal.
      throw new Error("Failed to retrieve profile after registration");
    }
    this.setUser(user);

    return user;
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await fetch(`${API_URL}/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      // Ensure browser accepts server-set httpOnly cookie on cross-origin requests
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const tokens: AuthTokens = await response.json();
    // Server sets httpOnly cookie; keep token locally only for non-browser uses.
    this.setToken(tokens.access_token);

    // Fetch user profile
    const user = await this.getProfile();
    if (!user) {
      throw new Error("Failed to retrieve profile after login");
    }
    this.setUser(user);

    return user;
  }

  /**
   * Logout user
   */
  logout(): void {
    // Call server logout to clear httpOnly cookie, then clear local storage.
    (async () => {
      try {
        await fetch(`${API_URL}/v1/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        /* ignore */
      }
      this.removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    })();
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User | null> {
    // Try local token first (legacy). If absent, rely on cookie being sent.
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/v1/auth/me`, {
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Treat 401 as unauthenticated (optional enrichment). Do not throw
        // as callers should handle absence of a user without disabling AI.
        this.removeToken();
        return null;
      }
      throw new Error("Failed to fetch profile");
    }

    return (await response.json()) as User;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: {
    name?: string;
    email?: string;
  }): Promise<User> {
    const token = this.getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/v1/auth/me`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Update failed");
    }

    const user = await response.json();
    this.setUser(user);

    return user;
  }

  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    if (!token) {
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Fetch with automatic authentication
   */
  async authenticatedFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    // If we have a local token, include it; otherwise rely on cookie.
    const token = this.getToken();
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    // Handle authentication errors: clear local token but do NOT perform a
    // hard redirect. Authentication is optional for ephemeral AI flows and
    // should not block streaming or UI availability.
    if (response.status === 401 || response.status === 403) {
      this.removeToken();
      throw new Error("Authentication required");
    }

    return response;
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export API URL for other services
export { API_URL };
