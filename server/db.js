const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'data.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialty TEXT,
  qualification TEXT,
  experience TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'Active',
  availability TEXT,
  nmc_number TEXT,
  department TEXT
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote TEXT NOT NULL,
  patient_name TEXT,
  role_label TEXT
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  body TEXT,
  cover_image TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'draft',
  meta_title TEXT,
  meta_description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT,
  image_url TEXT NOT NULL,
  caption TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_name TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  doctor TEXT,
  appt_date TEXT,
  appt_time TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booked_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL,
  slot_date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  appointment_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(doctor_id, slot_date, slot_time)
);
`);

// ---------- Seed default admin user ----------
function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'change_this_password';
  const adminEmail = process.env.ADMIN_EMAIL || 'sanjeevanihospitalpokhara@gmail.com';
  const existing = db.prepare('SELECT id, email FROM users WHERE username = ?').get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, ?, ?)').run(username, hash, 'super_admin', adminEmail);
    console.log(`Created admin user "${username}".`);
  } else if (!existing.email) {
    // backfill email for existing admin accounts
    try { db.prepare('UPDATE users SET email = ? WHERE username = ?').run(adminEmail, username); } catch(e){}
  }
}

// ---------- Seed default site content (only if empty) ----------
function ensureSiteContent() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM site_content').get().c;
  if (count > 0) return;

  const defaults = {
    hero: {
      kicker: 'Sanjeevani — the herb of life, restored',
      title: 'Healing rooted in <em>care</em>,<br>built for Pokhara.',
      lead: 'Sanjeevani Hospital brings together specialist doctors, modern diagnostics, and round-the-clock emergency care.'
    },
    stats: [
      { label: 'Specialist Doctors', value: '40+' },
      { label: 'Departments', value: '18' },
      { label: 'Patients Served', value: '50K+' },
      { label: 'Emergency Care', value: '24/7' }
    ],
    statsBand: [
      { label: 'Years Serving Pokhara', value: '12' },
      { label: 'Beds', value: '180+' },
      { label: 'Surgeries Performed', value: '6,200+' },
      { label: 'Patient Satisfaction', value: '98%' }
    ],
    whyChoose: [
      { tag: 'Always on', title: '24/7 emergency & ambulance', body: 'A dedicated trauma team and ambulance fleet on standby across Pokhara, every hour of the year.' },
      { tag: 'Always near', title: 'Specialists who know your file', body: "Consultants follow your case from first visit to recovery — no re-explaining your history at every visit." },
      { tag: 'Always clear', title: 'Transparent costs, in advance', body: 'Every procedure comes with an upfront estimate, insurance support, and a single itemised bill.' }
    ],
    about: {
      title: "Why we're named after a healing herb",
      body1: 'In the Ramayana, the Sanjeevani booti restored Lakshmana when all hope seemed lost. We chose that name as a promise: that every patient who walks through our doors in Pokhara will be met with the same urgency and care.',
      body2: 'Since opening, our team has grown into a 180-bed facility spanning multiple departments — built around Nepali families, staffed by Nepali doctors, and held to international standards of care.',
      mission: 'Deliver accessible, dignified healthcare to every patient who needs it, regardless of background.',
      vision: "To be Pokhara's most trusted name in healthcare by 2030.",
      chairman_message: 'Welcome to Sanjeevani Hospital. Our promise has always been simple: care for all, without compromise.',
      director_message: 'Every department here is built around one question — what would make this easier for the patient?',
      history: 'Sanjeevani Hospital opened its doors in Pokhara with a mission to bring specialist care closer to the families who need it most.',
      values: 'Compassion, transparency, and clinical excellence guide every decision we make.'
    },
    contact: {
      emergencyPhone: '+977 61-000000',
      receptionPhone: '+977 61-000001',
      email: 'info@sanjeevanihospital.com.np',
      address: 'Lakeside Road, Pokhara-6, Kaski, Nepal. Open 24 hours for emergency care.',
      mapEmbedUrl: '',
      whatsappNumber: '+9779800000000'
    },
    seo: {
      metaTitle: 'Sanjeevani Hospital Pokhara — Care for All',
      metaDescription: 'Sanjeevani Hospital Pokhara offers specialist care across 18 departments, 24/7 emergency services, and a dedicated team of doctors in Pokhara, Nepal.',
      keywords: 'hospital pokhara, sanjeevani hospital, nepal hospital, emergency care pokhara',
      ogImage: ''
    },
    footer: {
      tagline: 'Lakeside Road, Pokhara-6, Kaski, Nepal. Open 24 hours for emergency care.'
    },
    gallery_nav: [
      { name: 'Health Camp', children: [] },
      { name: 'Hospital Events', children: [
        { name: 'AGM' }
      ]},
      { name: 'Inside Hospital', children: [] }
    ]
  };

  const insert = db.prepare('INSERT INTO site_content (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, JSON.stringify(value));
  }
}

function ensureDepartments() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM departments').get().c;
  if (count > 0) return;
  const rows = [
    ['Cardiology', '❤️', 'Full heart diagnostics, angioplasty and long-term cardiac rehab.'],
    ['Orthopedics', '🦴', 'Joint replacement, sports injury and spine care.'],
    ['Pediatrics', '🧒', 'Newborn care, vaccination and child wellness checkups.'],
    ['Gynecology & Maternity', '🤰', "Antenatal care, safe delivery and women's health."],
    ['ICU & Critical Care', '🛏️', '24/7 monitored intensive care with ventilator support.'],
    ['Emergency & Trauma', '🚑', 'Round-the-clock emergency response with ambulance dispatch.'],
    ['General Surgery', '🔬', 'Minimally invasive and laparoscopic surgical care.'],
    ['Neurology', '🧠', 'Stroke care, epilepsy management and nerve disorders.']
  ];
  const insert = db.prepare('INSERT INTO departments (name, icon, description, sort_order) VALUES (?, ?, ?, ?)');
  rows.forEach((r, i) => insert.run(r[0], r[1], r[2], i));
}

function ensureDoctors() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM doctors').get().c;
  if (count > 0) return;
  const rows = [
    ['Dr. Rajesh Sharma', 'Cardiology', 'MD, FACC', '16 yrs', 'Active'],
    ['Dr. Anjali Pradhan', 'Gynecology', 'MS, MD', '12 yrs', 'Active'],
    ['Dr. Bikash Gurung', 'Orthopedics', 'MS Ortho', '14 yrs', 'On Leave'],
    ['Dr. Sunita K.C.', 'Pediatrics', 'MD Peds', '10 yrs', 'Active']
  ];
  const insert = db.prepare('INSERT INTO doctors (name, specialty, qualification, experience, status) VALUES (?, ?, ?, ?, ?)');
  rows.forEach(r => insert.run(...r));
}

function ensureTestimonials() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM testimonials').get().c;
  if (count > 0) return;
  const rows = [
    ['The maternity team kept us calm through a difficult delivery. We will always be grateful.', 'Maya Tamang', 'Patient, Maternity Ward'],
    ['Dr. Sharma explained everything in plain language. No rushed appointments here.', 'Hari Bahadur Thapa', 'Patient, Cardiology'],
    ['Ambulance reached us in under ten minutes. That speed mattered most that night.', 'Kabita Adhikari', 'Family member, Emergency']
  ];
  const insert = db.prepare('INSERT INTO testimonials (quote, patient_name, role_label) VALUES (?, ?, ?)');
  rows.forEach(r => insert.run(...r));
}

function runMigrations() {
  const migrations = [
    'ALTER TABLE appointments ADD COLUMN email TEXT',
    'ALTER TABLE appointments ADD COLUMN doctor_id INTEGER',
    'ALTER TABLE users ADD COLUMN reset_token TEXT',
    'ALTER TABLE users ADD COLUMN reset_token_expiry INTEGER',
    "ALTER TABLE news ADD COLUMN post_type TEXT DEFAULT 'news'",
    'ALTER TABLE users ADD COLUMN email TEXT',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch(e) { /* column already exists */ }
  }
}

function initDb() {
  runMigrations();
  ensureAdminUser();
  ensureSiteContent();
  ensureDepartments();
  ensureDoctors();
  ensureTestimonials();
}

module.exports = { db, initDb };
