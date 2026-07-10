// API configuration
//
// The backend base URL is read from the VITE_API_URL environment variable at
// build time. Locally it falls back to http://localhost:3001 so nothing breaks
// in development. In production (Vercel/Netlify) set:
//   VITE_API_URL=https://your-backend.onrender.com
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  'http://localhost:3001'
).replace(/\/$/, '');

// WebSocket base URL — automatically derives ws:// or wss:// from API_BASE
// (http -> ws, https -> wss).
export const WS_BASE = API_BASE.replace(/^http/, 'ws');

const API_CONFIG = {
  // Base URL for API requests
  BASE_URL: API_BASE,

  // Endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: '/login',
      REGISTER: '/register-student',
      VERIFY_OTP: '/verify-otp',
      SEND_OTP: '/send-otp',
      VERIFY_ACCOUNT: '/verify-account',
    },

    // Admin endpoints
    ADMIN: {
      EXISTS: '/admin/exists',
      CREATE_FIRST: '/admin/create-first-admin',
      PROFILE: '/admin/profile',
      ALL_ADMINS: '/admin/all-admins',
      FACULTY: '/admin/managed-faculty',
      STUDENTS: '/admin/students',
    },

    // Faculty endpoints
    FACULTY: {
      ALL: '/faculty/all-faculties',
      PROFILE: '/faculty/profile',
    },

    // Student endpoints
    STUDENT: {
      PROFILE: '/student/profile',
    },

    // Notification endpoints
    NOTIFICATIONS: {
      CREATE: '/notifications/create',
      USER: '/notifications/user',
      UNREAD_COUNT: '/notifications/unread-count',
      MARK_READ: (id) => `/notifications/${id}/read`,
    },
  },

  // Helper function to get full URL
  getUrl: function (endpoint) {
    return `${this.BASE_URL}${endpoint}`;
  },
};

export default API_CONFIG;
