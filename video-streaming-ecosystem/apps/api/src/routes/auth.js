import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../utils/prisma.js';
import admin from '../utils/firebase-admin.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user.id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET || 'super-long-random-secret-key-change-this',
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || null,
    firebaseUid: user.firebaseUid || null,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Invalid name, email or password' });
    }

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'user',
      },
    });

    const token = signToken(user);

    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      transporter.sendMail({
        from: `"LumenStream" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@lumenstream.com'}>`,
        to: user.email,
        subject: 'Welcome to LumenStream!',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border-radius: 12px; background: #0f172a; color: #fff;">
            <h2 style="color: #a855f7;">Welcome to LumenStream ✨</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>Your account has been successfully created. Enjoy fast, ads-free VOD streaming!</p>
          </div>
        `,
      }).catch((e) => console.error('Registration Email Error:', e));
    }

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const cleanEmail = email.toLowerCase().trim();

    // Special Admin Login / Auto-seed check for Developer Rishav
    if (
      (cleanEmail === 'rishav9801' || cleanEmail === 'rishav9801@gmail.com' || cleanEmail === 'admin' || cleanEmail === 'admin@lumenstream.com') &&
      password === 'Rishav_9162809260'
    ) {
      let adminUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: 'rishav9801@gmail.com' },
            { email: 'admin@lumenstream.com' },
            { email: cleanEmail },
          ],
        },
      });

      if (!adminUser) {
        const passwordHash = await bcrypt.hash(password, 12);
        adminUser = await prisma.user.create({
          data: {
            name: 'Rishav Srivastawa',
            email: cleanEmail.includes('@') ? cleanEmail : 'rishav9801@gmail.com',
            passwordHash,
            role: 'admin',
          },
        });
      } else if (adminUser.role !== 'admin') {
        adminUser = await prisma.user.update({
          where: { id: adminUser.id },
          data: { role: 'admin' },
        });
      }

      const token = signToken(adminUser);
      return res.json({ token, user: publicUser(adminUser) });
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"LumenStream" <${process.env.SMTP_FROM || 'noreply@lumenstream.com'}>`,
        to: user.email,
        subject: 'Reset your password',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Reset Password
            </a>
          </div>
        `,
      }).catch((e) => console.error('SMTP Error:', e));
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Reset URL:', resetUrl);
    }

    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Invalid token or password (min 8 chars)' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user.userId) },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    const user = await prisma.user.update({
      where: { id: BigInt(req.user.userId) },
      data: { name: name.trim() },
    });

    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/firebase & /api/auth/session (Unified Firebase Token Session Verification)
const handleFirebaseAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });

    let decoded = null;

    // 1. Primary: Verify with firebase-admin
    try {
      if (admin && admin.apps && admin.apps.length) {
        decoded = await admin.auth().verifyIdToken(idToken);
      }
    } catch (adminErr) {
      console.warn('[Firebase Admin verifyIdToken note]:', adminErr.message);
    }

    // 2. Fallback: Google OAuth2 tokeninfo endpoint
    if (!decoded) {
      try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (googleRes.ok) {
          const payload = await googleRes.json();
          decoded = {
            uid: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
          };
        }
      } catch (fErr) {
        console.warn('[Tokeninfo Fallback note]:', fErr.message);
      }
    }

    if (!decoded || !decoded.uid) {
      return res.status(401).json({ error: 'Invalid or expired Firebase authentication token' });
    }

    const { uid, email, name, picture } = decoded;
    const cleanEmail = email ? email.toLowerCase().trim() : `${uid}@firebase.local`;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: uid },
          { email: cleanEmail },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: (name || 'Lumen User').trim(),
          firebaseUid: uid,
          avatar: picture || null,
          role: 'user',
          passwordHash: null,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firebaseUid: uid,
          avatar: picture || user.avatar,
        },
      });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('[Firebase Auth Route Error]:', err);
    res.status(500).json({ error: err.message || 'Authentication failed' });
  }
};

router.post('/firebase', handleFirebaseAuth);
router.post('/session', handleFirebaseAuth);

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { idToken, credential } = req.body;
    const tokenToVerify = idToken || credential;
    if (!tokenToVerify) return res.status(400).json({ error: 'Google credential / ID token is required' });

    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`);
    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Invalid Google authentication token' });
    }

    const payload = await googleRes.json();
    const { email, name } = payload;
    if (!email) return res.status(400).json({ error: 'Google account has no verified email' });

    const cleanEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      user = await prisma.user.create({
        data: {
          name: (name || 'Google User').trim(),
          email: cleanEmail,
          passwordHash,
          role: 'user',
        },
      });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const otpStore = new Map();

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanEmail, { otp, expiresAt: Date.now() + 600 * 1000 });

    // Hostinger SMTP Dispatcher (Primary Email OTP Engine)
    const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const smtpUser = process.env.SMTP_USER || 'lumenstream@viralnewsupdate.in';
    const smtpPass = process.env.SMTP_PASS || 'Rishav_9162809260';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpSecure = process.env.SMTP_SECURE !== 'false'; // true for 465 SSL

    if (process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || 'LumenStream <onboarding@resend.dev>',
            to: [cleanEmail],
            subject: `${otp} is your LumenStream verification code`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; border-radius: 20px; background: #09090b; color: #ffffff; border: 1px solid rgba(255,255,255,0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #a855f7; margin: 0; font-size: 24px; font-weight: 800; tracking-tight: -0.5px;">LumenStream</h2>
                </div>
                <p style="color: #e4e4e7; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">Use the following 6-digit code to complete your sign-in / verification on LumenStream:</p>
                <div style="margin: 24px 0; text-align: center; padding: 20px; background: rgba(168, 85, 247, 0.12); border-radius: 16px; border: 1px solid rgba(168, 85, 247, 0.25);">
                  <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #d8b4fe; font-family: monospace;">${otp}</span>
                </div>
                <p style="color: #71717a; font-size: 13px; margin-top: 24px; text-align: center;">Code expires in 10 minutes. If you did not request this code, please ignore this email.</p>
              </div>
            `,
          }),
        });

        if (!resendRes.ok) {
          const resendErr = await resendRes.json().catch(() => ({}));
          console.error('[Resend OTP Error]:', resendErr);
        } else {
          console.log(`[Resend OTP Delivered to ${cleanEmail}]: Code ${otp}`);
        }
      } catch (rErr) {
        console.error('[Resend Fetch Error]:', rErr.message);
      }
    } else {
      // Hostinger SMTP Dispatch
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const fromAddress = process.env.SMTP_FROM || `"LumenStream" <${smtpUser}>`;

        await transporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject: `${otp} is your LumenStream verification code`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; border-radius: 20px; background: #09090b; color: #ffffff; border: 1px solid rgba(255,255,255,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #a855f7; margin: 0; font-size: 24px; font-weight: 800;">LumenStream</h2>
              </div>
              <p style="color: #e4e4e7; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">Your 6-digit verification OTP code is:</p>
              <div style="margin: 24px 0; text-align: center; padding: 20px; background: rgba(168, 85, 247, 0.12); border-radius: 16px; border: 1px solid rgba(168, 85, 247, 0.25);">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #d8b4fe; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #71717a; font-size: 13px; margin-top: 24px; text-align: center;">Valid for 10 minutes. Sent via Hostinger Mail (${smtpUser}).</p>
            </div>
          `,
        });

        console.log(`[Hostinger SMTP OTP Sent to ${cleanEmail}]: ${otp}`);
      } catch (smtpErr) {
        console.error('[Hostinger SMTP Error]:', smtpErr.message);
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Dev Mode OTP for ${cleanEmail}]: ${otp}`);
    }

    res.json({ message: 'Verification OTP sent successfully', otp: process.env.NODE_ENV !== 'production' ? otp : undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const cleanEmail = email.toLowerCase().trim();
    const stored = otpStore.get(cleanEmail);
    if (!stored || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired or is invalid' });
    }

    if (stored.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid 6-digit verification code' });
    }

    otpStore.delete(cleanEmail);
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
