import 'dotenv/config';
import nodemailer from 'nodemailer';

const DEV_EMAIL_MODE = (process.env.EMAIL_MODE || 'dev').toLowerCase() === 'dev';

if (!DEV_EMAIL_MODE) {
  const missingEmailSettings = ['EMAIL_HOST', 'EMAIL_USERNAME', 'EMAIL_PASSWORD']
    .filter((name) => !process.env[name]);

  if (missingEmailSettings.length) {
    console.warn(
      `SMTP email mode enabled but missing: ${missingEmailSettings.join(', ')}`,
    );
  }
}

const transporter = DEV_EMAIL_MODE
  ? {
      sendMail: async (mailOptions) => {
        console.log('📧 DEV EMAIL:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
        });
        return { messageId: 'dev-mode' };
      },
    }
  : nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: String(process.env.EMAIL_PORT || '587') === '465',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

const getFromAddress = (label = 'App') => {
  const username = process.env.EMAIL_USERNAME;
  if (!username) {
    return `${label} <${process.env.EMAIL_USERNAME || 'dev@localhost'}>`;
  }
  return `${label} <${username}>`;
};

export const sendAppointmentConfirmation = async (email, appointmentDetails) => {
  try {
    await transporter.sendMail({
      from: getFromAddress('restaurant Shop'),
      to: email,
      subject: 'Your Appointment Confirmation',
      html: `
        <h2>Appointment Confirmed</h2>
        <p>Date: ${appointmentDetails.date}</p>
        <p>Time: ${appointmentDetails.time}</p>
        <p>restaurant: ${appointmentDetails.restaurantName}</p>
        <p>Service: ${appointmentDetails.serviceName} ($${appointmentDetails.price})</p>
      `,
    });
  } catch (err) {
    console.error('Email sending error:', err);
  }
};

export const sendPasswordReset = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: getFromAddress('restaurant Shop'),
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>Click <a href="${resetUrl}">here</a> to reset your password</p>
      <p>This link expires in 10 minutes</p>
    `,
  });
};