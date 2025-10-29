// src/services/liveClassEmail.service.js
import nodemailer from 'nodemailer';
import db from '../models/index.js';
const { Batch, User, LiveClass } = db;

// Use same SMTP config as other email services
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const notifyLiveClass = async (liveClass) => {
  try {
    // Reload with batch -> students
    const cls = await LiveClass.findByPk(liveClass.id, {
      include: [
        { model: Batch, as: 'batch', include: [{ model: User, as: 'students', attributes: ['id', 'email', 'name'] }] },
        { model: User, as: 'instructor', attributes: ['id', 'email', 'name'] }
      ]
    });

    if (!cls) return;

    const studentList = (cls.batch?.students || []).filter(s => s.email).map(s => s.email);
    const instructorEmail = cls.instructor?.email;

    const startLocal = new Date(cls.start_time).toLocaleString();

    // Email students
    if (studentList.length) {
      const mailOptions = {
        from: `"LMS" <${process.env.SMTP_USER}>`,
        to: studentList.join(','),
        subject: `Upcoming Live Class: ${cls.topic}`,
        html: `
          <p>Hi,</p>
          <p>A live class has been scheduled for your batch <strong>${cls.batch?.batch_name || ''}</strong>:</p>
          <ul>
            <li><strong>Topic:</strong> ${cls.topic}</li>
            <li><strong>Start:</strong> ${startLocal}</li>
            <li><strong>Duration:</strong> ${cls.duration} minutes</li>
          </ul>
          <p><a href="${cls.zoom_join_url}">Click here to join the class</a></p>
          <p>Regards,<br/>LMS Team</p>
        `
      };
      await transporter.sendMail(mailOptions);
    }

    // Email instructor confirmation (optional)
    if (instructorEmail) {
      const mailOptions = {
        from: `"LMS" <${process.env.SMTP_USER}>`,
        to: instructorEmail,
        subject: `Live Class Created: ${cls.topic}`,
        html: `
          <p>Hi ${cls.instructor?.name || ''},</p>
          <p>Your live class "${cls.topic}" has been created for batch <strong>${cls.batch?.batch_name || ''}</strong>.</p>
          <p><strong>Start:</strong> ${startLocal}</p>
          <p><a href="${cls.zoom_start_url}">Start the meeting</a></p>
          <p>Regards,<br/>LMS Team</p>
        `
      };
      await transporter.sendMail(mailOptions);
    }

    console.log('Live class notifications sent.');
  } catch (err) {
    console.error('notifyLiveClass error:', err);
  }
};
