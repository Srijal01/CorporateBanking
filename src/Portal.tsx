import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import './portal.css'

type Role = 'Administrator' | 'Initiator' | 'Approver'
type Page = 'Overview' | 'Payments' | 'Accounts' | 'Team & access' | 'Reports' | 'Audit log'
type Session = { id: number; name: string; email: string; role: Role }
type Payment = { id: number; beneficiary: string; amount: number; purpose: string; status: string; created_by_name?: string }
type Account = { id: number; account_number: string; account_name: string; account_type: string; balance: number; available_balance: number; currency: string; status: string }
type User = { id: number; name: string; email: string; role: Role; status: string }
type Transaction = { id: number; description: string; detail: string; amount: number; direction: 'credit' | 'debit'; created_at: string }
type Audit = { id: number; action: string; entity_type: string; metadata: string; created_at: string; user_name: string }

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'
const demoRoles = [
  { role: 'Administrator' as Role, email: 'admin@srijalexample.com', password: 'Srijal@123' },
  { role: 'Initiator' as Role, email: 'initiator@srijalexample.com', password: 'Initiator@123' },
  { role: 'Approver' as Role, email: 'approver@srijalexample.com', password: 'Approver@123' },
]

const money = (value: number, decimals = 0) => `NPR ${value.toLocaleString('en-NP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`

function Portal() {
  const [session, setSession] = useState<Session | null>(null)
  const [token, setToken] = useState('')
  const [page, setPage] = useState<Page>('Overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [notice, setNotice] = useState('')
  const [account, setAccount] = useState<Account | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [audit, setAudit] = useState<Audit[]>([])
  const [paymentFormOpen, setPaymentFormOpen] = useState(false)
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [query, setQuery] = useState('')

  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API}${path}`, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'Request failed')
    return response
  }

  const loadPortal = async (activeToken: string, activeSession: Session) => {
    const headers = { Authorization: `Bearer ${activeToken}` }
    const dashboardResponse = await fetch(`${API}/dashboard`, { headers })
    if (!dashboardResponse.ok) throw new Error('Session expired')
    const dashboard = await dashboardResponse.json()
    setAccount(dashboard.accounts[0] || null)
    setPayments(dashboard.payments)
    setTransactions(dashboard.transactions)
    if (activeSession.role === 'Administrator') {
      const [usersResponse, auditResponse] = await Promise.all([fetch(`${API}/users`, { headers }), fetch(`${API}/audit`, { headers })])
      if (usersResponse.ok) setUsers(await usersResponse.json())
      if (auditResponse.ok) setAudit(await auditResponse.json())
    }
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('northstar_token')
    const savedSession = localStorage.getItem('northstar_user')
    if (!savedToken || !savedSession) return
    try {
      const activeSession = JSON.parse(savedSession) as Session
      setToken(savedToken)
      void loadPortal(savedToken, activeSession).then(() => setSession(activeSession)).catch(() => { localStorage.clear() })
    } catch { localStorage.clear() }
  }, [])

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    try {
      const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loginEmail, password: loginPassword }) })
      if (!response.ok) throw new Error('Invalid username or password')
      const result = await response.json()
      const activeSession = result.user as Session
      localStorage.setItem('northstar_token', result.token)
      localStorage.setItem('northstar_user', JSON.stringify(activeSession))
      setToken(result.token)
      await loadPortal(result.token, activeSession)
      setSession(activeSession)
    } catch (error) { setLoginError(error instanceof Error ? error.message : 'Unable to sign in') }
  }

  const logout = () => {
    localStorage.removeItem('northstar_token')
    localStorage.removeItem('northstar_user')
    setSession(null)
    setToken('')
    setPage('Overview')
  }

  const createPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    try {
      await request('/payments', { method: 'POST', body: JSON.stringify({ beneficiary: values.get('beneficiary'), amount: Number(values.get('amount')), purpose: values.get('purpose') }) })
      setPaymentFormOpen(false)
      if (session) await loadPortal(token, session)
      notify('Payment request submitted for approval')
    } catch (error) { notify(error instanceof Error ? error.message : 'Payment could not be created') }
  }

  const approvePayment = async (id: number) => {
    try {
      await request(`/payments/${id}/approve`, { method: 'POST' })
      if (session) await loadPortal(token, session)
      notify('Payment approved successfully')
    } catch (error) { notify(error instanceof Error ? error.message : 'Payment could not be approved') }
  }

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    try {
      await request('/users', { method: 'POST', body: JSON.stringify({ name: values.get('name'), email: values.get('email'), role: values.get('role') }) })
      setUserFormOpen(false)
      if (session) await loadPortal(token, session)
      notify('Organization user created. Temporary password: Welcome@123')
    } catch (error) { notify(error instanceof Error ? error.message : 'User could not be created') }
  }

  const downloadStatement = async () => {
    try {
      const response = await request('/reports/statement')
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'srijal-account-statement.csv'
      link.click()
      URL.revokeObjectURL(link.href)
      notify('Account statement downloaded')
    } catch { notify('Statement could not be downloaded') }
  }

  const selectPage = (nextPage: Page) => { setPage(nextPage); setMobileNav(false) }
  const canCreate = session?.role === 'Administrator' || session?.role === 'Initiator'
  const canApprove = session?.role === 'Administrator' || session?.role === 'Approver'

  if (!session) return <Login email={loginEmail} password={loginPassword} error={loginError} onEmail={setLoginEmail} onPassword={setLoginPassword} onSubmit={login} onDemo={(demo) => { setLoginEmail(demo.email); setLoginPassword(demo.password) }} />

  return (
    <div className="portal-shell">
      {mobileNav && <button className="portal-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`portal-sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="portal-brand"><div className="northstar-mark"><span /><span /><span /></div><div><b>northstar</b><small>Corporate banking</small></div></div>
        <div className="company-switcher"><div className="company-initial">S</div><div><b>Srijal Example</b><small>Pvt Ltd · Organization</small></div></div>
        <nav className="portal-nav"><span>WORKSPACE</span><NavButton icon={LayoutDashboard} label="Overview" active={page === 'Overview'} onClick={() => selectPage('Overview')} /><NavButton icon={ArrowUpRight} label="Payments" active={page === 'Payments'} badge={payments.filter((payment) => payment.status === 'Pending approval').length || undefined} onClick={() => selectPage('Payments')} /><NavButton icon={ArrowDownLeft} label="Collections" active={false} onClick={() => notify('Collections workspace is ready for bank connection')} /><NavButton icon={WalletCards} label="Accounts" active={page === 'Accounts'} onClick={() => selectPage('Accounts')} /><NavButton icon={CreditCard} label="Cards" active={false} onClick={() => notify('Card controls opened')} /><span className="nav-section-label">ADMINISTRATION</span>{session.role === 'Administrator' && <NavButton icon={Users} label="Team & access" active={page === 'Team & access'} onClick={() => selectPage('Team & access')} />}<NavButton icon={FileBarChart} label="Reports" active={page === 'Reports'} onClick={() => selectPage('Reports')} />{session.role === 'Administrator' && <NavButton icon={ClipboardList} label="Audit log" active={page === 'Audit log'} onClick={() => selectPage('Audit log')} />}</nav>
        <div className="sidebar-bottom"><div className="security-badge"><ShieldCheck size={16} /><span><b>Secure session</b><small>Role: {session.role}</small></span></div><button className="sign-out" onClick={logout}><LogOut size={16} /> Sign out</button><div className="signed-user"><div>{session.name.slice(0, 2).toUpperCase()}</div><span><b>{session.name}</b><small>{session.email}</small></span></div></div>
      </aside>
      <main className="portal-main">
        <header className="portal-header"><button className="mobile-nav-trigger" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="portal-breadcrumb"><span>Srijal Example Pvt Ltd</span><ChevronRight size={14} /><b>{page}</b></div><div className="header-actions"><div className="header-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workspace" onKeyDown={(event) => { if (event.key === 'Enter') { selectPage('Payments'); notify(`Searching for ${query}`) } }} /></div><button className="header-icon" aria-label="Notifications" onClick={() => notify('No new notifications')}><Bell size={18} /></button><div className="header-user"><div>{session.name.slice(0, 2).toUpperCase()}</div><span>{session.name.split(' ')[0]}</span></div></div></header>
        <div className="portal-content">{page === 'Overview' && <Overview account={account} transactions={transactions} payments={payments} canApprove={canApprove} canCreate={canCreate} onCreate={() => setPaymentFormOpen(true)} onApprove={approvePayment} onNavigate={selectPage} onDownload={downloadStatement} />}{page === 'Payments' && <Payments payments={payments} canApprove={canApprove} canCreate={canCreate} onCreate={() => setPaymentFormOpen(true)} onApprove={approvePayment} />}{page === 'Accounts' && <Accounts account={account} onDownload={downloadStatement} />}{page === 'Team & access' && <Team users={users} onCreate={() => setUserFormOpen(true)} />}{page === 'Reports' && <Reports onDownload={downloadStatement} />}{page === 'Audit log' && <AuditLog records={audit} />}</div>
      </main>
      {paymentFormOpen && <PaymentForm onClose={() => setPaymentFormOpen(false)} onSubmit={createPayment} />}
      {userFormOpen && <UserForm onClose={() => setUserFormOpen(false)} onSubmit={createUser} />}
      {notice && <div className="portal-toast"><Check size={16} /> {notice}</div>}
    </div>
  )
}

function Login({ email, password, error, onEmail, onPassword, onSubmit, onDemo }: { email: string; password: string; error: string; onEmail: (value: string) => void; onPassword: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDemo: (demo: typeof demoRoles[number]) => void }) {
  return <main className="real-login"><div className="login-visual"><div className="portal-brand"><div className="northstar-mark"><span /><span /><span /></div><div><b>northstar</b><small>Corporate banking</small></div></div><div className="login-visual-copy"><span>SRIJAL EXAMPLE PVT LTD</span><h1>One control room<br />for your organization.</h1><p>Manage accounts, payments, approvals, and access from one secure place.</p><div className="login-feature-list"><span><ShieldCheck size={16} /> Role-based approval controls</span><span><WalletCards size={16} /> Organization account visibility</span><span><FileBarChart size={16} /> Auditable every step</span></div></div><small className="visual-footer">Northstar Corporate Banking · Nepal</small></div><section className="login-panel"><div className="mobile-login-brand"><div className="portal-brand"><div className="northstar-mark"><span /><span /><span /></div><div><b>northstar</b><small>Corporate banking</small></div></div></div><div className="login-panel-heading"><span>Authorized access</span><h2>Welcome back.</h2><p>Sign in to the Srijal Example banking workspace.</p></div><form className="real-login-form" onSubmit={onSubmit}><label>Email address<input type="email" required value={email} onChange={(event) => onEmail(event.target.value)} placeholder="name@organization.com" /></label><label>Password<input type="password" required minLength={8} value={password} onChange={(event) => onPassword(event.target.value)} placeholder="Enter your password" /></label>{error && <p className="form-error">{error}</p>}<div className="login-row"><label className="check-label"><input type="checkbox" defaultChecked /> Remember me</label><button type="button" onClick={() => alert('Contact your organization administrator to reset access.')}>Forgot password?</button></div><button className="solid-button" type="submit">Sign in <ArrowUpRight size={16} /></button></form><div className="demo-switcher"><span>Demo access</span><small>Select a role to prefill credentials</small>{demoRoles.map((demo) => <button key={demo.role} onClick={() => onDemo(demo)}><b>{demo.role}</b><code>{demo.email}</code><ChevronRight size={14} /></button>)}</div></section></main>
}

function NavButton({ icon: Icon, label, active, badge, onClick }: { icon: typeof LayoutDashboard; label: string; active: boolean; badge?: number; onClick: () => void }) { return <button className={`portal-nav-button ${active ? 'active' : ''}`} onClick={onClick}><Icon size={17} /><span>{label}</span>{badge ? <em>{badge}</em> : null}</button> }

function Overview({ account, transactions, payments, canApprove, canCreate, onCreate, onApprove, onNavigate, onDownload }: { account: Account | null; transactions: Transaction[]; payments: Payment[]; canApprove: boolean; canCreate: boolean; onCreate: () => void; onApprove: (id: number) => void; onNavigate: (page: Page) => void; onDownload: () => void }) {
  const pending = payments.filter((payment) => payment.status === 'Pending approval')
  return <><div className="page-heading"><div><span className="page-kicker">THURSDAY, 26 SEPTEMBER 2024 · ALL SYSTEMS OPERATIONAL</span><h1>Good morning.</h1><p>Here is the latest from Srijal Example Pvt Ltd.</p></div>{canCreate && <button className="solid-button" onClick={onCreate}><Plus size={16} /> New payment</button>}</div><section className="metric-grid"><article className="metric-card primary-metric"><span>Available balance</span><strong>{account ? money(account.available_balance, 2) : 'Loading...'}</strong><small>{account?.account_name || 'Organization operating account'}</small><div className="metric-foot"><span>Account {account?.account_number}</span><button onClick={() => onNavigate('Accounts')}>View details <ArrowUpRight size={13} /></button></div></article><article className="metric-card"><div className="metric-icon green"><ArrowDownLeft size={17} /></div><span>Money received</span><strong>NPR 6,240,500</strong><small className="positive-text">+12.8% vs last month</small></article><article className="metric-card"><div className="metric-icon orange"><ArrowUpRight size={17} /></div><span>Money sent</span><strong>NPR 2,180,750</strong><small className="positive-text">-4.2% vs last month</small></article></section><section className="dashboard-columns"><article className="surface-card"><div className="section-heading"><div><h2>Recent activity</h2><p>Latest movements across operating accounts</p></div><button className="link-button" onClick={onDownload}><Download size={14} /> Statement</button></div><div className="activity-list">{transactions.map((transaction) => <div className="activity-row" key={transaction.id}><div className={`activity-icon ${transaction.direction}`} >{transaction.direction === 'credit' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</div><div><b>{transaction.description}</b><span>{transaction.detail}</span></div><strong className={transaction.direction}>{transaction.direction === 'credit' ? '+' : '-'} {money(transaction.amount)}</strong></div>)}</div></article><article className="surface-card"><div className="section-heading"><div><h2>{canApprove ? 'Approval queue' : 'Payment status'}</h2><p>{pending.length} payment requests need attention</p></div><button className="link-button" onClick={() => onNavigate('Payments')}>Open queue <ArrowUpRight size={14} /></button></div><div className="approval-preview">{pending.slice(0, 3).map((payment) => <div className="approval-preview-row" key={payment.id}><div><b>{payment.beneficiary}</b><span>{payment.purpose}</span></div><div><strong>{money(payment.amount)}</strong>{canApprove ? <button onClick={() => onApprove(payment.id)}>Approve</button> : <small>Pending</small>}</div></div>)}{pending.length === 0 && <div className="blank-state"><Check size={20} /> All payments are up to date.</div>}</div></article></section></>
}

function Payments({ payments, canApprove, canCreate, onCreate, onApprove }: { payments: Payment[]; canApprove: boolean; canCreate: boolean; onCreate: () => void; onApprove: (id: number) => void }) { return <><div className="page-heading"><div><span className="page-kicker">PAYMENTS</span><h1>Payment requests</h1><p>Initiate, review, and track organization payments.</p></div>{canCreate && <button className="solid-button" onClick={onCreate}><Plus size={16} /> New payment</button>}</div><div className="filter-bar"><div className="filter-search"><Search size={15} /><input placeholder="Search payments" /></div><select defaultValue="all"><option value="all">All statuses</option><option>Pending approval</option><option>Approved</option></select><button className="outline-button"><Download size={15} /> Export</button></div><section className="surface-card table-card"><table><thead><tr><th>Beneficiary</th><th>Purpose</th><th>Amount</th><th>Created by</th><th>Status</th><th /></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><b>{payment.beneficiary}</b><small>Request #{String(payment.id).padStart(5, '0')}</small></td><td>{payment.purpose}</td><td><strong>{money(payment.amount)}</strong></td><td>{payment.created_by_name || 'Organization user'}</td><td><span className={`status ${payment.status === 'Approved' ? 'approved' : 'pending'}`}>{payment.status}</span></td><td>{canApprove && payment.status === 'Pending approval' && <button className="table-action" onClick={() => onApprove(payment.id)}>Approve</button>}</td></tr>)}</tbody></table>{payments.length === 0 && <div className="blank-state">No payment requests found.</div>}</section></> }

function Accounts({ account, onDownload }: { account: Account | null; onDownload: () => void }) { return <><div className="page-heading"><div><span className="page-kicker">ACCOUNTS</span><h1>Organization accounts</h1><p>Balances and account details for Srijal Example Pvt Ltd.</p></div><button className="outline-button" onClick={onDownload}><Download size={15} /> Download statement</button></div><section className="account-hero"><div><span>PRIMARY OPERATING ACCOUNT</span><h2>{account?.account_name}</h2><code>{account?.account_number}</code></div><div className="account-balance"><small>Available balance</small><strong>{account ? money(account.available_balance, 2) : 'Loading...'}</strong><span className="status approved">{account?.status}</span></div></section><section className="account-detail-grid"><article className="surface-card detail-box"><span>Ledger balance</span><strong>{account ? money(account.balance, 2) : '-'}</strong><small>Current balance before pending holds</small></article><article className="surface-card detail-box"><span>Available balance</span><strong>{account ? money(account.available_balance, 2) : '-'}</strong><small>Available for organization payments</small></article><article className="surface-card detail-box"><span>Currency</span><strong>{account?.currency || 'NPR'}</strong><small>Primary account currency</small></article></section></> }

function Team({ users, onCreate }: { users: User[]; onCreate: () => void }) { return <><div className="page-heading"><div><span className="page-kicker">ADMINISTRATION</span><h1>Team & access</h1><p>Control who can initiate and approve organization payments.</p></div><button className="solid-button" onClick={onCreate}><Users size={16} /> Add user</button></div><section className="surface-card table-card"><div className="table-title"><div><h2>Organization users</h2><p>{users.length} active users with access to this workspace.</p></div><ShieldCheck size={21} /></div><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Access created</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><b>{user.name}</b><small>{user.email}</small></td><td><span className="role-tag">{user.role}</span></td><td><span className="status approved">{user.status}</span></td><td>Organization workspace</td></tr>)}</tbody></table></section></> }

function Reports({ onDownload }: { onDownload: () => void }) { return <><div className="page-heading"><div><span className="page-kicker">REPORTING</span><h1>Reports</h1><p>Download records for reconciliation and finance operations.</p></div></div><section className="report-grid"><article className="surface-card report-card"><div className="report-icon"><FileText size={20} /></div><h2>Account statement</h2><p>CSV export of organization account transactions, dates, directions, and amounts.</p><button className="outline-button" onClick={onDownload}><Download size={15} /> Download CSV</button></article><article className="surface-card report-card"><div className="report-icon"><FileBarChart size={20} /></div><h2>Payment register</h2><p>Review the organization payment request and approval history in the Payments workspace.</p><button className="outline-button" onClick={() => window.print()}><Download size={15} /> Print report</button></article></section></> }

function AuditLog({ records }: { records: Audit[] }) { return <><div className="page-heading"><div><span className="page-kicker">ADMINISTRATION</span><h1>Audit log</h1><p>A record of authentication, access, and payment actions.</p></div></div><section className="surface-card table-card"><table><thead><tr><th>Action</th><th>User</th><th>Entity</th><th>Time</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><b>{record.action.replaceAll('_', ' ')}</b></td><td>{record.user_name}</td><td>{record.entity_type} #{record.id}</td><td>{new Date(record.created_at).toLocaleString()}</td></tr>)}</tbody></table></section></> }

function PaymentForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <Dialog title="New payment request" eyebrow="Payment initiation" onClose={onClose}><form className="dialog-form" onSubmit={onSubmit}><p className="dialog-help">Create a payment request. An authorized Approver must review it before release.</p><label>Beneficiary<input name="beneficiary" required placeholder="Company or beneficiary name" /></label><label>Amount<input name="amount" required min="1" type="number" placeholder="NPR 0.00" /></label><label>Purpose<input name="purpose" required placeholder="Invoice, payroll, supplier payment..." /></label><div className="dialog-actions"><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="solid-button">Submit for approval <ArrowUpRight size={15} /></button></div></form></Dialog> }
function UserForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <Dialog title="Add organization user" eyebrow="Administrator control" onClose={onClose}><form className="dialog-form" onSubmit={onSubmit}><p className="dialog-help">New users receive the temporary password <b>Welcome@123</b> and can sign in immediately.</p><label>Full name<input name="name" required placeholder="Employee full name" /></label><label>Email address<input name="email" required type="email" placeholder="employee@company.com" /></label><label>Role<select name="role" defaultValue="Initiator"><option value="Initiator">Initiator · Create payment requests</option><option value="Approver">Approver · Approve payment requests</option></select></label><div className="dialog-actions"><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="solid-button">Create user <Users size={15} /></button></div></form></Dialog> }
function Dialog({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) { return <div className="dialog-backdrop" onMouseDown={onClose}><section className="dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="dialog-header"><div><span>{eyebrow}</span><h2>{title}</h2></div><button onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</section></div> }

export default Portal
