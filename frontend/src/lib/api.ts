/**
 * Centralized API client.
 *
 * Every HTTP call in the app goes through this file.  If the base URL, auth
 * header, or error-handling logic ever needs to change, there is exactly one
 * place to update.
 */

const API_BASE: string =
    import.meta.env.VITE_API_URL ?? "http://localhost:5500";

/* ─── payload / response types ─────────────────────────────────────────── */

export interface LoginPayload {
    email: string;
    password?: string;
    otp?: string;
}

export interface AuthTokenResponse {
    authtoken: string;
    user?: {
        _id: string;
        name: string;
        email: string;
        profilePic: string;
        isEmailVerified: boolean;
    };
}

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
}

export interface UpdateProfilePayload {
    name?: string;
    about?: string;
    profilePic?: string;
    oldpassword?: string;
    newpassword?: string;
}

export type NonFriendsSort = "name_asc" | "name_desc" | "last_seen_recent" | "last_seen_oldest";

export interface NonFriendsParams {
    search?: string;
    sort?: NonFriendsSort;
    page?: number;
    limit?: number;
}

/* ─── helpers ──────────────────────────────────────────────────────────── */

const getToken = (): string => localStorage.getItem("auth-token") ?? "";

const headers = (extra: Record<string, string> = {}): Record<string, string> => ({
    "Content-Type": "application/json",
    "auth-token": getToken(),
    ...extra,
});

const handleResponse = async <T = unknown>(res: Response): Promise<T> => {
    const data = await res.json() as T & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
};

/* ─── auth ─────────────────────────────────────────────────────────────── */

export const authApi = {
    login: (payload: LoginPayload) =>
        fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify(payload),
        }).then((res) => handleResponse<AuthTokenResponse>(res)),

    register: (payload: RegisterPayload) =>
        fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify(payload),
        }).then((res) => handleResponse<AuthTokenResponse>(res)),

    getMe: <T = unknown>() =>
        fetch(`${API_BASE}/auth/me`, {
            headers: headers(),
        }).then((res) => handleResponse<T>(res)),

    sendOtp: (email: string) =>
        fetch(`${API_BASE}/auth/getotp`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ email }),
        }).then(handleResponse),

    sendVerificationOtp: () =>
        fetch(`${API_BASE}/auth/send-verification-otp`, {
            method: "POST",
            headers: headers(),
        }).then(handleResponse),

    verifyEmail: (otp: string) =>
        fetch(`${API_BASE}/auth/verify-email`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ otp }),
        }).then(handleResponse),
};

/* ─── conversations ────────────────────────────────────────────────────── */

export const conversationApi = {
    list: <T = unknown>() =>
        fetch(`${API_BASE}/conversation/`, {
            headers: headers(),
        }).then((res) => handleResponse<T>(res)),

    get: <T = unknown>(id: string) =>
        fetch(`${API_BASE}/conversation/${id}`, {
            headers: headers(),
        }).then((res) => handleResponse<T>(res)),

    create: (memberIds: string[]) =>
        fetch(`${API_BASE}/conversation/`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ members: memberIds }),
        }).then(handleResponse),

    togglePin: (id: string) =>
        fetch(`${API_BASE}/conversation/${id}/pin`, {
            method: "POST",
            headers: headers(),
        }).then((res) => handleResponse<{ isPinned: boolean }>(res)),
};

/* ─── messages ─────────────────────────────────────────────────────────── */

export const messageApi = {
    list: (conversationId: string) =>
        fetch(`${API_BASE}/message/${conversationId}`, {
            headers: headers(),
        }).then(handleResponse),

    delete: (messageId: string, scope: "me" | "everyone") =>
        fetch(`${API_BASE}/message/${messageId}`, {
            method: "DELETE",
            headers: headers(),
            body: JSON.stringify({ scope }),
        }).then(handleResponse),

    bulkDelete: (messageIds: string[]) =>
        fetch(`${API_BASE}/message/bulk/hide`, {
            method: "DELETE",
            headers: headers(),
            body: JSON.stringify({ messageIds }),
        }).then(handleResponse),

    clearChat: (conversationId: string) =>
        fetch(`${API_BASE}/message/clear/${conversationId}`, {
            method: "POST",
            headers: headers(),
        }).then(handleResponse),

    toggleStar: (messageId: string) =>
        fetch(`${API_BASE}/message/${messageId}/star`, {
            method: "POST",
            headers: headers(),
        }).then((res) => handleResponse<{ isStarred: boolean; starredBy: string[] }>(res)),

    getStarred: <T = unknown>() =>
        fetch(`${API_BASE}/message/starred`, {
            headers: headers(),
        }).then((res) => handleResponse<T>(res)),
};

/* ─── users ────────────────────────────────────────────────────────────── */

export const userApi = {
    getOnlineStatus: (userId: string) =>
        fetch(`${API_BASE}/user/online-status/${userId}`, {
            headers: headers(),
        }).then(handleResponse),

    getNonFriends: (params: NonFriendsParams = {}) => {
        const qs = new URLSearchParams()
        if (params.search) qs.set("search", params.search)
        if (params.sort)   qs.set("sort",   params.sort)
        if (params.page)   qs.set("page",   String(params.page))
        if (params.limit)  qs.set("limit",  String(params.limit))
        return fetch(`${API_BASE}/user/non-friends?${qs.toString()}`, {
            headers: headers(),
        }).then(handleResponse)
    },

    updateProfile: (payload: UpdateProfilePayload) =>
        fetch(`${API_BASE}/user/update`, {
            method: "PUT",
            headers: headers(),
            body: JSON.stringify(payload),
        }).then(handleResponse),

    getPresignedUrl: (filename: string, filetype: string) =>
        fetch(
            `${API_BASE}/user/presigned-url?filename=${encodeURIComponent(filename)}&filetype=${encodeURIComponent(filetype)}`,
            { headers: headers() }
        ).then(handleResponse),

    blockUser: (userId: string) =>
        fetch(`${API_BASE}/user/block/${userId}`, {
            method: "POST",
            headers: headers(),
        }).then(handleResponse),

    unblockUser: (userId: string) =>
        fetch(`${API_BASE}/user/block/${userId}`, {
            method: "DELETE",
            headers: headers(),
        }).then(handleResponse),

    getBlockStatus: (userId: string) =>
        fetch(`${API_BASE}/user/block-status/${userId}`, {
            headers: headers(),
        }).then((res) => handleResponse<{ iBlockedThem: boolean; theyBlockedMe: boolean }>(res)),

    deleteAccount: () =>
        fetch(`${API_BASE}/user/delete`, {
            method: "DELETE",
            headers: headers(),
        }).then(handleResponse),
};

export { API_BASE };
