const cron = require('node-cron');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Function to check and expire notifications past their deadline
const expireNotifications = async () => {
  try {
    console.log('Running notification expiration job...');
    
    const now = new Date();
    
    // Find notifications with deadlines in the past
    const expiredNotifications = await Notification.find({
      deadline: { $lt: now },
      expired: { $ne: true }
    });
    
    if (expiredNotifications.length > 0) {
      console.log(`Found ${expiredNotifications.length} expired notifications`);
      
      // Mark notifications as expired
      for (const notification of expiredNotifications) {
        notification.expired = true;
        await notification.save();
        console.log(`Marked notification ${notification._id} as expired`);
      }
    } else {
      console.log('No expired notifications found');
    }
  } catch (error) {
    console.error('Error in notification expiration job:', error);
  }
};

// Schedule the job to run every hour
const scheduleJobs = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', expireNotifications);
  console.log('Notification expiration job scheduled');
};

module.exports = { scheduleJobs, expireNotifications };