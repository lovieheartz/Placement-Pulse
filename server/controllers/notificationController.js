const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const Faculty = require('../models/Faculty');
const mailService = require('../services/mailService');

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    console.log('Creating notification with data:', { 
      title: req.body.title,
      type: req.body.type,
      hasFile: !!req.file
    });
    
    // Parse recipients if it's a string (from FormData)
    if (req.body.recipients && typeof req.body.recipients === 'string') {
      req.body.recipients = JSON.parse(req.body.recipients);
    }
    
    const {
      title,
      description,
      type,
      formLink,
      deadline,
      extraInfo,
      recipients
    } = req.body;

    // Validate required fields
    if (!title || !description || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and deadline are required fields'
      });
    }

    // Validate form link for form type notifications
    if (type === 'form' && !formLink) {
      return res.status(400).json({
        success: false,
        message: 'Form link is required for form notifications'
      });
    }

    // Create notification object
    const notificationData = {
      title,
      description,
      type,
      formLink,
      deadline,
      extraInfo,
      recipients,
      createdBy: req.user.id,
      createdByModel: req.user.role === 'admin' ? 'Admin' : 'Faculty'
    };

    // Add attachment if file was uploaded
    if (req.file) {
      console.log('File uploaded:', {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
      
      notificationData.attachment = {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }

    // Create notification
    const notification = new Notification(notificationData);

    await notification.save();

    // Send emails based on recipient filters
    try {
      const recipientCount = await sendNotificationEmails(notification);
      
      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification,
        recipientCount
      });
    } catch (emailError) {
      console.error('Error sending notification emails:', emailError);
      
      // Still return success for notification creation, but include email error
      res.status(201).json({
        success: true,
        message: 'Notification created successfully, but there was an error sending emails',
        data: notification,
        emailError: emailError.message
      });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// Get all notifications for a user
exports.getUserNotifications = async (req, res) => {
  try {
    const { role, id } = req.user;
    let notifications = [];
    
    if (role === 'student') {
      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      // Find notifications for this student based on filters (excluding expired ones)
      notifications = await Notification.find({
        $and: [
          {
            $or: [
              { 'recipients.students.all': true },
              { 'recipients.students.courses': student.course },
              { 'recipients.students.branches': student.branch },
              { 'recipients.students.passoutYears': student.passoutYear }
            ]
          },
          { $or: [{ expired: false }, { expired: { $exists: false } }] }
        ]
      }).sort({ createdAt: -1 });
    } 
    else if (role === 'faculty') {
      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }
      
      // Find notifications for this faculty based on filters (excluding expired ones)
      notifications = await Notification.find({
        $and: [
          {
            $or: [
              { 'recipients.faculty.all': true },
              { 'recipients.faculty.specializations': faculty.specialization }
            ]
          },
          { $or: [{ expired: false }, { expired: { $exists: false } }] }
        ]
      }).sort({ createdAt: -1 });
    }
    else if (role === 'admin') {
      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }
      
      // Find notifications for this admin based on filters (excluding expired ones)
      notifications = await Notification.find({
        $and: [
          {
            $or: [
              { 'recipients.admins.all': true },
              { 'recipients.admins.names': admin.name }
            ]
          },
          { $or: [{ expired: false }, { expired: { $exists: false } }] }
        ]
      }).sort({ createdAt: -1 });
    }

    // Mark which notifications have been read by this user
    const processedNotifications = notifications.map(notification => {
      const readStatus = notification.isRead.find(
        item => item.user.toString() === id && item.userModel === role.charAt(0).toUpperCase() + role.slice(1)
      );
      
      return {
        ...notification._doc,
        isReadByUser: !!readStatus,
        readAt: readStatus ? readStatus.readAt : null
      };
    });

    res.status(200).json({
      success: true,
      count: processedNotifications.length,
      data: processedNotifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { role, id } = req.user;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check if already marked as read
    const alreadyRead = notification.isRead.some(
      item => item.user.toString() === id && item.userModel === role.charAt(0).toUpperCase() + role.slice(1)
    );
    
    if (!alreadyRead) {
      notification.isRead.push({
        user: id,
        userModel: role.charAt(0).toUpperCase() + role.slice(1),
        readAt: new Date()
      });
      
      await notification.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const { role, id } = req.user;
    let notifications = [];
    
    if (role === 'student') {
      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      notifications = await Notification.find({
        $and: [
          {
            $or: [
              { 'recipients.students.all': true },
              { 'recipients.students.courses': student.course },
              { 'recipients.students.branches': student.branch },
              { 'recipients.students.passoutYears': student.passoutYear }
            ]
          },
          { $or: [{ expired: false }, { expired: { $exists: false } }] }
        ]
      });
    } 
    else if (role === 'faculty') {
      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }
      
      notifications = await Notification.find({
        $and: [
          {
            $or: [
              { 'recipients.faculty.all': true },
              { 'recipients.faculty.specializations': faculty.specialization }
            ]
          },
          { $or: [{ expired: false }, { expired: { $exists: false } }] }
        ]
      });
    }
    else if (role === 'admin') {
      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }
      
      notifications = await Notification.find({
        $and: [
          {
            $or: [
              { 'recipients.admins.all': true },
              { 'recipients.admins.names': admin.name }
            ]
          },
          { $or: [{ expired: false }, { expired: { $exists: false } }] }
        ]
      });
    }

    // Count unread notifications
    const unreadCount = notifications.filter(notification => 
      !notification.isRead.some(
        item => item.user.toString() === id && item.userModel === role.charAt(0).toUpperCase() + role.slice(1)
      )
    ).length;

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread notification count',
      error: error.message
    });
  }
};

// Helper function to send notification emails
async function sendNotificationEmails(notification) {
  try {
    const recipients = notification.recipients;
    let emailList = [];
    
    // Get student emails
    if (recipients.students) {
      let studentQuery = {};
      
      if (!recipients.students.all) {
        const filters = [];
        
        if (recipients.students.courses && recipients.students.courses.length > 0) {
          filters.push({ course: { $in: recipients.students.courses } });
        }
        
        if (recipients.students.branches && recipients.students.branches.length > 0) {
          filters.push({ branch: { $in: recipients.students.branches } });
        }
        
        if (recipients.students.passoutYears && recipients.students.passoutYears.length > 0) {
          filters.push({ passoutYear: { $in: recipients.students.passoutYears } });
        }
        
        if (filters.length > 0) {
          studentQuery = { $and: filters };
        }
      }
      
      const students = await Student.find(studentQuery).select('email');
      emailList = [...emailList, ...students.map(s => s.email)];
    }
    
    // Get faculty emails
    if (recipients.faculty) {
      if (recipients.faculty.all) {
        const faculty = await Faculty.find().select('email');
        emailList = [...emailList, ...faculty.map(f => f.email)];
      } else {
        let facultyQuery = {};
        const filters = [];
        
        if (recipients.faculty.specializations && recipients.faculty.specializations.length > 0) {
          filters.push({ specialization: { $in: recipients.faculty.specializations } });
        }
        
        if (filters.length > 0) {
          facultyQuery = { $or: filters };
          const faculty = await Faculty.find(facultyQuery).select('email');
          emailList = [...emailList, ...faculty.map(f => f.email)];
        }
      }
    }
    
    // Get admin emails
    if (recipients.admins) {
      if (recipients.admins.all) {
        const admins = await Admin.find().select('email');
        emailList = [...emailList, ...admins.map(a => a.email)];
      } else if (recipients.admins.names && recipients.admins.names.length > 0) {
        const admins = await Admin.find({ name: { $in: recipients.admins.names } }).select('email');
        emailList = [...emailList, ...admins.map(a => a.email)];
      }
    }
    
    // Remove duplicates
    emailList = [...new Set(emailList)];
    
    // Send emails
    if (emailList.length > 0) {
      await sendBatchEmails(emailList, notification);
    }
    
    return emailList.length;
  } catch (error) {
    console.error('Error sending notification emails:', error);
    throw error;
  }
}

// Helper function to send batch emails
async function sendBatchEmails(emailList, notification) {
  const batchSize = 50; // Send emails in batches to avoid overloading the mail server
  
  for (let i = 0; i < emailList.length; i += batchSize) {
    const batch = emailList.slice(i, i + batchSize);
    
    // Create email content based on notification type
    const emailContent = createEmailContent(notification);
    
    // Send emails
    const mailOptions = {
      from: process.env.EMAIL_USER,
      bcc: batch, // Use BCC for privacy
      subject: `NSEC Placement Portal - ${notification.title}`,
      html: emailContent
    };
    
    // Add attachment if present
    if (notification.attachment && notification.attachment.path) {
      console.log('Adding attachment to email:', notification.attachment);
      mailOptions.attachments = [
        {
          filename: notification.attachment.filename,
          path: notification.attachment.path
        }
      ];
    }
    
    try {
      await mailService.transporter.sendMail(mailOptions);
      console.log(`Sent notification emails to batch ${i/batchSize + 1}`);
    } catch (error) {
      console.error(`Failed to send notification emails to batch ${i/batchSize + 1}:`, error);
    }
  }
}

// Helper function to create email content
function createEmailContent(notification) {
  // Format date if it exists
  let deadlineDate = '';
  let deadlineTime = '';
  
  if (notification.deadline) {
    const deadline = new Date(notification.deadline);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    deadlineDate = deadline.toLocaleDateString('en-US', options);
    deadlineTime = deadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  // Get sender type (Admin or Faculty)
  const senderType = notification.createdByModel || 'Admin';
  const senderColor = senderType === 'Admin' ? '#1a73e8' : '#0f9d58'; // Blue for Admin, Green for Faculty
  const senderLabel = senderType === 'Admin' ? 'TPO' : 'Faculty';
  
  const deadlineText = notification.deadline 
    ? `<tr>
         <td style="padding: 16px; border-bottom: 1px solid #eaeaea;">
           <table width="100%" cellpadding="0" cellspacing="0">
             <tr>
               <td width="24" valign="top">
                 <img src="https://img.icons8.com/fluency/48/000000/clock.png" width="24" height="24" style="display: block;" alt="Deadline" />
               </td>
               <td style="padding-left: 12px;">
                 <p style="margin: 0; font-weight: 600; color: #333; font-size: 14px;">Deadline</p>
                 <p style="margin: 4px 0 0; color: #e53935; font-size: 15px;">${deadlineDate} at ${deadlineTime}</p>
               </td>
             </tr>
           </table>
         </td>
       </tr>` 
    : '';
  
  const formLinkText = notification.formLink 
    ? `<tr>
         <td style="padding: 16px; border-bottom: 1px solid #eaeaea;">
           <table width="100%" cellpadding="0" cellspacing="0">
             <tr>
               <td width="24" valign="top">
                 <img src="https://img.icons8.com/fluency/48/000000/form.png" width="24" height="24" style="display: block;" alt="Form" />
               </td>
               <td style="padding-left: 12px;">
                 <p style="margin: 0; font-weight: 600; color: #333; font-size: 14px;">Form Link</p>
                 <p style="margin: 8px 0 0;">
                   <a href="${notification.formLink}" style="color: #ffffff; text-decoration: none; display: inline-block; padding: 8px 16px; background-color: ${senderColor}; border-radius: 4px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                     Open Form
                   </a>
                 </p>
               </td>
             </tr>
           </table>
         </td>
       </tr>` 
    : '';
  
  const attachmentText = notification.attachment 
    ? `<tr>
         <td style="padding: 16px; border-bottom: 1px solid #eaeaea;">
           <table width="100%" cellpadding="0" cellspacing="0">
             <tr>
               <td width="24" valign="top">
                 <img src="https://img.icons8.com/fluency/48/000000/attach.png" width="24" height="24" style="display: block;" alt="Attachment" />
               </td>
               <td style="padding-left: 12px;">
                 <p style="margin: 0; font-weight: 600; color: #333; font-size: 14px;">Attachment</p>
                 <p style="margin: 8px 0 0;">
                   <span style="display: inline-block; padding: 8px 16px; background-color: #f5f5f5; border-radius: 4px; font-size: 14px; color: #333;">
                     📎 ${notification.attachment.filename} (attached to this email)
                   </span>
                 </p>
               </td>
             </tr>
           </table>
         </td>
       </tr>` 
    : '';
  
  const extraInfoText = notification.extraInfo 
    ? `<tr>
         <td style="padding: 16px;">
           <table width="100%" cellpadding="0" cellspacing="0">
             <tr>
               <td width="24" valign="top">
                 <img src="https://img.icons8.com/fluency/48/000000/info.png" width="24" height="24" style="display: block;" alt="Info" />
               </td>
               <td style="padding-left: 12px;">
                 <p style="margin: 0; font-weight: 600; color: #333; font-size: 14px;">Additional Information</p>
                 <div style="margin: 8px 0 0; padding: 16px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid ${senderColor}; font-size: 14px; line-height: 1.6; color: #333;">
                   ${notification.extraInfo}
                 </div>
               </td>
             </tr>
           </table>
         </td>
       </tr>` 
    : '';

  // No need to redefine variables here
  
  // Choose template based on notification type
  if (notification.type === 'text') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f5f7fa; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://nsec.ac.in/wp-content/uploads/2022/05/NSEC-Logo.png" alt="NSEC Logo" style="height: 60px; width: auto;">
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: ${senderColor}; padding: 24px; text-align: center;">
                      <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">${notification.title}</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: ${senderColor}15; padding: 8px 24px; text-align: right; border-bottom: 1px solid ${senderColor}30;">
                      <span style="display: inline-block; background-color: ${senderColor}; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px;">
                        ${senderLabel} Notification
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 24px 24px 16px;">
                <p style="margin: 0; line-height: 1.6; font-size: 16px; color: #333;">${notification.description}</p>
              </td>
            </tr>
            
            <!-- Details -->
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #eaeaea;">
                  ${deadlineText}
                  ${attachmentText}
                  ${extraInfoText || ''}
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; font-size: 13px; color: #666; font-weight: 500;">
                  NSEC Placement Portal
                </p>
                <p style="margin: 8px 0 0; font-size: 12px; color: #888;">
                  This is an automated message. Please do not reply to this email.
                </p>
                <div style="margin-top: 16px;">
                  <a href="https://www.nsec.ac.in" style="display: inline-block; margin: 0 8px; color: #666; text-decoration: none; font-size: 12px;">Website</a>
                  <span style="color: #ccc;">|</span>
                  <a href="https://www.nsec.ac.in/contact" style="display: inline-block; margin: 0 8px; color: #666; text-decoration: none; font-size: 12px;">Contact</a>
                </div>
              </td>
            </tr>
          </table>
          
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
            © ${new Date().getFullYear()} NSEC. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;
  } else {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f5f7fa; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://nsec.ac.in/wp-content/uploads/2022/05/NSEC-Logo.png" alt="NSEC Logo" style="height: 60px; width: auto;">
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: ${senderColor}; padding: 24px; text-align: center;">
                      <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">${notification.title}</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: ${senderColor}15; padding: 8px 24px; text-align: right; border-bottom: 1px solid ${senderColor}30;">
                      <span style="display: inline-block; background-color: ${senderColor}; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px;">
                        ${senderLabel} Form
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 24px 24px 16px;">
                <p style="margin: 0; line-height: 1.6; font-size: 16px; color: #333;">${notification.description}</p>
              </td>
            </tr>
            
            <!-- Form Details -->
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #eaeaea;">
                  ${formLinkText}
                  ${deadlineText}
                  ${attachmentText}
                  ${extraInfoText || ''}
                </table>
              </td>
            </tr>
            
            <!-- Action Button -->
            <tr>
              <td style="padding: 10px 24px 30px; text-align: center;">
                <a href="${notification.formLink}" style="display: inline-block; padding: 12px 28px; background-color: ${senderColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px ${senderColor}40; transition: all 0.2s;">
                  Open Form
                </a>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; font-size: 13px; color: #666; font-weight: 500;">
                  NSEC Placement Portal
                </p>
                <p style="margin: 8px 0 0; font-size: 12px; color: #888;">
                  This is an automated message. Please do not reply to this email.
                </p>
                <div style="margin-top: 16px;">
                  <a href="https://www.nsec.ac.in" style="display: inline-block; margin: 0 8px; color: #666; text-decoration: none; font-size: 12px;">Website</a>
                  <span style="color: #ccc;">|</span>
                  <a href="https://www.nsec.ac.in/contact" style="display: inline-block; margin: 0 8px; color: #666; text-decoration: none; font-size: 12px;">Contact</a>
                </div>
              </td>
            </tr>
          </table>
          
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
            © ${new Date().getFullYear()} NSEC. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;
  }
}