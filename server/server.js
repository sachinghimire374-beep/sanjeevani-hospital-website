require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');

// ---------------------------------------------------------------------------
// Mailer — Resend HTTP API (Render blocks outbound SMTP ports on its free
// tier, so raw SMTP/nodemailer can never connect; Resend sends over HTTPS).
// ---------------------------------------------------------------------------
async function sendViaResend(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const placeholders = ['', 're_your_api_key_here'];
  if (!apiKey || placeholders.includes(apiKey)) return { skipped: true };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Sanjeevani Hospital <onboarding@resend.dev>',
      to, subject, html
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Resend responded with ${res.status}`);
  return data;
}

function confirmationEmailHtml(a) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f7f6;margin:0;padding:0;}
    .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .header{background:linear-gradient(135deg,#0A4760,#0D5D78);padding:32px 36px;color:#fff;}
    .header h1{margin:0;font-size:22px;font-weight:700;}
    .header p{margin:6px 0 0;font-size:14px;opacity:.8;}
    .body{padding:32px 36px;}
    .body p{color:#3C5560;font-size:15px;line-height:1.7;margin:0 0 16px;}
    .detail-box{background:#F3F7EE;border-left:4px solid #8CC63E;border-radius:8px;padding:18px 20px;margin:20px 0;}
    .detail-box table{width:100%;border-collapse:collapse;}
    .detail-box td{padding:5px 0;font-size:14px;color:#0A4760;vertical-align:top;}
    .detail-box td:first-child{font-weight:700;width:120px;color:#0D5D78;}
    .badge{display:inline-block;background:#8CC63E;color:#0A2A12;font-weight:700;font-size:13px;padding:6px 16px;border-radius:50px;margin-bottom:20px;}
    .footer-note{font-size:12px;color:#8AA1A8;border-top:1px solid #eee;padding-top:18px;margin-top:8px;}
    .footer-note a{color:#0D5D78;}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>Sanjeevani Hospital Pokhara</h1>
      <p>Your appointment has been confirmed</p>
    </div>
    <div class="body">
      <p>Dear <strong>${a.patient_name}</strong>,</p>
      <p>We are pleased to confirm your appointment at <strong>Sanjeevani Hospital Pokhara</strong>. Please find your booking details below.</p>
      <span class="badge">✓ Appointment Confirmed</span>
      <div class="detail-box">
        <table>
          <tr><td>Patient</td><td>${a.patient_name}</td></tr>
          <tr><td>Doctor</td><td>${a.doctor || 'To be assigned'}</td></tr>
          <tr><td>Department</td><td>${a.department || '—'}</td></tr>
          <tr><td>Date</td><td>${a.appt_date || '—'}</td></tr>
          <tr><td>Time</td><td>${a.appt_time || '—'}</td></tr>
          <tr><td>Phone</td><td>${a.phone}</td></tr>
        </table>
      </div>
      <p>Please arrive <strong>10 minutes early</strong> and bring any previous medical records or reports.</p>
      <p>To reschedule or cancel, call us at <strong>${process.env.HOSPITAL_PHONE || '+977 61-000000'}</strong> at least 2 hours before your appointment.</p>
      <p class="footer-note">
        Sanjeevani Hospital Pokhara · Pokhara-12, Hospital Chowk, Nepal<br>
        This is an automated message — please do not reply directly to this email.
        For queries contact <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a>
      </p>
    </div>
  </div>
  </body></html>`;
}

function bookingReceivedEmailHtml(a) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f7f6;margin:0;padding:0;}
    .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .header{background:linear-gradient(135deg,#0A4760,#0D5D78);padding:32px 36px;color:#fff;}
    .header h1{margin:0;font-size:22px;font-weight:700;}
    .header p{margin:6px 0 0;font-size:14px;opacity:.8;}
    .body{padding:32px 36px;}
    .body p{color:#3C5560;font-size:15px;line-height:1.7;margin:0 0 16px;}
    .detail-box{background:#F3F7EE;border-left:4px solid #0D5D78;border-radius:8px;padding:18px 20px;margin:20px 0;}
    .detail-box table{width:100%;border-collapse:collapse;}
    .detail-box td{padding:5px 0;font-size:14px;color:#0A4760;vertical-align:top;}
    .detail-box td:first-child{font-weight:700;width:120px;color:#0D5D78;}
    .badge{display:inline-block;background:#E6F4FB;color:#0A4760;font-weight:700;font-size:13px;padding:6px 16px;border-radius:50px;margin-bottom:20px;border:1px solid #B3D9ED;}
    .footer-note{font-size:12px;color:#8AA1A8;border-top:1px solid #eee;padding-top:18px;margin-top:8px;}
    .footer-note a{color:#0D5D78;}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>Sanjeevani Hospital Pokhara</h1>
      <p>Appointment request received</p>
    </div>
    <div class="body">
      <p>Dear <strong>${a.patient_name}</strong>,</p>
      <p>Thank you for reaching out to <strong>Sanjeevani Hospital Pokhara</strong>. We have received your appointment request and our team will review it shortly.</p>
      <span class="badge">⏳ Request Received — Pending Confirmation</span>
      <div class="detail-box">
        <table>
          <tr><td>Patient</td><td>${a.patient_name}</td></tr>
          ${a.doctor ? `<tr><td>Doctor</td><td>${a.doctor}</td></tr>` : ''}
          <tr><td>Department</td><td>${a.department || '—'}</td></tr>
          <tr><td>Date</td><td>${a.appt_date || '—'}</td></tr>
          <tr><td>Time</td><td>${a.appt_time || '—'}</td></tr>
          <tr><td>Phone</td><td>${a.phone}</td></tr>
        </table>
      </div>
      <p>Our front desk will call you at <strong>${a.phone}</strong> to confirm your slot within the hour during working hours.</p>
      <p>You will also receive a separate confirmation email once your appointment is approved.</p>
      <p>For urgent help, please call us at <strong>${process.env.HOSPITAL_PHONE || '+977 61-578161'}</strong>.</p>
      <p class="footer-note">
        Sanjeevani Hospital Pokhara · Pokhara-12, Hospital Chowk, Nepal<br>
        This is an automated message — please do not reply directly to this email.
        For queries contact <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a>
      </p>
    </div>
  </div>
  </body></html>`;
}

function rejectionEmailHtml(a) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f7f6;margin:0;padding:0;}
    .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .header{background:linear-gradient(135deg,#4A2020,#7A3030);padding:32px 36px;color:#fff;}
    .header h1{margin:0;font-size:22px;font-weight:700;}
    .header p{margin:6px 0 0;font-size:14px;opacity:.8;}
    .body{padding:32px 36px;}
    .body p{color:#3C5560;font-size:15px;line-height:1.7;margin:0 0 16px;}
    .badge{display:inline-block;background:#FFF0F0;color:#7A3030;font-weight:700;font-size:13px;padding:6px 16px;border-radius:50px;margin-bottom:20px;border:1px solid #EDB3B3;}
    .footer-note{font-size:12px;color:#8AA1A8;border-top:1px solid #eee;padding-top:18px;margin-top:8px;}
    .footer-note a{color:#0D5D78;}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <h1>Sanjeevani Hospital Pokhara</h1>
      <p>Appointment request update</p>
    </div>
    <div class="body">
      <p>Dear <strong>${a.patient_name}</strong>,</p>
      <p>We regret to inform you that your appointment request for <strong>${a.appt_date || 'the requested date'}</strong> could not be accommodated at this time.</p>
      <span class="badge">✕ Request Could Not Be Confirmed</span>
      <p>This may be due to doctor unavailability or a scheduling conflict. We apologise for the inconvenience.</p>
      <p>Please call us at <strong>${process.env.HOSPITAL_PHONE || '+977 61-578161'}</strong> to reschedule or to book with another doctor or date.</p>
      <p class="footer-note">
        Sanjeevani Hospital Pokhara · Pokhara-12, Hospital Chowk, Nepal<br>
        This is an automated message — please do not reply directly to this email.
        For queries contact <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a>
      </p>
    </div>
  </div>
  </body></html>`;
}

async function sendMail(to, subject, html, label) {
  try {
    const result = await sendViaResend(to, subject, html);
    if (result.skipped) { console.log(`Resend not configured — skipping ${label}.`); return; }
    console.log(`${label} sent to ${to}`);
  } catch (err) {
    console.error(`${label} send error:`, err.message);
  }
}

async function sendBookingReceivedEmail(appt) {
  if (!appt.email) return;
  await sendMail(
    appt.email,
    `Appointment Request Received · Sanjeevani Hospital Pokhara`,
    bookingReceivedEmailHtml(appt),
    'Booking-received email'
  );
}

async function sendConfirmationEmail(appt) {
  if (!appt.email) return;
  await sendMail(
    appt.email,
    `Appointment Confirmed — ${appt.appt_date || 'Upcoming'} · Sanjeevani Hospital Pokhara`,
    confirmationEmailHtml(appt),
    'Confirmation email'
  );
}

async function sendRejectionEmail(appt) {
  if (!appt.email) return;
  await sendMail(
    appt.email,
    `Appointment Request Update · Sanjeevani Hospital Pokhara`,
    rejectionEmailHtml(appt),
    'Rejection email'
  );
}

const { db, initDb } = require('./db');
const { signToken, requireAuth } = require('./auth');

initDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Static frontend (public website + admin panel)
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------------------------
// FILE UPLOADS
// ---------------------------------------------------------------------------
const uploadDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only images (JPG, PNG, WebP, GIF) and PDF files are allowed.'));
  }
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  res.json({ url: '/uploads/' + req.file.filename });
});
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) return res.status(400).json({ error: err.message });
  next(err);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getContent(key) {
  const row = db.prepare('SELECT value FROM site_content WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}
function setContent(key, value) {
  const exists = db.prepare('SELECT key FROM site_content WHERE key = ?').get(key);
  if (exists) {
    db.prepare('UPDATE site_content SET value = ? WHERE key = ?').run(JSON.stringify(value), key);
  } else {
    db.prepare('INSERT INTO site_content (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  }
}
function slugify(str) {
  return String(str).toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  const token = signToken(user);
  res.json({ token, user: { username: user.username, role: user.role } });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true });
});

app.post('/api/auth/update-email', requireAuth, (req, res) => {
  const { email, currentPassword } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email.trim().toLowerCase(), user.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Forgot / Reset password (token sent to admin email)
// ---------------------------------------------------------------------------
function resetEmailHtml(resetUrl) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f7f6;margin:0;padding:0;}
    .wrap{max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .header{background:linear-gradient(135deg,#0A4760,#0D5D78);padding:28px 36px;color:#fff;}
    .header h1{margin:0;font-size:20px;font-weight:700;}
    .body{padding:32px 36px;}
    .body p{color:#3C5560;font-size:15px;line-height:1.7;margin:0 0 16px;}
    .reset-btn{display:inline-block;background:#8CC63E;color:#0A2A12;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;margin:8px 0 20px;}
    .note{font-size:12px;color:#8AA1A8;border-top:1px solid #eee;padding-top:14px;margin-top:4px;}
  </style></head><body>
  <div class="wrap">
    <div class="header"><h1>Sanjeevani Hospital — Password Reset</h1></div>
    <div class="body">
      <p>You (or someone) requested a password reset for the Sanjeevani Hospital admin panel.</p>
      <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a class="reset-btn" href="${resetUrl}">Reset my password</a>
      <p>If the button does not work, copy and paste this link into your browser:<br>
         <small style="color:#0D5D78;word-break:break-all;">${resetUrl}</small></p>
      <p class="note">If you did not request this, ignore this email — your password has not changed.</p>
    </div>
  </div></body></html>`;
}

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.json({ ok: true, message: 'If that email is registered, a reset link has been sent.' });

  // Look up admin by email stored in users table
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND (role = ? OR role = ?)').get(email.trim(), 'admin', 'super_admin');
  if (!user) {
    return res.json({ ok: true, message: 'If that email is registered, a reset link has been sent.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
  db.prepare('UPDATE users SET reset_token=?, reset_token_expiry=? WHERE id=?').run(token, expiry, user.id);

  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const resetUrl = `${proto}://${req.get('host')}/admin/?token=${token}`;

  try {
    const result = await sendViaResend(user.email, 'Admin Password Reset — Sanjeevani Hospital CMS', resetEmailHtml(resetUrl));
    if (result.skipped) {
      return res.status(503).json({ error: 'Email service is not configured. Please set RESEND_API_KEY to use password reset.' });
    }
    res.json({ ok: true, message: 'Reset link sent! Check your email inbox.' });
  } catch (err) {
    console.error('Reset email error:', err.message);
    res.status(500).json({ error: 'Failed to send reset email. Check email service settings.' });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Token and new password (min 6 characters) are required.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expiry || Date.now() > user.reset_token_expiry) {
    return res.status(400).json({ error: 'This reset link has expired or is invalid. Please request a new one.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=?, reset_token=NULL, reset_token_expiry=NULL WHERE id=?').run(hash, user.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// PUBLIC: aggregated site data (used by the public homepage in one call)
// ---------------------------------------------------------------------------
app.get('/api/site', (req, res) => {
  const departments = db.prepare('SELECT * FROM departments ORDER BY sort_order ASC, id ASC').all();
  const doctors = db.prepare('SELECT * FROM doctors ORDER BY id ASC').all();
  const testimonials = db.prepare('SELECT * FROM testimonials ORDER BY id DESC').all();
  const news = db.prepare("SELECT id, title, slug, cover_image, attachment_url, created_at, post_type FROM news WHERE status = 'published' ORDER BY created_at DESC LIMIT 6").all();
  const gallery = db.prepare('SELECT * FROM gallery ORDER BY id DESC').all();

  res.json({
    hero: getContent('hero'),
    stats: getContent('stats'),
    statsBand: getContent('statsBand'),
    whyChoose: getContent('whyChoose'),
    about: getContent('about'),
    contact: getContent('contact'),
    seo: getContent('seo'),
    footer: getContent('footer'),
    gallery_nav: getContent('gallery_nav') || [],
    departments,
    doctors,
    testimonials,
    news,
    gallery
  });
});

// ---------------------------------------------------------------------------
// CONTENT (hero, stats, about, contact, seo, footer, whyChoose) — admin only
// ---------------------------------------------------------------------------
const CONTENT_KEYS = ['hero', 'stats', 'statsBand', 'whyChoose', 'about', 'contact', 'seo', 'footer', 'gallery_nav'];
const CONTENT_DEFAULTS = {
  gallery_nav: [
    { name: 'Health Camp', children: [] },
    { name: 'Hospital Events', children: [{ name: 'AGM' }] },
    { name: 'Inside Hospital', children: [] }
  ]
};

app.get('/api/content/:key', requireAuth, (req, res) => {
  if (!CONTENT_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'Unknown content section.' });
  const val = getContent(req.params.key);
  res.json(val !== null ? val : (CONTENT_DEFAULTS[req.params.key] ?? null));
});

app.put('/api/content/:key', requireAuth, (req, res) => {
  if (!CONTENT_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'Unknown content section.' });
  setContent(req.params.key, req.body);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// DEPARTMENTS
// ---------------------------------------------------------------------------
app.get('/api/departments', (req, res) => {
  res.json(db.prepare('SELECT * FROM departments ORDER BY sort_order ASC, id ASC').all());
});
app.post('/api/departments', requireAuth, (req, res) => {
  const { name, icon, description, image_url } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Department name is required.' });
  const info = db.prepare('INSERT INTO departments (name, icon, description, image_url) VALUES (?, ?, ?, ?)')
    .run(name, icon || '🏥', description || '', image_url || '');
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/departments/:id', requireAuth, (req, res) => {
  const { name, icon, description, image_url } = req.body || {};
  db.prepare('UPDATE departments SET name=?, icon=?, description=?, image_url=? WHERE id=?')
    .run(name, icon, description, image_url, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/departments/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM departments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// DOCTORS
// ---------------------------------------------------------------------------
app.get('/api/doctors', (req, res) => {
  res.json(db.prepare('SELECT * FROM doctors ORDER BY id ASC').all());
});
app.post('/api/doctors', requireAuth, (req, res) => {
  const { name, specialty, qualification, experience, photo_url, status, availability, nmc_number, department } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Doctor name is required.' });
  const info = db.prepare(`INSERT INTO doctors (name, specialty, qualification, experience, photo_url, status, availability, nmc_number, department)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, specialty || '', qualification || '', experience || '', photo_url || '', status || 'Active', availability || '', nmc_number || '', department || '');
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/doctors/:id', requireAuth, (req, res) => {
  const { name, specialty, qualification, experience, photo_url, status, availability, nmc_number, department } = req.body || {};
  db.prepare(`UPDATE doctors SET name=?, specialty=?, qualification=?, experience=?, photo_url=?, status=?, availability=?, nmc_number=?, department=? WHERE id=?`)
    .run(name, specialty, qualification, experience, photo_url, status, availability, nmc_number || '', department || '', req.params.id);
  res.json({ ok: true });
});
app.delete('/api/doctors/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM doctors WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// TESTIMONIALS
// ---------------------------------------------------------------------------
app.get('/api/testimonials', (req, res) => {
  res.json(db.prepare('SELECT * FROM testimonials ORDER BY id DESC').all());
});
app.post('/api/testimonials', requireAuth, (req, res) => {
  const { quote, patient_name, role_label } = req.body || {};
  if (!quote || !patient_name) return res.status(400).json({ error: 'Quote and patient name are required.' });
  const info = db.prepare('INSERT INTO testimonials (quote, patient_name, role_label) VALUES (?, ?, ?)')
    .run(quote, patient_name, role_label || '');
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/testimonials/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM testimonials WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// NEWS / BLOG
// ---------------------------------------------------------------------------
app.get('/api/news', (req, res) => {
  const { status, type } = req.query;
  let sql = 'SELECT * FROM news';
  const params = [];
  const conds = [];
  if (status) { conds.push('status = ?'); params.push(status); }
  if (type)   { conds.push('post_type = ?'); params.push(type); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});
app.get('/api/news/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM news WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Article not found.' });
  res.json(row);
});
app.post('/api/news', requireAuth, (req, res) => {
  const { title, body, cover_image, attachment_url, status, meta_title, meta_description, post_type } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  let slug = slugify(title);
  const clash = db.prepare('SELECT id FROM news WHERE slug = ?').get(slug);
  if (clash) slug = slug + '-' + Date.now();
  const info = db.prepare(`INSERT INTO news (title, slug, body, cover_image, attachment_url, status, meta_title, meta_description, post_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, slug, body || '', cover_image || '', attachment_url || '', status || 'draft', meta_title || '', meta_description || '', post_type || 'news');
  res.json({ id: info.lastInsertRowid, slug });
});
app.put('/api/news/:id', requireAuth, (req, res) => {
  const { title, body, cover_image, attachment_url, status, meta_title, meta_description, post_type } = req.body || {};
  db.prepare(`UPDATE news SET title=?, body=?, cover_image=?, attachment_url=?, status=?, meta_title=?, meta_description=?, post_type=?, updated_at=datetime('now') WHERE id=?`)
    .run(title, body, cover_image, attachment_url || '', status, meta_title, meta_description, post_type || 'news', req.params.id);
  res.json({ ok: true });
});
app.delete('/api/news/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM news WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GALLERY
// ---------------------------------------------------------------------------
app.get('/api/gallery', (req, res) => {
  const category = req.query.category;
  const rows = category
    ? db.prepare('SELECT * FROM gallery WHERE category = ? ORDER BY id DESC').all(category)
    : db.prepare('SELECT * FROM gallery ORDER BY id DESC').all();
  res.json(rows);
});
app.post('/api/gallery', requireAuth, (req, res) => {
  const { category, image_url, caption } = req.body || {};
  if (!image_url) return res.status(400).json({ error: 'Image URL is required.' });
  const info = db.prepare('INSERT INTO gallery (category, image_url, caption) VALUES (?, ?, ?)')
    .run(category || 'Hospital', image_url, caption || '');
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/gallery/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM gallery WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// APPOINTMENTS
// ---------------------------------------------------------------------------

// Slot generation helpers
function genSlots(start, end) {
  const slots = [];
  let [h, m] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  while (h * 60 + m < eh * 60 + em) {
    const ap = h < 12 ? 'AM' : 'PM';
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slots.push(`${dh}:${String(m).padStart(2,'0')} ${ap}`);
    m += 30; if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}

function parseOldHoursStr(str) {
  if (!str) return null;
  const toHHMM = s => {
    s = s.trim();
    const ap = /([AP]M)$/i.exec(s);
    const mt = /(\d{1,2}):(\d{2})/.exec(s);
    if (!mt) return null;
    let h = parseInt(mt[1]); const mn = mt[2];
    if (ap) {
      if (/PM/i.test(ap[1]) && h !== 12) h += 12;
      if (/AM/i.test(ap[1]) && h === 12) h = 0;
    }
    return String(h).padStart(2,'0') + ':' + mn;
  };
  const parts = str.split(/\s*[–—]\s*|\s+-\s+/);
  if (parts.length < 2) return null;
  const s = toHHMM(parts[0]), e = toHHMM(parts[1]);
  return s && e ? { start: s, end: e } : null;
}

function getDayRange(availStr, dayName) {
  try {
    const av = JSON.parse(availStr || '{}');
    if (av.schedule && av.schedule[dayName]) return av.schedule[dayName];
    if (av.days && av.days.includes(dayName) && av.hours) return parseOldHoursStr(av.hours);
  } catch(e) {}
  return null;
}

app.get('/api/slots', (req, res) => {
  const { doctor_id, date } = req.query;
  if (!doctor_id || !date) return res.json({ slots: [], booked: [] });
  const doc = db.prepare('SELECT availability FROM doctors WHERE id=?').get(Number(doctor_id));
  if (!doc) return res.json({ slots: [], booked: [] });
  const [y, mo, d] = date.split('-').map(Number);
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(y, mo-1, d).getDay()];
  const range = getDayRange(doc.availability, dayName);
  if (!range) return res.json({ slots: [], booked: [], reason: 'Not available on ' + dayName });
  const all = genSlots(range.start, range.end);
  const bookedRows = db.prepare('SELECT slot_time FROM booked_slots WHERE doctor_id=? AND slot_date=?').all(Number(doctor_id), date);
  const bookedSet = new Set(bookedRows.map(r => r.slot_time));
  res.json({ slots: all.filter(s => !bookedSet.has(s)), booked: [...bookedSet], day: dayName });
});

app.get('/api/appointments', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM appointments ORDER BY created_at DESC').all());
});
app.post('/api/appointments', (req, res) => {
  const { patient_name, phone, email, department, doctor_id, appt_date, appt_time } = req.body || {};
  if (!patient_name || !phone) return res.status(400).json({ error: 'Name and phone number are required.' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'A valid email address is required.' });

  const resolvedId = doctor_id ? Number(doctor_id) : null;
  let doctorName = req.body.doctor || '';
  if (resolvedId) {
    const docRow = db.prepare('SELECT name FROM doctors WHERE id=?').get(resolvedId);
    if (docRow) doctorName = docRow.name;
  }

  if (resolvedId && appt_date && appt_time) {
    const existing = db.prepare('SELECT id FROM booked_slots WHERE doctor_id=? AND slot_date=? AND slot_time=?').get(resolvedId, appt_date, appt_time);
    if (existing) return res.status(409).json({ error: 'That time slot was just taken. Please choose another.' });
  }

  const info = db.prepare(
    `INSERT INTO appointments (patient_name, phone, email, department, doctor, doctor_id, appt_date, appt_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(patient_name, phone, email, department || '', doctorName, resolvedId, appt_date || '', appt_time || '');

  if (resolvedId && appt_date && appt_time) {
    try {
      db.prepare('INSERT INTO booked_slots (doctor_id, slot_date, slot_time, appointment_id) VALUES (?, ?, ?, ?)')
        .run(resolvedId, appt_date, appt_time, info.lastInsertRowid);
    } catch(e) {}
  }

  // Send booking-received acknowledgment (fire-and-forget — don't block the HTTP response)
  const newAppt = db.prepare('SELECT * FROM appointments WHERE id=?').get(info.lastInsertRowid);
  if (newAppt) sendBookingReceivedEmail(newAppt).catch(() => {});

  res.json({ id: info.lastInsertRowid, message: 'Appointment request received. We will confirm shortly.' });
});
app.put('/api/appointments/:id', requireAuth, async (req, res) => {
  const { status } = req.body || {};
  db.prepare('UPDATE appointments SET status=? WHERE id=?').run(status, req.params.id);
  if (status === 'Approved' || status === 'Rejected') {
    const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
    if (appt) {
      if (status === 'Approved') await sendConfirmationEmail(appt);
      else await sendRejectionEmail(appt);
    }
  }
  res.json({ ok: true });
});
app.delete('/api/appointments/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM booked_slots WHERE appointment_id=?').run(req.params.id);
  db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/smtp-status', requireAuth, (req, res) => {
  const apiKey = process.env.RESEND_API_KEY;
  const configured = !!(apiKey && apiKey !== 're_your_api_key_here');
  res.json({ configured, from: configured ? (process.env.EMAIL_FROM || 'onboarding@resend.dev') : null });
});

// ---------------------------------------------------------------------------
// DASHBOARD SUMMARY
// ---------------------------------------------------------------------------
app.get('/api/dashboard', requireAuth, (req, res) => {
  const totalAppointments = db.prepare('SELECT COUNT(*) AS c FROM appointments').get().c;
  const pendingAppointments = db.prepare("SELECT COUNT(*) AS c FROM appointments WHERE status='Pending'").get().c;
  const totalDoctors = db.prepare('SELECT COUNT(*) AS c FROM doctors').get().c;
  const totalDepartments = db.prepare('SELECT COUNT(*) AS c FROM departments').get().c;
  const recent = db.prepare('SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5').all();
  res.json({ totalAppointments, pendingAppointments, totalDoctors, totalDepartments, recent });
});

// ---------------------------------------------------------------------------
// Fallback: send admin or public index for unknown non-API routes (SPA-style)
// ---------------------------------------------------------------------------
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sanjeevani Hospital server running on port ${PORT}`);
});
