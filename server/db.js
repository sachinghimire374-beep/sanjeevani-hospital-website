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
      kicker: 'Sanjeevani Hospital Pokhara',
      title: 'Good doctors.<br>Close to home.',
      lead: 'We have specialists across 18 departments, 24/7 emergency care, and a team that takes time to actually listen to you.',
      bg: '/uploads/1782291035438-m1op30.jpeg'
    },
    stats: [
      { label: 'Specialist Doctors', value: '10+' },
      { label: 'Departments', value: '10+' },
      { label: 'Patients Served', value: '50K+' },
      { label: 'Emergency Care', value: '24/7' }
    ],
    statsBand: [
      { label: 'Years Serving Pokhara', value: '12' },
      { label: 'Beds', value: '100+' },
      { label: 'Surgeries Performed', value: '6,200+' },
      { label: 'Patient Satisfaction', value: '100%' }
    ],
    whyChoose: [
      { tag: 'Open 24/7', title: 'Emergency care at any hour', body: 'Our emergency team does not have an off switch. Whether it is 2am or a festival day, someone is always here.' },
      { tag: 'Continuity of care', title: 'The same doctor, every visit', body: 'Your doctor remembers your history. You will not spend half the appointment explaining yourself again from scratch.' },
      { tag: 'No surprises', title: 'You know the cost before we start', body: 'We give you an estimate upfront. One clear bill at the end, in plain language, and we help with insurance paperwork.' }
    ],
    about: {
      title: 'Why we named our hospital after a healing herb',
      body1: 'Sanjivani was the herb that saved Lakshmana in the Ramayana. We chose that name as a simple promise — that whoever walks into Sanjeevani Hospital in Pokhara will be looked after properly, not just processed and sent on their way.',
      body2: 'We started small and have grown into a 100-bed hospital covering most medical specialties. But the way we work has not changed: be honest with patients, explain things in plain language, and give everyone the same standard of care.',
      mission: 'Quality healthcare for anyone who needs it, without turning anyone away.',
      vision: 'To be the hospital in Pokhara that people trust enough to recommend to their own family.',
      chairman_name: 'Dr. Rabeendra Prasad shrestha',
      chairman_photo: '/uploads/1782716465079-p2ai6i.jpg',
      chairman_message: 'It is with great pride and humility that I welcome you to Sanjeevani Hospital Pokhara. When we first envisioned this institution, our goal was simple yet profound: to build a place where every patient who walks through our doors — regardless of their background or circumstance — receives care that is not only medically excellent but also delivered with genuine warmth and dignity.\n\nOver the years, we have worked tirelessly to bring together a team of skilled specialists, compassionate nursing staff, and dedicated support personnel who share this same vision. We have invested in modern medical infrastructure and technology, not as an end in itself, but as a means to serve our community better — because we believe that quality healthcare should never be a privilege reserved for the few.\n\nPokhara and the surrounding region deserve a healthcare institution they can trust in their most vulnerable moments, and it is our continuing mission to be exactly that. As we look to the future, we remain committed to growth, to learning, and to holding ourselves to the highest standards of clinical and ethical excellence.\n\nOn behalf of everyone at Sanjeevani Hospital, thank you for placing your trust in us. We do not take that responsibility lightly.',
      director_name: 'Dr. Sarita Gurung',
      director_photo: '/uploads/1782716586127-0k7nk2.jpeg',
      director_message: 'As Medical Director, I have the honor of working alongside a team of physicians, surgeons, and clinical staff who share a deep commitment to the wellbeing of every patient who enters Sanjeevani Hospital. Medicine is a science, but it is practiced on human beings — and that is a distinction we never lose sight of.\n\nOur clinical teams bring years of training and experience across specialties including internal medicine, surgery, gynecology, pediatrics, orthopedics, and emergency care, among others. Every diagnosis and every treatment plan is approached with care, precision, and a commitment to keeping our patients fully informed about their health and their options. We believe patients heal best when they feel heard, respected, and involved in their own care.\n\nOur emergency department operates around the clock, because illness and injury do not follow a schedule, and neither do we. Beyond emergencies, we place equal importance on preventive care, accurate diagnosis, and long-term patient wellbeing — treating not just the immediate concern, but the whole person.',
      ceo_name: 'Mr. Yubaraj Acharya',
      ceo_photo: '/uploads/1782716292386-qqz5ne.jpg',
      ceo_message: "Running a hospital is, above all, an exercise in responsibility — to our patients, our staff, and the wider community of Pokhara that depends on us. As CEO, I see my role as ensuring that every department, every ward, and every service we offer operates with the discipline, efficiency, and compassion that patients deserve when they are at their most vulnerable.\n\nWe are proud to offer care across a wide range of specialties, backed by a team of experienced doctors, dedicated nurses, and support staff who understand that healthcare is as much about kindness as it is about clinical skill. Whether a patient arrives for a scheduled consultation or through our emergency doors in the middle of the night, our commitment to timely, respectful, and thorough care does not waver.\n\nWe also recognize that trust in a hospital is earned slowly and can be lost quickly. That is why we hold ourselves accountable to high standards — in hygiene, in patient safety, in transparency about treatment and costs, and in the ongoing training of everyone who works here. Our patients are not just cases to be managed; they are neighbors, family members, and members of the community we serve.\n\nThank you for allowing Sanjeevani Hospital to be part of your family's health journey.",
      md_name: '',
      md_photo: '',
      md_message: '',
      history: '',
      values: '',
      hospital_image: '/uploads/hospital-building.jpg',
      board: [],
      committee: []
    },
    contact: {
      emergencyPhone: '+977 061-578161',
      receptionPhone: '061-578161/ 061-578162',
      email: 'sanjeevanihospitalpokhara@gmail.com',
      address: 'Pokhara-12, Hospital Chowk, Kaski, Nepal\nOpen 24 hours for emergency care.',
      whatsappNumber: '+977',
      mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3515.8124614020207!2d83.99820087642442!3d28.213009875896407!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399595cc97d6da07%3A0xb548960916e30c35!2sSewa%20Hospital%20and%20Research%20Centre!5e0!3m2!1sen!2snp!4v1782983042103!5m2!1sen!2snp',
      mapShareUrl: 'https://maps.app.goo.gl/ddwxjbTddS4jVGa46'
    },
    seo: {
      metaTitle: 'Best Hospital in Pokhara - Sanjeevani Hospital Pokhara ',
      metaDescription: 'Sanjeevani Hospital Pokhara offers specialist care across 18 departments, 24/7 emergency services, and a dedicated team of doctors in Pokhara, Nepal.',
      keywords: 'best hospital pokhara, sanjeevani hospital, nepal hospital, emergency care pokhara',
      ogImage: ''
    },
    footer: {
      tagline: 'Pokhara-12, Hospital Chowk, Kaski, Nepal. Open 24 hours for emergency care.'
    },
    gallery_nav: [
      { name: 'Health Camp', children: [] },
      { name: 'Hospital Events', children: [
        { name: 'AGM' },
        { name: 'Events' }
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
    ['Anesthesia', '/assets/dept-icons/anesthesia.svg', 'Expert anesthesia care for surgical procedures, pain management, and critical care support.', '/uploads/dept/anesthesia.jpg'],
    ['Cardiology', '/assets/dept-icons/cardiology.svg', 'Comprehensive heart care including ECG, echocardiography, angioplasty, and cardiac follow-ups.', '/uploads/dept/cardiology.jpg'],
    ['Dental', '/assets/dept-icons/dental.svg', 'Full dental services including fillings, extractions, root canals, and cosmetic dentistry.', '/uploads/dept/dental.jpg'],
    ['Dermatology', '/assets/dept-icons/dermatology.svg', 'Diagnosis and treatment of skin, hair, and nail conditions including acne, eczema, and psoriasis.', '/uploads/dept/dermatology.jpg'],
    ['ENT', '/assets/dept-icons/ent.svg', 'Ear, nose, and throat care covering hearing loss, sinusitis, tonsillitis, and head & neck disorders.', '/uploads/dept/ent.jpg'],
    ['Gastroenterology', '/assets/dept-icons/gastroenterology.svg', 'Treatment of digestive system disorders including liver disease, IBS, ulcers, and endoscopy services.', '/uploads/dept/gastroenterology.jpg'],
    ['General Surgery', '/assets/dept-icons/general-surgery.svg', 'A wide range of surgical procedures from appendectomy and hernia repair to laparoscopic surgeries.', '/uploads/dept/general-surgery.jpg'],
    ['Gynecology', '/assets/dept-icons/gynecology.svg', "Complete women's health services including antenatal care, delivery, and gynecological procedures.", '/uploads/dept/gynecology.jpg'],
    ['Internal Medicine', '/assets/dept-icons/internal-medicine.svg', 'Diagnosis and management of complex internal conditions including diabetes, hypertension, and infections.', '/uploads/dept/internal-medicine.jpg'],
    ['Neurosurgery', '/assets/dept-icons/neurosurgery.svg', 'Surgical treatment of brain, spine, and nervous system disorders including tumors and spinal injuries.', '/uploads/dept/neurosurgery.jpg'],
    ['Orthopedic', '/assets/dept-icons/orthopedic.svg', 'Bone, joint, and muscle care including fracture treatment, joint replacement, and sports injuries.', '/uploads/dept/orthopedic.jpg'],
    ['Pediatric', '/assets/dept-icons/pediatric.svg', 'Specialized healthcare for infants, children, and adolescents covering growth, vaccines, and illnesses.', '/uploads/dept/pediatric.jpg'],
    ['Urology', '/assets/dept-icons/urology.svg', 'Treatment of urinary tract and male reproductive conditions including kidney stones and prostate issues.', '/uploads/dept/urology.jpg'],
    ['Radiology', '/assets/dept-icons/radiology.svg', 'Advanced diagnostic imaging including X-ray, ultrasound, CT scan, and MRI services.', '/uploads/dept/radiology.jpg'],
    ['Psychiatric', '/assets/dept-icons/psychiatric.svg', 'Mental health diagnosis and treatment for depression, anxiety, bipolar disorder, and substance use.', '/uploads/dept/psychiatric.jpg'],
    ['Ophthalmology', '/assets/dept-icons/ophthalmology.svg', 'Eye care services including cataract surgery, refractive error correction, and glaucoma management.', '/uploads/dept/ophthalmology.jpg'],
    ['Nephrology', '/assets/dept-icons/nephrology.svg', 'Kidney disease management including dialysis support, chronic kidney disease, and hypertension care.', '/uploads/dept/nephrology.jpg']
  ];
  const insert = db.prepare('INSERT INTO departments (name, icon, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)');
  rows.forEach((r, i) => insert.run(r[0], r[1], r[2], r[3], i + 1));
}

function ensureDoctors() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM doctors').get().c;
  if (count > 0) return;
  const schedule = JSON.stringify({ schedule: {
    Monday: { start: '09:00', end: '17:00' },
    Tuesday: { start: '09:00', end: '17:00' },
    Wednesday: { start: '09:00', end: '17:00' },
    Thursday: { start: '09:00', end: '17:00' },
    Friday: { start: '09:00', end: '17:00' },
    Saturday: { start: '09:00', end: '17:00' },
    Sunday: { start: '09:00', end: '17:00' }
  }});
  const rows = [
    ['Dr. Sarita Gurung', 'Obstetrics & Gynaecology', 'MBBS,MD', '10 yrs', 'Active', '10486', 'Gynecology'],
    ['Dr.Anil Pandey', 'Pediatrician', 'MBBS', 'above 10 yrs', 'Active', '20898', 'Pediatric'],
    ['Dr.Indra Kumar Gurung', 'Orthopedics', 'MBBS,MS', 'above 10 yrs', 'Active', '20872', 'Orthopedic'],
    ['Dr. Krishna Raj Adhikari', 'Internal Medici9ne', 'MBBS,MD', 'above 10 yrs', 'Active', '12721', 'Internal Medicine'],
    ['Dr.Kamal kumal', 'Internal Medicine- Cardiology', 'MBSS,MD', 'above 10 yrs', 'Active', '7088', 'Internal Medicine'],
    ['Dr. Anish Bhusal', 'Internal Medicine', 'MBSS,MD', 'above 10 yrs', 'Active', '14938', 'Internal Medicine'],
    ['Dr. Sunil Man  Bijukchhe', 'General & Laparoscopy Surgeon', 'MBBS,MS', 'above 10 yrs', 'Active', '9545', 'General Surgery'],
    ['Dr. Sunil Juharchan', 'General & Laparoscopy Surgeon', 'MBBS,MS', 'above 10 yrs', 'Active', '7694', 'General Surgery'],
    ['Dr. Roshan Pangeni', 'Radiologist', 'MBBS,MS', 'above 10 yrs', 'Active', '7467', 'Radiology'],
    ['Dr. Anup  Chapagain', 'Urologist', 'MBBS,MS,M.Ch', 'above 10 yrs', 'Active', '5226', 'Urology'],
    ['Dr. Pratikshya Dawadi', 'Anaesthesilogist', 'MBSS,MD', 'above 10 yrs', 'Active', '23067', 'Anesthesia']
  ];
  const insert = db.prepare('INSERT INTO doctors (name, specialty, qualification, experience, photo_url, status, availability, nmc_number, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  rows.forEach(r => insert.run(r[0], r[1], r[2], r[3], '', r[4], schedule, r[5], r[6]));
}

function ensureTestimonials() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM testimonials').get().c;
  if (count > 0) return;
  const rows = [
    ["I was nervous the whole time, but the nurses stayed with me and talked me through everything. I don't know what I would have done without them.", 'Maya Tamang', 'Patient, Maternity Ward'],
    ['Dr. Sharma spent almost 40 minutes with us. He drew a diagram to explain what was happening with my heart. First time a doctor has ever done that for me.', 'Hari Bahadur Thapa', 'Patient, Cardiology'],
    ['The ambulance was at our door in about 8 minutes. At that hour of the night, that 8 minutes was everything.', 'Kabita Adhikari', 'Family member, Emergency']
  ];
  const insert = db.prepare('INSERT INTO testimonials (quote, patient_name, role_label) VALUES (?, ?, ?)');
  rows.forEach(r => insert.run(...r));
}

function ensureNews() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM news').get().c;
  if (count > 0) return;
  const rows = [
    {
      title: 'Dr. Sarita Gurung Appointed as New Hospital Director',
      slug: 'dr-sarita-gurung-appointed-as-new-hospital-director',
      body: "Pokhara, Nepal – Sanjeevani Hospital Pokhara Pvt. Ltd. is pleased to announce the appointment of Dr. Sarita Gurung as the Hospital Director of the institution.\n\nDr. Gurung brings extensive experience, professional expertise, and a strong commitment to healthcare excellence. Her appointment marks an important milestone in the hospital's ongoing mission to provide quality, patient-centered, and accessible healthcare services to the community.\n\nAs Hospital Director, Dr. Gurung will oversee the hospital's strategic planning, clinical service enhancement, operational management, and institutional development. Under her leadership, Sanjeevani Hospital aims to strengthen its healthcare services, adopt innovative medical practices, and further improve patient care standards.\n\nThe management, medical team, and staff of Sanjeevani Hospital have expressed their confidence in Dr. Gurung's vision and leadership capabilities. Her dedication to healthcare advancement and community well-being is expected to contribute significantly to the hospital's continued growth and success.\n\nSanjeevani Hospital Pokhara Pvt. Ltd. warmly welcomes Dr. Sarita Gurung to her new role and looks forward to achieving new milestones in healthcare excellence under her guidance.",
      cover_image: '/uploads/1782716907512-usw4kz.jpeg',
      status: 'published',
      post_type: 'news',
      created_at: '2026-06-29 07:08:36',
      updated_at: '2026-06-29 07:08:36'
    },
    {
      title: 'Sanjeevani Hospital Pokhara Pvt. Ltd. Set for Grand Opening',
      slug: 'sanjeevani-hospital-pokhara-pvt-ltd-set-for-grand-opening',
      body: 'Pokhara, Nepal – Sanjeevani Hospital Pokhara Pvt. Ltd. is proud to announce that it is now fully prepared for its much-anticipated Grand Opening, marking the beginning of a new era in quality healthcare services for the people of Pokhara and surrounding regions.\n\nAfter months of meticulous planning, infrastructure development, and the establishment of modern medical facilities, the hospital is ready to welcome patients with a commitment to excellence, compassion, and innovation in healthcare.\n\nThe newly established hospital is equipped with advanced medical technology, modern healthcare facilities, and a dedicated team of experienced doctors, nurses, and healthcare professionals. With a patient-centered approach, Sanjeevani Hospital aims to provide comprehensive medical services while ensuring the highest standards of safety, care, and comfort.\n\nThe management of Sanjeevani Hospital expressed its excitement as the institution reaches this significant milestone. The grand opening represents not only the launch of a healthcare facility but also a commitment to improving community health and expanding access to quality medical services.\n\n"Our vision is to create a trusted healthcare destination where patients receive exceptional medical care with dignity and compassion. We are delighted to be ready for this historic moment and look forward to serving our community," stated the hospital management.\n\nThe upcoming grand opening ceremony will bring together distinguished guests, healthcare professionals, community leaders, and well-wishers to celebrate the launch of a hospital dedicated to advancing healthcare standards in the region.\n\nSanjeevani Hospital Pokhara Pvt. Ltd. extends its sincere gratitude to everyone who contributed to making this vision a reality and looks forward to embarking on its journey of delivering quality healthcare services for years to come.\n\nTogether, we are building a healthier future for our community.',
      cover_image: '/uploads/1782719606394-oif7ga.jpeg',
      status: 'published',
      post_type: 'news',
      created_at: '2026-06-29 07:53:33',
      updated_at: '2026-06-29 07:53:33'
    }
  ];
  const insert = db.prepare('INSERT INTO news (title, slug, body, cover_image, status, post_type, created_at, updated_at) VALUES (@title, @slug, @body, @cover_image, @status, @post_type, @created_at, @updated_at)');
  rows.forEach(r => insert.run(r));
}

function ensureGallery() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM gallery').get().c;
  if (count > 0) return;
  const rows = [
    ['Inside Hospital', '/uploads/1782717510356-qsxmju.jpg', ''],
    ['Inside Hospital', '/uploads/1782717561203-l5mzar.jpg', 'Nursing Station'],
    ['Inside Hospital', '/uploads/1782717579000-dfwiff.jpg', ''],
    ['Inside Hospital', '/uploads/1782718074411-l0ale2.jpg', ''],
    ['Inside Hospital', '/uploads/1782718085916-0ndmlm.jpg', ''],
    ['Inside Hospital', '/uploads/1782718099877-d9ja6t.jpg', '']
  ];
  const insert = db.prepare('INSERT INTO gallery (category, image_url, caption) VALUES (?, ?, ?)');
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
  ensureNews();
  ensureGallery();
}

module.exports = { db, initDb };
