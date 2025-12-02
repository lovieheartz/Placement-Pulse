/**
 * Role-based Access Control Middleware
 * Ensures only specific user roles can access certain routes
 */

// Middleware to allow only students
const studentOnly = (req, res, next) => {
  if (!req.user) {
    console.error('❌ No user found in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  console.log('🔍 User role check:', { userId: req.user.id, role: req.user.role });

  if (req.user.role !== 'student') {
    console.error('❌ Access denied. User role:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'Access denied. This feature is only available to students.',
      debug: { userRole: req.user.role, required: 'student' }
    });
  }

  console.log('✅ Student access granted');
  next();
};

// Middleware to allow only admins
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Middleware to allow only faculty
const facultyOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'faculty') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Faculty privileges required.'
    });
  }

  next();
};

// Middleware to allow both admins and faculty
const adminOrFaculty = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or faculty privileges required.'
    });
  }

  next();
};

module.exports = {
  studentOnly,
  adminOnly,
  facultyOnly,
  adminOrFaculty
};
