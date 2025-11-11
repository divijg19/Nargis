/**
 * Authentication Service
 * Manages JWT tokens, user sessions, and API authentication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    private tokenKey = 'nargis_auth_token';
    private userKey = 'nargis_user';

    /**
     * Store authentication token
     */
    setToken(token: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.tokenKey, token);
        }
    }

    /**
     * Get stored authentication token
     */
    getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(this.tokenKey);
        }
        return null;
    }

    /**
     * Remove authentication token
     */
    removeToken(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
        }
    }

    /**
     * Store user data
     */
    setUser(user: User): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.userKey, JSON.stringify(user));
        }
    }

    /**
     * Get stored user data
     */
    getUser(): User | null {
        if (typeof window !== 'undefined') {
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
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }

        const tokens: AuthTokens = await response.json();
        this.setToken(tokens.access_token);

        // Fetch user profile
        const user = await this.getProfile();
        this.setUser(user);

        return user;
    }

    /**
     * Login user
     */
    async login(credentials: LoginCredentials): Promise<User> {
        const response = await fetch(`${API_URL}/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const tokens: AuthTokens = await response.json();
        this.setToken(tokens.access_token);

        // Fetch user profile
        const user = await this.getProfile();
        this.setUser(user);

        return user;
    }

    /**
     * Logout user
     */
    logout(): void {
        this.removeToken();
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    }

    /**
     * Get current user profile
     */
    async getProfile(): Promise<User> {
        const token = this.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/v1/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.removeToken();
                throw new Error('Session expired');
            }
            throw new Error('Failed to fetch profile');
        }

        return await response.json();
    }

    /**
     * Update user profile
     */
    async updateProfile(updates: { name?: string; email?: string }): Promise<User> {
        const token = this.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/v1/auth/me`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Update failed');
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
            'Authorization': `Bearer ${token}`,
        };
    }

    /**
     * Fetch with automatic authentication
     */
    async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
        const token = this.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
            this.removeToken();
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
            throw new Error('Authentication required');
        }

        return response;
    }
}

// Export singleton instance
export const authService = new AuthService();

// Export API URL for other services
export { API_URL };
