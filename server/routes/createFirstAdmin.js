const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Direct link to create first admin
router.get('/create-first-admin', async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await Admin.findOne({});
    if (adminExists) {
      return res.send('Admin already exists');
    }

    // Create password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin
    const admin = new Admin({
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '+919471531830',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    res.send('Admin created successfully! Email: admin@example.com, Password: admin123');
  } catch (error) {
    res.status(500).send('Error creating admin: ' + error.message);
  }
});

module.exports = router;