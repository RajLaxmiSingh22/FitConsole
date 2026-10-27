import axios from "axios";

export const AUTH_TOKEN_KEY = "fitconsole.authToken";

const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:9000/api"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getApiError(error, fallback = "Something went wrong. Please try again.") {
  return error.response?.data?.message || error.message || fallback;
}

export const apiCalls = {
  health: () => api.get("/health"),
  auth: {
    login: (credentials) => api.post("/auth/login", credentials),
    register: (account) => api.post("/auth/register", account),
    me: () => api.get("/auth/me"),
    changePassword: (passwords) => api.patch("/auth/password", passwords),
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
    renew: (id) => api.patch(`/memberships/${id}/renew`),
    cancel: (id) => api.patch(`/memberships/${id}/cancel`),
  },
  payments: {
    list: (params) => api.get("/payments", { params }),
    reminders: () => api.get("/payments/reminders"),
    create: (payment) => api.post("/payments", payment),
    update: (id, payment) => api.patch(`/payments/${id}`, payment),
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
    trainer: () => api.get("/dashboard/trainer"),
  },
  exports: {
    payments: () => api.get("/exports/payments.xlsx", { responseType: "blob" }),
    clients: () => api.get("/exports/clients.xlsx", { responseType: "blob" }),
  },
};

export async function getHealth() {
  const { data } = await apiCalls.health();
  return data;
}
