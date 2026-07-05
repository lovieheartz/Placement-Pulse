const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

// Direct link to create first admin
router.get('/create-first-admin', async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await prisma.admin.findFirst({ select: { id: true } });
    if (adminExists) {
      return res.send('Admin already exists');
    }

    // Create password hash
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin
    await prisma.admin.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '+919471531830',
        password: hashedPassword,
        role: 'admin'
      }
    });

    res.send('Admin created successfully! Email: admin@example.com, Password: admin123');
  } catch (error) {
    res.status(500).send('Error creating admin: ' + error.message);
  }
});

module.exports = router;