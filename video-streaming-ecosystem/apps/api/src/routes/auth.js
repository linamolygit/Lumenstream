import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../utils/prisma.js';
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

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
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

export default router;
