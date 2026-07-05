const cron = require('node-cron');
const prisma = require('../lib/prisma');
const mailService = require('../services/mailService');

// Function to send deadline reminders for notifications
const sendDeadlineReminders = async () => {
  try {
    console.log('Running deadline reminder job...');
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Start of tomorrow
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    
    // End of tomorrow
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    
    // Find notifications with deadlines tomorrow that haven't had reminders sent
    const notificationsWithDeadlineTomorrow = await prisma.notification.findMany({
      where: {
        deadline: { gte: tomorrowStart, lte: tomorrowEnd },
        reminderSent: { not: true },
        expired: { not: true }
      }
    });
    
    if (notificationsWithDeadlineTomorrow.length > 0) {
      console.log(`Found ${notificationsWithDeadlineTomorrow.length} notifications with deadlines tomorrow`);
      
      for (const notification of notificationsWithDeadlineTomorrow) {
        // Get recipients for this notification
        const recipients = notification.recipients;
        let emailList = [];
        
        // Get student emails
        if (recipients.students) {
          let studentWhere = {};

          if (!recipients.students.all) {
            const filters = [];

            if (recipients.students.courses && recipients.students.courses.length > 0) {
              filters.push({ course: { in: recipients.students.courses } });
            }

            if (recipients.students.branches && recipients.students.branches.length > 0) {
              filters.push({ branch: { in: recipients.students.branches } });
            }

            if (recipients.students.passoutYears && recipients.students.passoutYears.length > 0) {
              filters.push({ passoutYear: { in: recipients.students.passoutYears } });
            }

            if (filters.length > 0) {
              studentWhere = { AND: filters };
            }
          }

          const students = await prisma.student.findMany({ where: studentWhere, select: { email: true } });
          emailList = [...emailList, ...students.map(s => s.email)];
        }

        // Get faculty emails
        if (recipients.faculty) {
          if (recipients.faculty.all) {
            const faculty = await prisma.faculty.findMany({ select: { email: true } });
            emailList = [...emailList, ...faculty.map(f => f.email)];
          } else {
            const filters = [];

            if (recipients.faculty.specializations && recipients.faculty.specializations.length > 0) {
              filters.push({ specialization: { in: recipients.faculty.specializations } });
            }

            if (filters.length > 0) {
              const faculty = await prisma.faculty.findMany({ where: { OR: filters }, select: { email: true } });
              emailList = [...emailList, ...faculty.map(f => f.email)];
            }
          }
        }

        // Get admin emails
        if (recipients.admins) {
          if (recipients.admins.all) {
            const admins = await prisma.admin.findMany({ select: { email: true } });
            emailList = [...emailList, ...admins.map(a => a.email)];
          } else if (recipients.admins.names && recipients.admins.names.length > 0) {
            const admins = await prisma.admin.findMany({ where: { name: { in: recipients.admins.names } }, select: { email: true } });
            emailList = [...emailList, ...admins.map(a => a.email)];
          }
        }
        
        // Remove duplicates
        emailList = [...new Set(emailList)];
        
        if (emailList.length > 0) {
          // Send reminder emails
          await sendReminderEmails(emailList, notification);
          
          // Mark notification as having had reminders sent
          await prisma.notification.update({
            where: { id: notification.id },
            data: { reminderSent: true }
          });

          console.log(`Sent deadline reminders for notification ${notification.id} to ${emailList.length} recipients`);
        }
      }
    } else {
      console.log('No notifications with deadlines tomorrow found');
    }
  } catch (error) {
    console.error('Error in deadline reminder job:', error);
  }
};

// Function to send reminder emails
async function sendReminderEmails(emailList, notification) {
  const batchSize = 50; // Send emails in batches
  
  for (let i = 0; i < emailList.length; i += batchSize) {
    const batch = emailList.slice(i, i + batchSize);
    
    // Format deadline
    const deadline = new Date(notification.deadline);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const deadlineDate = deadline.toLocaleDateString('en-US', options);
    const deadlineTime = deadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Create email content
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deadline Reminder: ${notification.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9; color: #333;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #ff9800; padding: 20px; text-align: center;">
              <h2 style="margin: 0; color: white; font-size: 24px;">⚠️ Deadline Reminder</h2>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0; line-height: 1.6; font-size: 16px;">This is a reminder that the deadline for <strong>${notification.title}</strong> is tomorrow.</p>
              <p style="margin: 15px 0; line-height: 1.6; font-size: 16px;">${notification.description}</p>
            </td>
          </tr>
          
          <!-- Deadline -->
          <tr>
            <td style="padding: 0 20px 20px;">
              <div style="padding: 15px; background-color: #fff3e0; border-radius: 4px; border-left: 4px solid #ff9800;">
                <p style="margin: 0; font-weight: bold; color: #e65100;">Deadline: ${deadlineDate} at ${deadlineTime}</p>
                <p style="margin: 10px 0 0;">Please complete this task before the deadline.</p>
              </div>
            </td>
          </tr>
          
          ${notification.formLink ? `
          <!-- Action Button -->
          <tr>
            <td style="padding: 0 20px 20px; text-align: center;">
              <a href="${notification.formLink}" style="display: inline-block; padding: 12px 24px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Open Form Now
              </a>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f3f4; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              <p style="margin: 0;">This is an automated reminder from NSEC Placement Portal.</p>
              <p style="margin: 5px 0 0;">Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    // Send emails
    const mailOptions = {
      from: process.env.EMAIL_USER,
      bcc: batch,
      subject: `REMINDER: ${notification.title} - Deadline Tomorrow`,
      html: emailContent
    };
    
    try {
      await mailService.transporter.sendMail(mailOptions);
      console.log(`Sent reminder emails to batch ${i/batchSize + 1}`);
    } catch (error) {
      console.error(`Failed to send reminder emails to batch ${i/batchSize + 1}:`, error);
    }
  }
}

// Schedule the job to run every day at 9 AM
const scheduleReminderJobs = () => {
  cron.schedule('0 9 * * *', sendDeadlineReminders);
  console.log('Deadline reminder job scheduled to run daily at 9 AM');
};

module.exports = { scheduleReminderJobs, sendDeadlineReminders };