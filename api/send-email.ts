import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.MOUAU_PORTAL_KEY && !process.env.mouau_portal_key) {
    return res.status(500).json({ error: 'MOUAU_PORTAL_KEY is missing in Vercel Environment Variables.' });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'mouau.portal.verify@gmail.com',
        pass: process.env.MOUAU_PORTAL_KEY || process.env.mouau_portal_key,
      },
    });

    const info = await transporter.sendMail({
      from: '"MOUAU Portal" <mouau.portal.verify@gmail.com>',
      to: email, // Dynamic email of the registering user
      subject: 'Your MOUAU Portal Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-w: 600px; margin: 0 auto;">
          <h2 style="color: #006837;">MOUAU Courseware Portal Verification</h2>
          <p style="color: #444; font-size: 16px;">You recently requested to register for the MOUAU Courseware Management System.</p>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Your Verification Code</p>
            <p style="margin: 10px 0 0; font-size: 32px; font-family: monospace; font-weight: bold; color: #1a1a1a;">${code}</p>
          </div>
          <p style="color: #444; font-size: 14px;">Please enter this exact code in the portal to complete your registration securely.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #888;">If you did not request this verification, please ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return res.status(500).json({ error: error.message || 'Error sending email' });
  }
}
