/**
 * Centralized API client.
 *
 * Every HTTP call in the app goes through this file.  If the base URL, auth
 * header, or error-handling logic ever needs to change, there is exactly one
 * place to update.
 */

const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:5500";

/* ─── helpers ──────────────────────────────────────────────────────────── */

const getToken = () => localStorage.getItem("token") || "";

const headers = (extra = {}) => ({
  "Content-Type": "application/json",
  "auth-token": getToken(),
  ...extra,
});

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

/* ─── auth ─────────────────────────────────────────────────────────────── */

export const authApi = {
  login: (payload) =>
    fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  register: (payload) =>
    fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${API_BASE}/auth/me`, {
      headers: headers(),
    }).then(handleResponse),

  sendOtp: (email) =>
    fetch(`${API_BASE}/auth/getotp`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email }),
    }).then(handleResponse),
};

/* ─── conversations ────────────────────────────────────────────────────── */

export const conversationApi = {
  list: () =>
    fetch(`${API_BASE}/conversation/`, {
      headers: headers(),
    }).then(handleResponse),

  get: (id) =>
    fetch(`${API_BASE}/conversation/${id}`, {
      headers: headers(),
    }).then(handleResponse),

  create: (memberIds) =>
    fetch(`${API_BASE}/conversation/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ members: memberIds }),
    }).then(handleResponse),
};

/* ─── messages ─────────────────────────────────────────────────────────── */

export const messageApi = {
  list: (conversationId) =>
    fetch(`${API_BASE}/message/${conversationId}`, {
      headers: headers(),
    }).then(handleResponse),

  delete: (messageId, userIds) =>
    fetch(`${API_BASE}/message/delete`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ messageid: messageId, userids: userIds }),
    }).then(handleResponse)
};

/* ─── users ────────────────────────────────────────────────────────────── */

export const userApi = {
  getOnlineStatus: (userId) =>
    fetch(`${API_BASE}/user/online-status/${userId}`, {
      headers: headers(),
    }).then(handleResponse),

  getNonFriends: () =>
    fetch(`${API_BASE}/user/non-friends`, {
      headers: headers(),
    }).then(handleResponse),

  updateProfile: (payload) =>
    fetch(`${API_BASE}/user/update`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    }).then(handleResponse),

  getPresignedUrl: (filename, filetype) =>
    fetch(
      `${API_BASE}/user/presigned-url?filename=${encodeURIComponent(filename)}&filetype=${encodeURIComponent(filetype)}`,
      { headers: headers() }
    ).then(handleResponse),
};

export { API_BASE };
