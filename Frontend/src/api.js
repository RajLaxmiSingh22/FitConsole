import axios from "axios";

// Session tokens live in httpOnly cookies. This flag only records that a session may exist,
// so anonymous visitors are not sent through a refresh request on every load.
const SESSION_HINT_KEY = "fitconsole.session";
const LEGACY_TOKEN_KEY = "fitconsole.authToken";
const SAFE_METHODS = new Set(["get", "head", "options"]);
let csrfToken = "";
let refreshInFlight = null;

const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:9000/api"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  withCredentials: true,
});

function readSessionHint() {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasSessionHint() {
  return readSessionHint();
}

// Stores the CSRF token returned by login/register/refresh, or clears local session state when given null.
export function setSession(session) {
  csrfToken = session?.csrfToken ?? "";
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    if (session) localStorage.setItem(SESSION_HINT_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Storage can be unavailable; the cookie session still works for this page load.
  }
}

export function refreshSession() {
  refreshInFlight ??= api.post("/auth/refresh", null, { skipAuthRefresh: true })
    .then((response) => {
      const data = response.data?.data;
      setSession(data);
      return data;
    })
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

api.interceptors.request.use((config) => {
  if (csrfToken && !SAFE_METHODS.has((config.method ?? "get").toLowerCase())) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response?.status === 401 && config && !config.skipAuthRefresh && !config._retried && readSessionHint()) {
      config._retried = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        setSession(null);
        window.dispatchEvent(new CustomEvent("fitconsole:session-expired"));
      }
    }
    return Promise.reject(error);
  },
);

// Blob downloads return JSON errors as a Blob; read the message out so it can be shown.
export async function getBlobApiError(error, fallback) {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return getApiError(error, fallback);
}

export function getApiError(error, fallback = "Something went wrong. Please try again.") {
  return error.response?.data?.message || error.message || fallback;
}

export const apiCalls = {
  health: () => api.get("/health"),
  auth: {
    login: (credentials) => api.post("/auth/login", credentials, { skipAuthRefresh: true }),
    register: (account) => api.post("/auth/register", account, { skipAuthRefresh: true }),
    refresh: refreshSession,
    logout: () => api.post("/auth/logout", null, { skipAuthRefresh: true }),
    me: () => api.get("/auth/me"),
    changePassword: (passwords) => api.patch("/auth/password", passwords),
    requestPasswordReset: (email) => api.post("/auth/forgot-password", { email }),
    resetPassword: (input) => api.post("/auth/reset-password", input),
  },
  public: {
    trialBooking: (booking) => api.post("/public/trial-bookings", booking),
  },
  leads: {
    list: (params) => api.get("/leads", { params }),
    get: (id) => api.get(`/leads/${encodeURIComponent(id)}`),
    setStatus: (id, status, note) => api.patch(`/leads/${encodeURIComponent(id)}/status`, { status, ...(note ? { note } : {}) }),
    addNote: (id, note) => api.post(`/leads/${encodeURIComponent(id)}/notes`, { note }),
    assignCourse: (id, courseId) => api.patch(`/leads/${encodeURIComponent(id)}/course`, { courseId }),
    enroll: (id, durationMonths) => api.post(`/leads/${encodeURIComponent(id)}/enroll`, { durationMonths }),
  },
  analytics: {
    event: (event) => api.post("/public/events", event),
    summary: (params) => api.get("/analytics/summary", { params }),
  },
  users: {
    list: (params) => api.get("/users", { params }),
    createTrainer: (trainer) => api.post("/users/trainers", trainer),
    setStatus: (id, active) => api.patch(`/users/${id}/status`, { active }),
  },
  clients: {
    list: () => api.get("/clients"),
    me: () => api.get("/clients/me"),
    get: (id) => api.get(`/clients/${id}`),
    create: (client) => api.post("/clients", client),
    update: (id, profile) => api.patch(`/clients/${id}`, profile),
    updateMe: (profile) => api.patch("/clients/me", profile),
    assignTrainer: (id, trainerId) => api.patch(`/clients/${id}/trainer`, { trainerId }),
    setIdProof: (id, reference) => api.put(`/clients/${id}/id-proof`, { reference }),
    memberships: (id) => api.get(`/clients/${id}/memberships`),
    payments: (id) => api.get(`/clients/${id}/payments`),
    attendance: (id) => api.get(`/clients/${id}/attendance`),
    dietEntries: (id, params) => api.get(`/clients/${id}/diet-entries`, { params }),
    dietSummary: (id) => api.get(`/clients/${id}/diet-entries/summary`),
    createDietEntry: (id, entry) => api.post(`/clients/${id}/diet-entries`, entry),
    dietPlans: (id) => api.get(`/clients/${id}/diet-plans`),
    generateDietPlan: (id, input = {}) => api.post(`/clients/${id}/diet-plans/generate`, input, { timeout: 90000 }),
    suggestDietTweak: (id, planId) => api.post(`/clients/${id}/diet-plans/${planId}/suggest-tweak`, null, { timeout: 90000 }),
    progress: (id) => api.get(`/clients/${id}/progress`),
    logProgress: (id, entry) => api.post(`/clients/${id}/progress`, entry),
    waivers: (id) => api.get(`/clients/${id}/waivers`),
  },
  trainers: {
    list: () => api.get("/trainers"),
    get: (id) => api.get(`/trainers/${id}`),
    update: (id, profile) => api.patch(`/trainers/${id}`, profile),
    updateMe: (profile) => api.patch("/trainers/me", profile),
    clients: () => api.get("/trainers/me/clients"),
  },
  courses: {
    list: () => api.get("/courses"),
    get: (id) => api.get(`/courses/${id}`),
    create: (course) => api.post("/courses", course),
    update: (id, course) => api.patch(`/courses/${id}`, course),
    deactivate: (id) => api.delete(`/courses/${id}`),
    setTrainers: (id, trainerIds) => api.put(`/courses/${id}/trainers`, { trainerIds }),
  },
  memberships: {
    list: (params) => api.get("/memberships", { params }),
    create: (membership) => api.post("/memberships", membership),
    createClientCheckout: (offer) => api.post("/memberships/checkout", offer),
    renew: (id, body = {}) => api.patch(`/memberships/${id}/renew`, body),
    cancel: (id) => api.patch(`/memberships/${id}/cancel`),
  },
  payments: {
    list: (params) => api.get("/payments", { params }),
    reminders: () => api.get("/payments/reminders"),
    sendReminder: (paymentId) => api.post(`/payments/reminders/${encodeURIComponent(paymentId)}/send`),
    resolveReminder: (paymentId) => api.patch(`/payments/reminders/${encodeURIComponent(paymentId)}/resolve`),
    create: (payment) => api.post("/payments", payment),
    update: (id, payment) => api.patch(`/payments/${id}`, payment),
    void: (id, reason) => api.post(`/payments/${id}/void`, { reason }),
    createCashfreeOrder: (order) => api.post("/payments/cashfree/orders", order),
    verifyCashfreeOrder: (orderId) => api.get(`/payments/cashfree/orders/${encodeURIComponent(orderId)}`),
  },
  waivers: {
    current: () => api.get("/waivers/current"),
    accept: (documentReference) => api.post("/waivers/accept", { documentReference }),
  },
  attendance: {
    list: (params) => api.get("/attendance", { params }),
    checkIn: (input) => api.post("/attendance/check-in", input),
  },
  dietEntries: {
    update: (id, entry) => api.patch(`/diet-entries/${id}`, entry),
    delete: (id) => api.delete(`/diet-entries/${id}`),
  },
  dietPlans: {
    update: (id, plan) => api.patch(`/diet-plans/${id}`, { plan }),
    approve: (id) => api.post(`/diet-plans/${id}/approve`),
  },
  conversations: {
    list: () => api.get("/conversations"),
    start: (participantId) => api.post("/conversations", { participantId }),
    messages: (id) => api.get(`/conversations/${id}/messages`),
    send: (id, body) => api.post(`/conversations/${id}/messages`, { body }),
  },
  dashboard: {
    owner: () => api.get("/dashboard/owner"),
    ownerAnalytics: (params) => api.get("/dashboard/owner/analytics", { params }),
    trainer: () => api.get("/dashboard/trainer"),
  },
  exports: {
    payments: () => api.get("/exports/payments.xlsx", { responseType: "blob" }),
    clients: () => api.get("/exports/clients.xlsx", { responseType: "blob" }),
    report: (name, params) => api.get(`/exports/${name}.xlsx`, { params, responseType: "blob" }),
  },
};

export async function getHealth() {
  const { data } = await apiCalls.health();
  return data;
}
