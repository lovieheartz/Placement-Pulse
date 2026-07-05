const prisma = require('../lib/prisma');
const { sendNOCNotificationEmail } = require('../services/mailService');
const mailService = require('../services/mailService');
const storageService = require('../services/storageService');

// Submit NOC request
exports.submitNOCRequest = async (req, res) => {
  try {
    console.log('NOC submission request body:', req.body);
    console.log('NOC submission file:', req.file);
    
    const { universityRoll, personalEmail, subject, applicationText, name, course, branch, passoutYear } = req.body;
    const studentId = req.user.id;

    // Get student details from database
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Create NOC request using data from request body or student record
    const nocData = {
      studentId,
      name: name || student.name,
      universityRoll,
      personalEmail,
      collegeEmail: student.email,
      course: (course && course !== 'undefined') ? course : student.course,
      branch: (branch && branch !== 'undefined') ? branch : student.branch,
      passoutYear: (passoutYear && passoutYear !== 'undefined') ? parseInt(passoutYear) : student.passoutYear,
      subject,
      applicationText
    };

    // Upload attachment to Supabase Storage if a file was provided
    if (req.file) {
      const uploaded = await storageService.uploadMulterFile(
        req.file,
        storageService.FOLDERS.NOC
      );
      nocData.attachment = {
        filename: req.file.originalname,
        path: uploaded.publicUrl,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }

    console.log('Creating NOC with data:', nocData);
    const nocRequest = await prisma.nOC.create({ data: nocData });
    console.log('NOC saved successfully');

    // Send email to all admins
    try {
      const admins = await prisma.admin.findMany({ select: { email: true } });
      const adminEmails = admins.map(admin => admin.email);
      
      if (adminEmails.length > 0) {
        // Create NOC email content
        const submissionDate = new Date(nocRequest.createdAt).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        const downloadUrl = nocRequest.attachment ?
          nocRequest.attachment.path : null;
        
        const emailContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New NOC Request</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f7fa;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://nsec.ac.in/wp-content/uploads/2022/05/NSEC-Logo.png" alt="NSEC Logo" style="height: 60px;">
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr>
                  <td style="background-color: #1a73e8; padding: 24px; text-align: center;">
                    <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">New NOC Request Submitted</h2>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0; line-height: 1.6; font-size: 16px; color: #333;">A new No Objection Certificate (NOC) request has been submitted by <strong>${student.name}</strong>.</p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 0 24px;">
                    <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; border-left: 4px solid #1a73e8; margin-bottom: 16px;">
                      <p style="margin: 0; font-weight: 600; color: #333; font-size: 14px; margin-bottom: 8px;">Student Details:</p>
                      <p style="margin: 0; color: #333; font-size: 14px;">Name: ${student.name}</p>
                      <p style="margin: 0; color: #333; font-size: 14px;">Email: ${student.email}</p>
                      <p style="margin: 0; color: #333; font-size: 14px;">University Roll: ${nocRequest.universityRoll}</p>
                      <p style="margin: 0; color: #333; font-size: 14px;">Course: ${nocRequest.course}</p>
                      <p style="margin: 0; color: #333; font-size: 14px;">Branch: ${nocRequest.branch}</p>
                      <p style="margin: 0; color: #333; font-size: 14px;">Submission Date: ${submissionDate}</p>
                    </div>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 0 24px 16px;">
                    <p style="margin: 0; font-weight: 600; color: #333; font-size: 14px;">Subject:</p>
                    <p style="margin: 4px 0 0; color: #333; font-size: 14px;">${nocRequest.subject}</p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 0 24px 16px;">
                    <p style="margin: 0; font-weight: 600; color: #333; font-size: 14px;">Application:</p>
                    <div style="margin: 8px 0 0; padding: 16px; background-color: #f8f9fa; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #333;">
                      ${nocRequest.applicationText}
                    </div>
                  </td>
                </tr>
                
                ${downloadUrl ? `
                <tr>
                  <td style="padding: 16px 24px; border-top: 1px solid #eaeaea;">
                    <p style="margin: 0; font-weight: 600; color: #333; font-size: 14px; margin-bottom: 8px;">Attachment:</p>
                    <div style="text-align: center;">
                      <a href="${downloadUrl}" style="color: #ffffff; text-decoration: none; display: inline-block; padding: 10px 20px; background-color: #1a73e8; border-radius: 6px; font-weight: 500; margin-right: 10px;">
                        📄 View PDF
                      </a>
                      <a href="${downloadUrl}" download="${nocRequest.attachment.filename}" style="color: #ffffff; text-decoration: none; display: inline-block; padding: 10px 20px; background-color: #0f9d58; border-radius: 6px; font-weight: 500;">
                        ⬇️ Download
                      </a>
                    </div>
                  </td>
                </tr>
                ` : ''}
                
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                    <p style="margin: 0; font-size: 13px; color: #666; font-weight: 500;">NSEC Placement Portal - NOC Management</p>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #888;">Please log in to the admin portal to review and process this NOC request.</p>
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
        
        const mailOptions = {
          from: process.env.EMAIL_USER,
          bcc: adminEmails,
          subject: `NSEC Placement Portal - New NOC Request from ${student.name}`,
          html: emailContent
        };
        
        await mailService.transporter.sendMail(mailOptions);
        console.log('NOC notification emails sent to admins');
      }
    } catch (emailError) {
      console.error('Failed to send NOC notification emails:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'NOC request submitted successfully',
      data: nocRequest
    });
  } catch (error) {
    console.error('Submit NOC request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit NOC request',
      error: error.message
    });
  }
};

// Get student's NOC requests
exports.getStudentNOCRequests = async (req, res) => {
  try {
    const studentId = req.user.id;

    const nocRequests = await prisma.nOC.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });

    // Manually populate processedBy (Admin) -> { name }
    const processedByIds = [
      ...new Set(nocRequests.map(n => n.processedBy).filter(Boolean))
    ];
    let adminMap = {};
    if (processedByIds.length) {
      const admins = await prisma.admin.findMany({
        where: { id: { in: processedByIds } },
        select: { id: true, name: true }
      });
      adminMap = Object.fromEntries(admins.map(a => [a.id, { name: a.name }]));
    }
    const data = nocRequests.map(n => ({
      ...n,
      processedBy: n.processedBy ? (adminMap[n.processedBy] || null) : n.processedBy
    }));

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get student NOC requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NOC requests',
      error: error.message
    });
  }
};

// Get all NOC requests (Admin)
exports.getAllNOCRequests = async (req, res) => {
  try {
    const nocRequests = await prisma.nOC.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Manually populate studentId (Student) -> { name, email }
    const studentIds = [
      ...new Set(nocRequests.map(n => n.studentId).filter(Boolean))
    ];
    let studentMap = {};
    if (studentIds.length) {
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true, email: true }
      });
      studentMap = Object.fromEntries(
        students.map(s => [s.id, { name: s.name, email: s.email }])
      );
    }

    // Manually populate processedBy (Admin) -> { name }
    const processedByIds = [
      ...new Set(nocRequests.map(n => n.processedBy).filter(Boolean))
    ];
    let adminMap = {};
    if (processedByIds.length) {
      const admins = await prisma.admin.findMany({
        where: { id: { in: processedByIds } },
        select: { id: true, name: true }
      });
      adminMap = Object.fromEntries(admins.map(a => [a.id, { name: a.name }]));
    }

    const data = nocRequests.map(n => ({
      ...n,
      studentId: n.studentId ? (studentMap[n.studentId] || null) : n.studentId,
      processedBy: n.processedBy ? (adminMap[n.processedBy] || null) : n.processedBy
    }));

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get all NOC requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NOC requests',
      error: error.message
    });
  }
};

// Update NOC status (Admin)
exports.updateNOCStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;
    const adminId = req.user.id;

    const existing = await prisma.nOC.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'NOC request not found'
      });
    }

    const updateData = {
      status,
      processedBy: adminId,
      processedAt: new Date()
    };
    if (adminRemarks) {
      updateData.adminRemarks = adminRemarks;
    }

    const nocRequest = await prisma.nOC.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'NOC status updated successfully',
      data: nocRequest
    });
  } catch (error) {
    console.error('Update NOC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update NOC status',
      error: error.message
    });
  }
};