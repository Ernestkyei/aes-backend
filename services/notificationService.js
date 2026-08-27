// services/notificationService.js
import { sendEmail } from '../config/email.js';
import { sendSMS } from '../config/sms.js';


const DASHBOARD_URL = `${process.env.FRONTEND_URL}/applicant/dashboard`;

const sendNotifications = async ({ user, subject, html, text, smsMessage }) => {
  const results = [];

  if (user.email) {
    const emailResult = await sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
    results.push({ type: 'email', ...emailResult });
  }

  if (user.phoneNumber && smsMessage) {
    const smsResult = await sendSMS({
      to: user.phoneNumber,
      message: smsMessage,
    });
    results.push({ type: 'sms', ...smsResult });
  }

  return results;
};

export const sendDecisionNotification = async (user, application) => {
  const status = application.status;

  if (status === 'APPROVED') {
    const subject = 'Congratulations! Your Application Has Been Approved!';
    const notes = application.notes ? `<p style="color: #555; line-height: 1.6; padding: 10px; background: #f8f9fa; border-radius: 5px;"><strong>Notes:</strong> ${application.notes}</p>` : '';

    return sendNotifications({
      user,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: #ffd700; margin: 0;">🎉 Congratulations!</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1a1a2e;">Hello ${user.firstName}!</h2>
            <p style="color: #333; line-height: 1.6;">We are pleased to inform you that your application for <strong>${application.program}</strong> has been <strong style="color: green;">APPROVED</strong>! 🎉</p>
            <div style="margin: 20px 0; padding: 15px; background: #e6f7e6; border-radius: 8px; border-left: 4px solid green;">
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: green;">✅ Status: APPROVED</p>
            </div>
            <p style="color: #333; line-height: 1.6;">Your admission letter is now available. Please log in to download it.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${DASHBOARD_URL}" style="background: #1a1a2e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Admission Letter</a>
            </div>
            ${notes}
            <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
              If you have any questions, contact our admissions office.
            </p>
          </div>
        </div>
      `,
      text: `
        Congratulations ${user.firstName}! 🎉

        Your application for ${application.program} has been APPROVED!

        Your admission letter is now available. Please log in to download it.

        View your admission letter: ${DASHBOARD_URL}

        ${application.notes ? `Notes: ${application.notes}` : ''}

        If you have any questions, contact our admissions office.
      `,
      smsMessage: `Congratulations ${user.firstName}! Your application for ${application.program} has been APPROVED. Log in to view your admission letter: ${DASHBOARD_URL}`,
    });
  }

  if (status === 'REJECTED') {
    const subject = 'Application Status Update';
    const reason = application.notes
      ? `<p style="color: #555; line-height: 1.6; padding: 10px; background: #f8f9fa; border-radius: 5px;"><strong>Reason:</strong> ${application.notes}</p>`
      : '<p style="color: #555; line-height: 1.6;">Thank you for your interest in our program. We encourage you to apply again in the next admissions cycle.</p>';

    return sendNotifications({
      user,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: #ffd700; margin: 0;">📋 Application Update</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1a1a2e;">Hello ${user.firstName}!</h2>
            <p style="color: #333; line-height: 1.6;">We regret to inform you that your application for <strong>${application.program}</strong> has been <strong style="color: red;">REJECTED</strong>.</p>
            <div style="margin: 20px 0; padding: 15px; background: #fde8e8; border-radius: 8px; border-left: 4px solid red;">
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: red;">❌ Status: REJECTED</p>
            </div>
            ${reason}
            <p style="color: #333; line-height: 1.6;">We wish you the best in your future endeavors.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${DASHBOARD_URL}" style="background: #1a1a2e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Status</a>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
              If you have any questions, contact our admissions office.
            </p>
          </div>
        </div>
      `,
      text: `
        Hello ${user.firstName}!

        We regret to inform you that your application for ${application.program} has been REJECTED.

        ${application.notes ? `Reason: ${application.notes}` : 'Thank you for your interest in our program. We encourage you to apply again in the next admissions cycle.'}

        We wish you the best in your future endeavors.

        View your status: ${DASHBOARD_URL}
      `,
      smsMessage: `${user.firstName}, your application for ${application.program} has been REJECTED. Log in to view details: ${DASHBOARD_URL}`,
    });
  }

  return [];
};

export const sendGeneralNotification = async (user, subject, message) => {
  return sendNotifications({
    user,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">Hello ${user.firstName}!</h2>
        <p>${message}</p>
        <a href="${DASHBOARD_URL}" style="background: #1a1a2e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
      </div>
    `,
    text: `
      Hello ${user.firstName}!

      ${message}

      Go to dashboard: ${DASHBOARD_URL}
    `,
    smsMessage: user.phoneNumber ? `Admissions Registry: ${user.firstName}, ${message}` : '',
  });
};