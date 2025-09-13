// API configuration
const API_CONFIG = {
  // Base URL for API requests
  BASE_URL: 'http://localhost:3001',
  
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
      ALL_ADMINS: '/admin/admins',
      FACULTY: '/admin/managed-faculty',
      STUDENTS: '/admin/students',
    },
    
    // Faculty endpoints
    FACULTY: {
      ALL: '/faculty',
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
  getUrl: function(endpoint) {
    return `${this.BASE_URL}${endpoint}`;
  }
};

export default API_CONFIG;