// ── Types ──────────────────────────────────────────────

export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export interface CreateUserPayload {
    name: string;
    email: string;
    password: string;
}

interface ApiResponse<T = undefined> {
    success: boolean;
    message: string;
    data?: T;
}

// ── Helpers ────────────────────────────────────────────

const BASE = '/api/v1';

async function request<T>(
    url: string,
    options?: RequestInit,
): Promise<ApiResponse<T>> {
    const res = await fetch(`${BASE}${url}`, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        ...options,
    });

    const body: ApiResponse<T> = await res.json();

    if (!res.ok || !body.success) {
        throw new Error(body.message ?? `Request failed (${res.status})`);
    }

    return body;
}

// ── API Functions ──────────────────────────────────────

export async function getUsers(): Promise<User[]> {
    const res = await request<User[]>('/users');
    return res.data ?? [];
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
    const res = await request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return res.data!;
}

export async function deleteUser(id: number): Promise<void> {
    await request(`/users/${id}`, { method: 'DELETE' });
}
