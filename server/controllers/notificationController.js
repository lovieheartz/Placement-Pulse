const prisma = require('../lib/prisma');
const mailService = require('../services/mailService');
const storageService = require('../services/storageService');

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    console.log('Creating notification with data:', {
      title: req.body.title,
      type: req.body.type,
      hasFile: !!req.file
    });

    console.log('📧 Raw recipients from request:', req.body.recipients);
    console.log('📧 Recipients type:', typeof req.body.recipients);

    // Parse recipients if it's a string (from FormData)
    if (req.body.recipients && typeof req.body.recipients === 'string') {
      console.log('📧 Parsing recipients string...');
      req.body.recipients = JSON.parse(req.body.recipients);
      console.log('📧 Parsed recipients:', JSON.stringify(req.body.recipients, null, 2));
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
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required fields'
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

    // Upload attachment to Supabase Storage if a file was provided
    if (req.file) {
      const uploaded = await storageService.uploadMulterFile(
        req.file,
        storageService.FOLDERS.NOTIFICATION
      );
      console.log('File uploaded to Supabase Storage:', uploaded.publicUrl);

      notificationData.attachment = {
        filename: req.file.originalname,
        path: uploaded.publicUrl,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }

    // Determine the creator model based on role
    if (req.user.role === 'admin') {
      notificationData.createdByModel = 'Admin';
    } else if (req.user.role === 'faculty') {
      notificationData.createdByModel = 'Faculty';
    } else if (req.user.role === 'hod') {
      notificationData.createdByModel = 'HOD';
    }

    // Create notification
    const notification = await prisma.notification.create({ data: notificationData });

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

// Helper: does a notification's recipients JSON target this user?
function matchesRecipient(recipients, role, user) {
  if (!recipients) return false;

  if (role === 'student') {
    const r = recipients.students;
    if (!r) return false;
    return !!r.all
      || (Array.isArray(r.courses) && r.courses.includes(user.course))
      || (Array.isArray(r.branches) && r.branches.includes(user.branch))
      || (Array.isArray(r.passoutYears) && r.passoutYears.includes(user.passoutYear));
  }
  if (role === 'faculty') {
    const r = recipients.faculty;
    if (!r) return false;
    return !!r.all
      || (Array.isArray(r.courses) && r.courses.includes(user.course))
      || (Array.isArray(r.departments) && r.departments.includes(user.department));
  }
  if (role === 'admin') {
    const r = recipients.admins;
    if (!r) return false;
    return !!r.all
      || (Array.isArray(r.names) && r.names.includes(user.name));
  }
  if (role === 'hod') {
    const r = recipients.hods;
    if (!r) return false;
    return !!r.all
      || (Array.isArray(r.courses) && r.courses.includes(user.course))
      || (Array.isArray(r.departments) && r.departments.includes(user.department));
  }
  return false;
}

// Fetch non-expired notifications targeting the given user (recipients is JSON,
// so we filter the targeting in JS while keeping DB filtering for expiry/order).
async function getNotificationsForUser(role, id) {
  let user = null;
  if (role === 'student') user = await prisma.student.findUnique({ where: { id } });
  else if (role === 'faculty') user = await prisma.faculty.findUnique({ where: { id } });
  else if (role === 'admin') user = await prisma.admin.findUnique({ where: { id } });
  else if (role === 'hod') user = await prisma.hOD.findUnique({ where: { id } });

  if (!user) return { user: null, notifications: [] };

  const candidates = await prisma.notification.findMany({
    where: { expired: false },
    orderBy: { createdAt: 'desc' }
  });

  const notifications = candidates.filter(n => matchesRecipient(n.recipients, role, user));
  return { user, notifications };
}

// Get all notifications for a user
exports.getUserNotifications = async (req, res) => {
  try {
    const { role, id } = req.user;

    const { user, notifications } = await getNotificationsForUser(role, id);

    if (!user) {
      const label = role.charAt(0).toUpperCase() + role.slice(1);
      return res.status(404).json({
        success: false,
        message: `${label} not found`
      });
    }

    // Mark which notifications have been read by this user
    const userModel = role.charAt(0).toUpperCase() + role.slice(1);
    const processedNotifications = notifications.map(notification => {
      const isRead = Array.isArray(notification.isRead) ? notification.isRead : [];
      const readStatus = isRead.find(
        item => String(item.user) === String(id) && item.userModel === userModel
      );

      return {
        ...notification,
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
    
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const userModel = role.charAt(0).toUpperCase() + role.slice(1);
    const isRead = Array.isArray(notification.isRead) ? notification.isRead : [];

    // Check if already marked as read
    const alreadyRead = isRead.some(
      item => String(item.user) === String(id) && item.userModel === userModel
    );

    if (!alreadyRead) {
      const newIsRead = [
        ...isRead,
        {
          user: id,
          userModel,
          readAt: new Date()
        }
      ];

      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: newIsRead }
      });
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

    const { user, notifications } = await getNotificationsForUser(role, id);

    if (!user) {
      const label = role.charAt(0).toUpperCase() + role.slice(1);
      return res.status(404).json({
        success: false,
        message: `${label} not found`
      });
    }

    // Count unread notifications
    const userModel = role.charAt(0).toUpperCase() + role.slice(1);
    const unreadCount = notifications.filter(notification => {
      const isRead = Array.isArray(notification.isRead) ? notification.isRead : [];
      return !isRead.some(
        item => String(item.user) === String(id) && item.userModel === userModel
      );
    }).length;

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

// Get notification history (for admins and HODs to see sent notifications)
exports.getNotificationHistory = async (req, res) => {
  try {
    const { role, id } = req.user;
    const { search, type, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    // Only allow admins and HODs to view notification history
    if (role !== 'admin' && role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and HODs can view notification history.'
      });
    }

    // Build query
    const query = {};

    // Filter by creator for HODs (they can only see their own notifications)
    if (role === 'hod') {
      query.createdBy = id;
      query.createdByModel = 'HOD';
    }

    // Search by title or description
    if (search) {
      query.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.lte = new Date(dateTo);
      }
    }

    // Get total count for pagination
    const total = await prisma.notification.count({ where: query });

    // Get notifications with pagination
    const notifications = await prisma.notification.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: (parseInt(page, 10) - 1) * parseInt(limit, 10)
    });

    // Manually resolve the polymorphic createdBy reference (name/email)
    const creatorIds = [...new Set(notifications.map(n => n.createdBy).filter(Boolean))];
    if (creatorIds.length > 0) {
      const [admins, faculties, hods] = await Promise.all([
        prisma.admin.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true, email: true } }),
        prisma.faculty.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true, email: true } }),
        prisma.hOD.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true, email: true } })
      ]);
      const creatorMap = new Map();
      [...admins, ...faculties, ...hods].forEach(c => creatorMap.set(c.id, c));
      notifications.forEach(n => {
        if (n.createdBy && creatorMap.has(n.createdBy)) {
          n.createdBy = creatorMap.get(n.createdBy);
        }
      });
    }

    // Calculate recipient counts for each notification
    const notificationsWithCounts = await Promise.all(
      notifications.map(async (notification) => {
        let recipientCount = 0;
        const recipients = notification.recipients;

        // Count students
        if (recipients.students && recipients.students.all) {
          recipientCount += await prisma.student.count();
        } else if (recipients.students) {
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
            recipientCount += await prisma.student.count({ where: { AND: filters } });
          }
        }

        // Count faculty
        if (recipients.faculty && recipients.faculty.all) {
          recipientCount += await prisma.faculty.count();
        } else if (recipients.faculty) {
          const filters = [];

          if (recipients.faculty.courses && recipients.faculty.courses.length > 0) {
            filters.push({ course: { in: recipients.faculty.courses } });
          }
          if (recipients.faculty.departments && recipients.faculty.departments.length > 0) {
            filters.push({ department: { in: recipients.faculty.departments } });
          }

          if (filters.length > 0) {
            recipientCount += await prisma.faculty.count({ where: { AND: filters } });
          }
        }

        // Count admins
        if (recipients.admins && recipients.admins.all) {
          recipientCount += await prisma.admin.count();
        } else if (recipients.admins && recipients.admins.names && recipients.admins.names.length > 0) {
          recipientCount += await prisma.admin.count({ where: { name: { in: recipients.admins.names } } });
        }

        // Count HODs
        if (recipients.hods && recipients.hods.all) {
          recipientCount += await prisma.hOD.count();
        } else if (recipients.hods) {
          const filters = [];

          if (recipients.hods.courses && recipients.hods.courses.length > 0) {
            filters.push({ course: { in: recipients.hods.courses } });
          }
          if (recipients.hods.departments && recipients.hods.departments.length > 0) {
            filters.push({ department: { in: recipients.hods.departments } });
          }

          if (filters.length > 0) {
            recipientCount += await prisma.hOD.count({ where: { AND: filters } });
          }
        }

        // Count direct emails
        if (recipients.emails && recipients.emails.length > 0) {
          recipientCount += recipients.emails.length;
        }

        return {
          ...notification,
          recipientCount,
          readCount: Array.isArray(notification.isRead) ? notification.isRead.length : 0
        };
      })
    );

    res.status(200).json({
      success: true,
      data: notificationsWithCounts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message
    });
  }
};

// Helper function to send notification emails
async function sendNotificationEmails(notification) {
  try {
    const recipients = notification.recipients;
    let emailList = [];

    console.log('📧 Starting email collection for notification:', notification.title);
    console.log('Recipients object:', JSON.stringify(recipients, null, 2));

    // Get student emails - only if actually selected
    if (recipients.students && (recipients.students.all ||
        (recipients.students.courses && recipients.students.courses.length > 0) ||
        (recipients.students.branches && recipients.students.branches.length > 0) ||
        (recipients.students.passoutYears && recipients.students.passoutYears.length > 0))) {
      console.log('👨‍🎓 Processing student recipients...');
      let studentQuery = {};

      if (!recipients.students.all) {
        const filters = [];

        if (recipients.students.courses && recipients.students.courses.length > 0) {
          filters.push({ course: { in: recipients.students.courses } });
          console.log('   - Courses filter:', recipients.students.courses);
        }

        if (recipients.students.branches && recipients.students.branches.length > 0) {
          filters.push({ branch: { in: recipients.students.branches } });
          console.log('   - Branches filter:', recipients.students.branches);
        }

        if (recipients.students.passoutYears && recipients.students.passoutYears.length > 0) {
          filters.push({ passoutYear: { in: recipients.students.passoutYears } });
          console.log('   - Passout years filter:', recipients.students.passoutYears);
        }

        if (filters.length > 0) {
          studentQuery = { AND: filters };
        } else {
          console.log('   ⚠️ Student filters exist but are empty - skipping students');
        }
      } else {
        console.log('   - Fetching ALL students');
      }

      if (recipients.students.all || Object.keys(studentQuery).length > 0) {
        const students = await prisma.student.findMany({ where: studentQuery, select: { email: true } });
        console.log(`   ✅ Found ${students.length} students`);
        emailList = [...emailList, ...students.map(s => s.email)];
      }
    } else if (recipients.students) {
      console.log('   ⚠️ Students recipient object exists but nothing selected - skipping');
    }
    
    // Get faculty emails
    if (recipients.faculty) {
      console.log('👨‍🏫 Processing faculty recipients...');
      if (recipients.faculty.all) {
        console.log('   - Fetching ALL faculty');
        const faculty = await prisma.faculty.findMany({ select: { email: true } });
        console.log(`   ✅ Found ${faculty.length} faculty members`);
        emailList = [...emailList, ...faculty.map(f => f.email)];
      } else {
        const filters = [];

        if (recipients.faculty.courses && recipients.faculty.courses.length > 0) {
          filters.push({ course: { in: recipients.faculty.courses } });
          console.log('   - Courses filter:', recipients.faculty.courses);
        }

        if (recipients.faculty.departments && recipients.faculty.departments.length > 0) {
          filters.push({ department: { in: recipients.faculty.departments } });
          console.log('   - Departments filter:', recipients.faculty.departments);
        }

        if (filters.length > 0) {
          const faculty = await prisma.faculty.findMany({ where: { AND: filters }, select: { email: true } });
          console.log(`   ✅ Found ${faculty.length} faculty members`);
          emailList = [...emailList, ...faculty.map(f => f.email)];
        } else {
          console.log('   ⚠️ No filters specified for faculty');
        }
      }
    }
    
    // Get admin emails
    if (recipients.admins) {
      console.log('👨‍💼 Processing admin recipients...');
      if (recipients.admins.all) {
        console.log('   - Fetching ALL admins');
        const admins = await prisma.admin.findMany({ select: { email: true } });
        console.log(`   ✅ Found ${admins.length} admins`);
        emailList = [...emailList, ...admins.map(a => a.email)];
      } else if (recipients.admins.names && recipients.admins.names.length > 0) {
        console.log('   - Names filter:', recipients.admins.names);
        const admins = await prisma.admin.findMany({ where: { name: { in: recipients.admins.names } }, select: { email: true } });
        console.log(`   ✅ Found ${admins.length} admins`);
        emailList = [...emailList, ...admins.map(a => a.email)];
      } else {
        console.log('   ⚠️ No filters specified for admins');
      }
    }

    // Get HOD emails
    if (recipients.hods) {
      console.log('👨‍💼 Processing HOD recipients...');
      if (recipients.hods.all) {
        console.log('   - Fetching ALL HODs');
        const hods = await prisma.hOD.findMany({ select: { email: true } });
        console.log(`   ✅ Found ${hods.length} HODs`);
        emailList = [...emailList, ...hods.map(h => h.email)];
      } else {
        const filters = [];

        if (recipients.hods.courses && recipients.hods.courses.length > 0) {
          filters.push({ course: { in: recipients.hods.courses } });
          console.log('   - Courses filter:', recipients.hods.courses);
        }

        if (recipients.hods.departments && recipients.hods.departments.length > 0) {
          filters.push({ department: { in: recipients.hods.departments } });
          console.log('   - Departments filter:', recipients.hods.departments);
        }

        if (filters.length > 0) {
          const hods = await prisma.hOD.findMany({ where: { AND: filters }, select: { email: true } });
          console.log(`   ✅ Found ${hods.length} HODs`);
          emailList = [...emailList, ...hods.map(h => h.email)];
        } else {
          console.log('   ⚠️ No filters specified for HODs');
        }
      }
    }

    // Add direct email addresses
    if (recipients.emails && Array.isArray(recipients.emails) && recipients.emails.length > 0) {
      console.log('📧 Processing direct email addresses...');
      console.log('   - Direct emails:', recipients.emails);
      emailList = [...emailList, ...recipients.emails];
      console.log(`   ✅ Added ${recipients.emails.length} direct emails`);
    }

    // Remove duplicates and filter out invalid emails
    emailList = [...new Set(emailList)].filter(email => email && email.includes('@'));

    console.log('✅ Final email list:', emailList);
    console.log(`📊 Total unique emails collected: ${emailList.length}`);

    // Send emails
    if (emailList.length > 0) {
      console.log('📤 Sending emails to recipients...');
      await sendBatchEmails(emailList, notification);
      console.log('✅ Emails sent successfully!');
    } else {
      console.log('⚠️ No emails to send - email list is empty!');
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
  
  // Get sender type (Admin, Faculty, or HOD)
  const senderType = notification.createdByModel || 'Admin';
  let senderColor, senderLabel;

  if (senderType === 'Admin') {
    senderColor = '#1a73e8'; // Blue for Admin
    senderLabel = 'TPO';
  } else if (senderType === 'HOD') {
    senderColor = '#f57c00'; // Orange for HOD
    senderLabel = 'HOD';
  } else {
    senderColor = '#0f9d58'; // Green for Faculty
    senderLabel = 'Faculty';
  }
  
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