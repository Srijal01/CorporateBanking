import cors from 'cors'
import crypto from 'node:crypto'
import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.join(__dirname, '..', 'data')
fs.mkdirSync(dataDirectory, { recursive: true })

const database = new Database(path.join(dataDirectory, 'corporate-banking.db'))
const jwtSecret = process.env.JWT_SECRET || 'local-development-secret-change-me'
database.pragma('foreign_keys = ON')
database.pragma('journal_mode = WAL')

database.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legal_name TEXT NOT NULL,
    account_number TEXT NOT NULL UNIQUE,
    currency TEXT NOT NULL DEFAULT 'NPR',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Administrator', 'Initiator', 'Approver')),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Suspended')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    account_number TEXT NOT NULL UNIQUE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    available_balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'NPR',
    status TEXT NOT NULL DEFAULT 'Active'
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    beneficiary TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending approval' CHECK (status IN ('Pending approval', 'Approved', 'Rejected')),
    approved_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    description TEXT NOT NULL,
    detail TEXT NOT NULL,
    amount REAL NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    cardholder TEXT NOT NULL,
    masked_number TEXT NOT NULL,
    monthly_limit REAL NOT NULL,
    available_limit REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active'
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    user_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex')
const seed = database.transaction(() => {
  if (database.prepare('SELECT id FROM organizations LIMIT 1').get()) return
  const organization = database.prepare('INSERT INTO organizations (legal_name, account_number) VALUES (?, ?)').run('Srijal Example Pvt Ltd', '2323345554322')
  const organizationId = organization.lastInsertRowid
  const addUser = database.prepare('INSERT INTO users (organization_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
  const admin = addUser.run(organizationId, 'Rijan Shrestha', 'admin@srijalexample.com', hashPassword('Srijal@123'), 'Administrator')
  addUser.run(organizationId, 'Anisha Karki', 'initiator@srijalexample.com', hashPassword('Initiator@123'), 'Initiator')
  addUser.run(organizationId, 'Bikash Thapa', 'approver@srijalexample.com', hashPassword('Approver@123'), 'Approver')
  const account = database.prepare('INSERT INTO accounts (organization_id, account_number, account_name, account_type, balance, available_balance) VALUES (?, ?, ?, ?, ?, ?)').run(organizationId, '2323345554322', 'Srijal Example Operating Account', 'Operating account', 18450280, 18450280)
  database.prepare('INSERT INTO transactions (account_id, description, detail, amount, direction, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(account.lastInsertRowid, 'Everest Bank Limited', 'Incoming transfer · Today, 09:42', 2500000, 'credit', '2024-09-26 09:42:00')
  database.prepare('INSERT INTO transactions (account_id, description, detail, amount, direction, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(account.lastInsertRowid, 'Lalitpur Power Company', 'Utility payment · Yesterday, 16:20', 94300, 'debit', '2024-09-25 16:20:00')
  database.prepare('INSERT INTO cards (organization_id, cardholder, masked_number, monthly_limit, available_limit) VALUES (?, ?, ?, ?, ?)').run(organizationId, 'Rijan Shrestha', '•••• 4821', 500000, 427500)
  database.prepare('INSERT INTO notifications (organization_id, user_id, title, body) VALUES (?, ?, ?, ?)').run(organizationId, admin.lastInsertRowid, 'Welcome to Northstar', 'Your organization banking workspace is ready.')
})
seed()
const organizationId = database.prepare('SELECT id FROM organizations LIMIT 1').get()?.id
const administratorId = database.prepare('SELECT id FROM users WHERE role = \'Administrator\' LIMIT 1').get()?.id
if (organizationId && administratorId && !database.prepare('SELECT id FROM payments WHERE organization_id = ? LIMIT 1').get(organizationId)) {
  const addPayment = database.prepare('INSERT INTO payments (organization_id, created_by, beneficiary, amount, purpose) VALUES (?, ?, ?, ?, ?)')
  addPayment.run(organizationId, administratorId, 'Himalayan Freight Pvt. Ltd.', 842500, 'Vendor payment')
  addPayment.run(organizationId, administratorId, 'Ridgeway Technologies', 1240000, 'Payroll batch')
  addPayment.run(organizationId, administratorId, 'Kantipur Office Supplies', 118750, 'Vendor payment')
}

const app = express()
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }))
app.use(express.json())

const loginSchema = z.object({ username: z.string().email(), password: z.string().min(8) })
const userSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email(), role: z.enum(['Initiator', 'Approver']) })
const paymentSchema = z.object({ beneficiary: z.string().trim().min(2).max(160), amount: z.number().positive().finite(), purpose: z.string().trim().min(2).max(180) })
const getUser = (request) => {
  const authorization = request.header('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  try {
    const token = jwt.verify(authorization.slice(7), jwtSecret)
    return database.prepare('SELECT * FROM users WHERE id = ? AND status = \'Active\'').get(Number(token.sub))
  } catch {
    return null
  }
}
const getOrganization = (user) => database.prepare('SELECT * FROM organizations WHERE id = ?').get(user.organization_id)
const logAction = (user, action, entityType, entityId, metadata = {}) => database.prepare('INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)').run(user.organization_id, user.id, action, entityType, entityId, JSON.stringify(metadata))
const requireUser = (request, response) => {
  const user = getUser(request)
  if (!user) response.status(401).json({ message: 'Authentication required' })
  return user
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok', database: 'sqlite' }))

app.post('/api/auth/login', (request, response) => {
  const parsed = loginSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Enter a valid email and password' })
  const user = database.prepare('SELECT * FROM users WHERE email = ? AND password_hash = ? AND status = \'Active\'').get(parsed.data.username, hashPassword(parsed.data.password))
  if (!user) return response.status(401).json({ message: 'Invalid credentials' })
  const organization = getOrganization(user)
  logAction(user, 'LOGIN', 'user', user.id)
  const token = jwt.sign({ sub: String(user.id), role: user.role, organizationId: user.organization_id }, jwtSecret, { expiresIn: '8h', issuer: 'northstar-corporate-banking' })
  return response.json({ token, user: { id: user.id, name: user.full_name, email: user.email, role: user.role }, organization })
})

app.get('/api/dashboard', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  const organization = getOrganization(user)
  const accounts = database.prepare('SELECT * FROM accounts WHERE organization_id = ? ORDER BY id').all(user.organization_id)
  const payments = database.prepare('SELECT p.*, u.full_name AS created_by_name FROM payments p JOIN users u ON u.id = p.created_by WHERE p.organization_id = ? ORDER BY p.created_at DESC').all(user.organization_id)
  const transactions = database.prepare('SELECT t.*, a.account_number FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.organization_id = ? ORDER BY t.created_at DESC LIMIT 10').all(user.organization_id)
  const cards = database.prepare('SELECT * FROM cards WHERE organization_id = ?').all(user.organization_id)
  const notifications = database.prepare('SELECT * FROM notifications WHERE organization_id = ? AND (user_id IS NULL OR user_id = ?) ORDER BY created_at DESC LIMIT 10').all(user.organization_id, user.id)
  return response.json({ organization, user: { id: user.id, name: user.full_name, email: user.email, role: user.role }, accounts, payments, transactions, cards, notifications })
})

app.get('/api/users', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  if (!user || user.role !== 'Administrator') return response.status(403).json({ message: 'Administrator access required' })
  return response.json(database.prepare('SELECT id, full_name AS name, email, role, status, created_at FROM users WHERE organization_id = ? ORDER BY id').all(user.organization_id))
})

app.post('/api/users', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  if (!user || user.role !== 'Administrator') return response.status(403).json({ message: 'Administrator access required' })
  const parsed = userSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Name, email, and a valid role are required' })
  const { name, email, role } = parsed.data
  try {
    const result = database.prepare('INSERT INTO users (organization_id, full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)').run(user.organization_id, name, email, hashPassword('Welcome@123'), role, 'Active')
    logAction(user, 'CREATE_USER', 'user', result.lastInsertRowid, { role, email })
    return response.status(201).json({ id: result.lastInsertRowid, name, email, role, status: 'Active', temporaryPassword: 'Welcome@123' })
  } catch (error) {
    return response.status(409).json({ message: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'That email already exists' : 'Could not create user' })
  }
})

app.get('/api/payments', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  return response.json(database.prepare('SELECT p.*, u.full_name AS created_by_name, a.full_name AS approved_by_name FROM payments p JOIN users u ON u.id = p.created_by LEFT JOIN users a ON a.id = p.approved_by WHERE p.organization_id = ? ORDER BY p.created_at DESC').all(user.organization_id))
})

app.get('/api/search', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  const query = String(request.query.q || '').trim()
  if (query.length < 2) return response.json({ payments: [], users: [], transactions: [] })
  const pattern = `%${query}%`
  const payments = database.prepare('SELECT id, beneficiary, purpose, amount, status FROM payments WHERE organization_id = ? AND (beneficiary LIKE ? OR purpose LIKE ?) ORDER BY created_at DESC LIMIT 10').all(user.organization_id, pattern, pattern)
  const users = database.prepare('SELECT id, full_name AS name, email, role, status FROM users WHERE organization_id = ? AND (full_name LIKE ? OR email LIKE ? OR role LIKE ?) ORDER BY full_name LIMIT 10').all(user.organization_id, pattern, pattern, pattern)
  const transactions = database.prepare('SELECT t.id, t.description, t.detail, t.amount, t.direction FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.organization_id = ? AND (t.description LIKE ? OR t.detail LIKE ?) ORDER BY t.created_at DESC LIMIT 10').all(user.organization_id, pattern, pattern)
  return response.json({ payments, users, transactions })
})

app.get('/api/reports/statement', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  const rows = database.prepare('SELECT t.created_at, t.description, t.detail, t.direction, t.amount, a.account_number FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.organization_id = ? ORDER BY t.created_at DESC').all(user.organization_id)
  const csv = ['Date,Description,Detail,Direction,Amount,Account number', ...rows.map((row) => [row.created_at, row.description, row.detail, row.direction, row.amount, row.account_number].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n')
  response.setHeader('Content-Type', 'text/csv; charset=utf-8')
  response.setHeader('Content-Disposition', 'attachment; filename="srijal-account-statement.csv"')
  return response.send(csv)
})

app.get('/api/audit', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  if (user.role !== 'Administrator') return response.status(403).json({ message: 'Administrator access required' })
  return response.json(database.prepare('SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at, u.full_name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.organization_id = ? ORDER BY a.created_at DESC LIMIT 100').all(user.organization_id))
})

app.post('/api/payments', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  if (!user || !['Administrator', 'Initiator'].includes(user.role)) return response.status(403).json({ message: 'Initiator or Administrator access required' })
  const parsed = paymentSchema.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ message: 'Beneficiary, amount, and purpose are required' })
  const { beneficiary, amount, purpose } = parsed.data
  const result = database.prepare('INSERT INTO payments (organization_id, created_by, beneficiary, amount, purpose) VALUES (?, ?, ?, ?, ?)').run(user.organization_id, user.id, beneficiary, Number(amount), purpose)
  logAction(user, 'CREATE_PAYMENT', 'payment', result.lastInsertRowid, { beneficiary, amount })
  return response.status(201).json(database.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid))
})

app.post('/api/payments/:id/approve', (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  if (!user || !['Administrator', 'Approver'].includes(user.role)) return response.status(403).json({ message: 'Approver or Administrator access required' })
  const payment = database.prepare('SELECT * FROM payments WHERE id = ? AND organization_id = ?').get(Number(request.params.id), user.organization_id)
  if (!payment) return response.status(404).json({ message: 'Payment not found' })
  database.prepare('UPDATE payments SET status = \'Approved\', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id, payment.id)
  logAction(user, 'APPROVE_PAYMENT', 'payment', payment.id)
  return response.json(database.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id))
})

const port = Number(process.env.API_PORT || 3001)
app.listen(port, () => console.log(`Corporate banking API listening on http://127.0.0.1:${port}`))
