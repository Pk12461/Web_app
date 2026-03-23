import 'dotenv/config';
import express from 'express';
import { Pool } from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const app = express();
const port = Number(process.env.PORT || 3000);
const staticRoot = process.cwd();
const adminApiKey = String(process.env.ADMIN_API_KEY || '').trim();
const corsOrigin = String(process.env.CORS_ORIGIN || '*').trim();

const requiredEnv = ['DATABASE_URL'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const initSql = `
CREATE TABLE IF NOT EXISTS mentorloop_leads (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  plan TEXT NOT NULL,
  currency TEXT NOT NULL,
  course TEXT NOT NULL,
  city TEXT NOT NULL,
  goal TEXT,
  source TEXT DEFAULT 'enrollment-page',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mentorloop_leads_email_idx ON mentorloop_leads (email);
CREATE INDEX IF NOT EXISTS mentorloop_leads_created_at_idx ON mentorloop_leads (created_at DESC);
`;

const sanitizeLead = (payload) => ({
  fullName: String(payload.fullName || '').trim(),
  email: String(payload.email || '').trim(),
  phone: String(payload.phone || '').trim(),
  plan: String(payload.plan || '').trim(),
  currency: String(payload.currency || '').trim(),
  course: String(payload.course || '').trim(),
  city: String(payload.city || '').trim(),
  goal: String(payload.goal || '').trim(),
  source: String(payload.source || 'enrollment-page').trim(),
});

const validateLead = (lead) => {
  const requiredFields = ['fullName', 'email', 'phone', 'plan', 'currency', 'course', 'city'];
  for (const field of requiredFields) {
    if (!lead[field]) {
      return `${field} is required`;
    }
  }

  if (!/^\S+@\S+\.\S+$/.test(lead.email)) {
    return 'email is invalid';
  }

  const validPlans = new Set(['starter', 'plus', 'mentor-pro']);
  if (!validPlans.has(lead.plan)) {
    return 'plan is invalid';
  }

  const validCurrencies = new Set(['INR', 'USD']);
  if (!validCurrencies.has(lead.currency)) {
    return 'currency is invalid';
  }

  return null;
};

const requireAdmin = (req, res, next) => {
  if (!adminApiKey) {
    return res.status(503).json({ error: 'ADMIN_API_KEY is not configured on server' });
  }

  const requestKey = String(req.header('x-admin-key') || '').trim();
  if (!requestKey || requestKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
};

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsOrigin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.static(staticRoot));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/enroll', async (req, res) => {
  const lead = sanitizeLead(req.body || {});
  const validationError = validateLead(lead);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO mentorloop_leads (
        full_name, email, phone, plan, currency, course, city, goal, source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
      `,
      [
        lead.fullName,
        lead.email,
        lead.phone,
        lead.plan,
        lead.currency,
        lead.course,
        lead.city,
        lead.goal || null,
        lead.source,
      ],
    );

    const inserted = result.rows[0];
    return res.status(201).json({
      ok: true,
      id: inserted.id,
      reference: `ML-${inserted.id}`,
      createdAt: inserted.created_at,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save enrollment', detail: error.message });
  }
});

app.get('/api/leads', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 25), 200);
  const plan = String(req.query.plan || '').trim();
  const email = String(req.query.email || '').trim();

  const where = [];
  const values = [];

  if (plan) {
    values.push(plan);
    where.push(`plan = $${values.length}`);
  }

  if (email) {
    values.push(email);
    where.push(`email = $${values.length}`);
  }

  values.push(limit);

  const sql = `
    SELECT id, full_name, email, phone, plan, currency, course, city, goal, source, created_at
    FROM mentorloop_leads
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC
    LIMIT $${values.length}
  `;

  try {
    const result = await pool.query(sql, values);
    return res.json({ count: result.rows.length, leads: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch leads', detail: error.message });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const indexFile = resolve(staticRoot, 'index.html');
  if (existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }

  return res.status(404).send('index.html not found');
});

const start = async () => {
  await pool.query(initSql);
  app.listen(port, () => {
    console.log(`MentorLoop server is running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

