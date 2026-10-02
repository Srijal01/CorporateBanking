import { type FormEvent, type SetStateAction, useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react'

type NavItem = { label: string; icon: typeof LayoutDashboard }
type UserRole = 'Administrator' | 'Initiator' | 'Approver'
type OrganizationUser = { id: number; name: string; email: string; role: UserRole; status: 'Active' | 'Pending' }
type DemoPayment = { id: number; name: string; type: string; amount: string; initials: string; tone: string }
type RecentTransaction = { name: string; detail: string; amount: string; icon: typeof ArrowDownLeft; kind: 'positive' | 'negative' }

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Payments', icon: ArrowUpRight },
  { label: 'Collections', icon: ArrowDownLeft },
  { label: 'Accounts', icon: WalletCards },
  { label: 'Cards', icon: CreditCard },
]

const pendingPayments: DemoPayment[] = [
  { id: 1, name: 'Himalayan Freight Pvt. Ltd.', type: 'Vendor payment', amount: 'NPR 842,500', initials: 'HF', tone: 'orange' },
  { id: 2, name: 'Ridgeway Technologies', type: 'Payroll batch', amount: 'NPR 1,240,000', initials: 'RT', tone: 'blue' },
  { id: 3, name: 'Kantipur Office Supplies', type: 'Vendor payment', amount: 'NPR 118,750', initials: 'KO', tone: 'green' },
]

const transactions: RecentTransaction[] = [
  { name: 'Everest Bank Limited', detail: 'Incoming transfer · Today, 09:42', amount: '+ NPR 2,500,000', icon: ArrowDownLeft, kind: 'positive' },
  { name: 'Lalitpur Power Company', detail: 'Utility payment · Yesterday, 16:20', amount: '- NPR 94,300', icon: ArrowUpRight, kind: 'negative' },
  { name: 'Cloud Factory Nepal', detail: 'International collection · 18 Sep, 11:08', amount: '+ NPR 684,200', icon: ArrowDownLeft, kind: 'positive' },
]

const demoCredentials = {
  username: 'admin@srijalexample.com',
  password: 'Srijal@123',
}
const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'

const roleCredentials: Array<{ role: UserRole; username: string; password: string; name: string }> = [
  { role: 'Administrator', username: demoCredentials.username, password: demoCredentials.password, name: 'Rijan Shrestha' },
  { role: 'Initiator', username: 'initiator@srijalexample.com', password: 'Initiator@123', name: 'Anisha Karki' },
  { role: 'Approver', username: 'approver@srijalexample.com', password: 'Approver@123', name: 'Bikash Thapa' },
]

const initialUsers: OrganizationUser[] = [
  { id: 1, name: 'Rijan Shrestha', email: demoCredentials.username, role: 'Administrator', status: 'Active' },
  { id: 2, name: 'Anisha Karki', email: 'initiator@srijalexample.com', role: 'Initiator', status: 'Active' },
  { id: 3, name: 'Bikash Thapa', email: 'approver@srijalexample.com', role: 'Approver', status: 'Active' },
]

function App() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [notice, setNotice] = useState('')
  const [payments, setLocalPayments] = useState(pendingPayments)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState<string | null>(null)
  const [auxOpen, setAuxOpen] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<{ payments: Array<{ beneficiary: string; purpose: string; amount: number }>; users: Array<{ name: string; email: string; role: string }>; transactions: Array<{ description: string; detail: string; amount: number }> }>({ payments: [], users: [], transactions: [] })
  const [organizationUsers, setOrganizationUsers] = useState(initialUsers)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState(demoCredentials.username)
  const [password, setPassword] = useState(demoCredentials.password)
  const [loginError, setLoginError] = useState('')
  const [currentRole, setCurrentRole] = useState<UserRole>('Administrator')
  const [currentUserName, setCurrentUserName] = useState('Rijan Shrestha')
  const [sessionUserId, setSessionUserId] = useState<number | null>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [accountBalance, setAccountBalance] = useState('NPR 18,450,280.00')
  const [accountNumber, setAccountNumber] = useState('2323345554322')
  const [recentTransactions, setRecentTransactions] = useState(transactions)
  const [notificationCount, setNotificationCount] = useState(3)

  const setPayments = (update: SetStateAction<DemoPayment[]>) => {
    setLocalPayments((current) => {
      const next = typeof update === 'function' ? update(current) : update
      const removedPayment = current.find((payment) => !next.some((nextPayment) => nextPayment.id === payment.id))
      if (removedPayment && sessionToken) {
        void fetch(`${apiBase}/payments/${removedPayment.id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` } })
      }
      return next
    })
  }

  const announce = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }

  const hydrateDashboard = async (token: string) => {
    const dashboardResponse = await fetch(`${apiBase}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
    if (!dashboardResponse.ok) throw new Error('Session expired')
    const dashboard = await dashboardResponse.json()
    const account = dashboard.accounts[0]
    if (account) {
      setAccountBalance(`NPR ${Number(account.available_balance).toLocaleString('en-NP', { minimumFractionDigits: 2 })}`)
      setAccountNumber(account.account_number)
    }
    setNotificationCount(dashboard.notifications.filter((notification: { is_read: number }) => !notification.is_read).length)
    setRecentTransactions(dashboard.transactions.map((transaction: { description: string; detail: string; amount: number; direction: string }) => ({ name: transaction.description, detail: transaction.detail, amount: `${transaction.direction === 'credit' ? '+' : '-'} NPR ${Number(transaction.amount).toLocaleString('en-NP')}`, icon: transaction.direction === 'credit' ? ArrowDownLeft : ArrowUpRight, kind: transaction.direction === 'credit' ? 'positive' : 'negative' })))
    setLocalPayments(dashboard.payments.filter((payment: { status: string }) => payment.status === 'Pending approval').map((payment: { id: number; beneficiary: string; amount: number; purpose: string }) => ({ id: payment.id, name: payment.beneficiary, type: payment.purpose, amount: `NPR ${payment.amount.toLocaleString('en-NP')}`, initials: payment.beneficiary.slice(0, 2).toUpperCase(), tone: 'blue' })))
  }

  useEffect(() => {
    const token = localStorage.getItem('northstar_token')
    const storedUser = localStorage.getItem('northstar_user')
    if (!token || !storedUser) return
    try {
      const user = JSON.parse(storedUser) as { id: number; name: string; role: UserRole }
      setSessionToken(token)
      setSessionUserId(user.id)
      setCurrentRole(user.role)
      setCurrentUserName(user.name)
      void hydrateDashboard(token).then(() => setIsLoggedIn(true)).catch(() => { localStorage.removeItem('northstar_token'); localStorage.removeItem('northstar_user') })
    } catch {
      localStorage.removeItem('northstar_token')
      localStorage.removeItem('northstar_user')
    }
  }, [])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const response = await fetch(`${apiBase}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      if (!response.ok) throw new Error('Invalid credentials')
      const result = await response.json()
      setLoginError('')
      setSessionUserId(result.user.id)
      setSessionToken(result.token)
      setCurrentRole(result.user.role)
      setCurrentUserName(result.user.name)
      localStorage.setItem('northstar_token', result.token)
      localStorage.setItem('northstar_user', JSON.stringify(result.user))
      await hydrateDashboard(result.token)
      if (result.user.role === 'Administrator') {
        const usersResponse = await fetch(`${apiBase}/users`, { headers: { Authorization: `Bearer ${result.token}` } })
        if (usersResponse.ok) setOrganizationUsers(await usersResponse.json())
      }
      setIsLoggedIn(true)
    } catch {
      setLoginError('Unable to sign in. Start the Node API with npm run api, then use the demo credentials.')
    }
  }

  const handleCreatePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const beneficiary = String(formData.get('beneficiary'))
    const amount = Number(formData.get('amount'))
    try {
      const response = await fetch(`${apiBase}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }, body: JSON.stringify({ beneficiary, amount, purpose: String(formData.get('purpose')) }) })
      if (!response.ok) throw new Error('Payment failed')
      const payment = await response.json()
      setPayments((current) => [{ id: payment.id, name: payment.beneficiary, type: payment.purpose, amount: `NPR ${payment.amount.toLocaleString('en-NP')}`, initials: payment.beneficiary.slice(0, 2).toUpperCase(), tone: 'blue' }, ...current])
      setPaymentOpen(false)
      announce('Payment submitted for approval')
    } catch { announce('Payment could not be saved. Check that the API is running.') }
  }

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const role = formData.get('role') as UserRole
    try {
      const response = await fetch(`${apiBase}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }, body: JSON.stringify({ name: String(formData.get('name')), email: String(formData.get('email')), role }) })
      if (!response.ok) throw new Error('User failed')
      const createdUser = await response.json()
      setOrganizationUsers((users) => [...users, { id: createdUser.id, name: createdUser.name, email: createdUser.email, role: createdUser.role, status: createdUser.status }])
      setUserOpen(false)
      announce(`${role} user invitation created`)
    } catch { announce('User could not be created. Check that the API is running.') }
  }

  const approvePayment = async (payment: DemoPayment) => {
    try {
      const response = await fetch(`${apiBase}/payments/${payment.id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` } })
      if (!response.ok) throw new Error('Approval failed')
      setPayments((current) => current.filter((item) => item.id !== payment.id))
      announce(`${payment.name} approved`)
    } catch { announce('Payment could not be approved. Check your role and API connection.') }
  }

  const downloadStatement = async () => {
    try {
      const response = await fetch(`${apiBase}/reports/statement`, { headers: { Authorization: `Bearer ${sessionToken}` } })
      if (!response.ok) throw new Error('Report failed')
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'srijal-account-statement.csv'
      link.click()
      URL.revokeObjectURL(link.href)
      announce('Statement downloaded')
    } catch { announce('Statement could not be downloaded') }
  }

  const runSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (searchTerm.trim().length < 2) return
    const response = await fetch(`${apiBase}/search?q=${encodeURIComponent(searchTerm)}`, { headers: { Authorization: `Bearer ${sessionToken}` } })
    if (response.ok) setSearchResults(await response.json())
  }

  const canInitiate = currentRole === 'Administrator' || currentRole === 'Initiator'
  const canApprove = currentRole === 'Administrator' || currentRole === 'Approver'
  const openModule = (label: string) => {
    setActiveNav(label)
    setModuleOpen(label === 'Overview' ? null : label)
    setMobileOpen(false)
  }

  if (!isLoggedIn) {
    return (
      <main className="login-screen">
        <div className="login-decoration decoration-top" />
        <div className="login-decoration decoration-bottom" />
        <section className="login-card">
          <div className="login-brand"><div className="brand-mark"><span /><span /><span /></div><div><strong>northstar</strong><small>Corporate banking</small></div></div>
          <div className="login-intro"><span className="login-overline">Srijal Example Pvt Ltd</span><h1>Business banking,<br /><em>made clear.</em></h1><p>Sign in to manage your organization&apos;s accounts, payments, and approvals.</p></div>
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="username">Username</label>
            <input id="username" type="email" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            {loginError && <p className="login-error">{loginError}</p>}
            <div className="login-options"><label className="remember-option"><input type="checkbox" defaultChecked /> <span>Remember me</span></label><button type="button" onClick={() => setLoginError('Password recovery is available in the production flow.')}>Forgot password?</button></div>
            <button className="login-button" type="submit">Login <LogIn size={16} /></button>
          </form>
          <div className="demo-credentials"><div><span>Demo access</span><small>Choose a role to test its permissions</small></div>{roleCredentials.map((credential) => <button className="credential-option" type="button" key={credential.role} onClick={() => { setUsername(credential.username); setPassword(credential.password) }}><span>{credential.role}</span><code>{credential.username}</code></button>)}</div>
          <div className="login-footer"><span>New organization?</span><button type="button" onClick={() => setLoginError('Business banking activation is available in the production flow.')}>Activate business banking <ArrowUpRight size={13} /></button></div>
        </section>
        <footer className="login-page-footer"><span>Northstar Corporate Banking</span><span>Secure access for authorized organization users</span></footer>
      </main>
    )
  }

  return (
    <div className="app-shell">
      {searchOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}><section className="module-modal search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="card-kicker">Workspace search</span><h2 id="search-title">Find anything</h2><p>Search payments, users, and account activity.</p></div><button className="modal-close" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={18} /></button></div><form className="search-form" onSubmit={runSearch}><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name, email, purpose, or transaction" /><button className="primary-button" type="submit"><Search size={15} /> Search</button></form><div className="search-results">{searchResults.payments.map((result) => <div className="search-result" key={`payment-${result.beneficiary}`}><b>{result.beneficiary}</b><span>Payment · {result.purpose} · NPR {result.amount.toLocaleString('en-NP')}</span></div>)}{searchResults.users.map((result) => <div className="search-result" key={`user-${result.email}`}><b>{result.name}</b><span>User · {result.email} · {result.role}</span></div>)}{searchResults.transactions.map((result) => <div className="search-result" key={`transaction-${result.description}`}><b>{result.description}</b><span>Transaction · {result.detail} · NPR {result.amount.toLocaleString('en-NP')}</span></div>)}{searchTerm.length > 1 && !searchResults.payments.length && !searchResults.users.length && !searchResults.transactions.length && <p className="empty-state">No matching records found.</p>}</div></section></div>}
      {auxOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setAuxOpen(null)}><section className="module-modal aux-modal" role="dialog" aria-modal="true" aria-labelledby="aux-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="card-kicker">Srijal Example Pvt Ltd</span><h2 id="aux-title">{auxOpen}</h2><p>Organization banking workspace</p></div><button className="modal-close" aria-label="Close panel" onClick={() => setAuxOpen(null)}><X size={18} /></button></div>{auxOpen === 'Notifications' && <div className="module-list aux-list"><div className="module-list-row"><div><b>Payment approval required</b><span>Three payment requests are waiting for review.</span></div><strong>New</strong></div><div className="module-list-row"><div><b>Welcome to Northstar</b><span>Your organization banking workspace is ready.</span></div><strong>Read</strong></div></div>}{auxOpen === 'Settings' && <div className="settings-list"><label><span>Two-step verification</span><input type="checkbox" defaultChecked /></label><label><span>Payment approval notifications</span><input type="checkbox" defaultChecked /></label><label><span>Weekly account summary</span><input type="checkbox" defaultChecked /></label><button className="primary-button" onClick={() => { setAuxOpen(null); announce('Settings saved') }}>Save settings</button></div>}{auxOpen === 'Help centre' && <div className="help-content"><p>Need help with your organization account?</p><div className="help-item"><CircleHelp size={16} /><span><b>Getting started</b><small>Learn how users, payments, and approvals work.</small></span></div><div className="help-item"><ShieldCheck size={16} /><span><b>Security support</b><small>Contact your banking administrator for access issues.</small></span></div><button className="primary-button" onClick={() => announce('Support request started')}>Contact support</button></div>}{auxOpen === 'Profile' && <div className="profile-panel"><div className="profile-large">{currentUserName.slice(0, 2).toUpperCase()}</div><h3>{currentUserName}</h3><p>{currentRole} · Srijal Example Pvt Ltd</p><button className="secondary-button" onClick={() => { setAuxOpen(null); setIsLoggedIn(false) }}>Sign out</button></div>}</section></div>}
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>northstar</strong><small>Corporate banking</small></div>
          <button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="company-avatar">S</div>
          <div><b>Srijal Example Pvt Ltd</b><small>Organization account</small></div>
          <ChevronDown size={15} />
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <span className="nav-label">Workspace</span>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { openModule(label); if (label !== 'Overview') announce(`${label} workspace opened`) }}>
              <Icon size={18} strokeWidth={activeNav === label ? 2.4 : 1.8} />
              <span>{label}</span>
              {label === 'Payments' && <em>3</em>}
            </button>
          ))}
          <span className="nav-label nav-label-spaced">Manage</span>
          <button className="nav-item" onClick={() => currentRole === 'Administrator' ? setUserOpen(true) : announce('Only an administrator can manage organization users')}><UsersRound size={18} /><span>Team & access</span></button>
          <button className="nav-item" onClick={downloadStatement}><FileText size={18} /><span>Reports</span></button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setAuxOpen('Settings')}><Settings size={18} /><span>Settings</span></button>
          <button className="nav-item" onClick={() => setAuxOpen('Help centre')}><CircleHelp size={18} /><span>Help centre</span></button>
          <button className="nav-item" onClick={() => { localStorage.removeItem('northstar_token'); localStorage.removeItem('northstar_user'); setIsLoggedIn(false); setSessionToken(''); setActiveNav('Overview'); announce('Signed out') }}><LogOut size={18} /><span>Sign out</span></button>
          <div className="profile-row"><div className="profile-avatar">{currentUserName.slice(0, 2).toUpperCase()}</div><div><b>{currentUserName}</b><small>{currentRole}</small></div><MoreHorizontal size={17} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Srijal Example Pvt Ltd</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button search-button" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={19} /></button>
            <button className="icon-button" aria-label="Notifications" onClick={() => { setNotificationCount(0); setAuxOpen('Notifications') }}><Bell size={19} />{notificationCount > 0 && <i />}</button>
            <div className="topbar-divider" />
            <button className="top-profile" onClick={() => setAuxOpen('Profile')}><div className="profile-avatar small">RS</div><ChevronDown size={15} /></button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div><p className="eyebrow">Thursday, 26 September 2024 <span className="status-dot" /> All systems operational</p><h1>Good morning, {currentUserName.split(' ')[0]}.</h1><p className="subheading">You are signed in as an {currentRole.toLowerCase()} for Srijal Example Pvt Ltd.</p></div>
            {canInitiate ? <button className="primary-button" onClick={() => setPaymentOpen(true)}><Plus size={17} /> Make a payment</button> : <span className="role-pill">Read-only approver view</span>}
          </section>

          <section className="balance-grid">
            <article className="balance-card main-balance">
              <div className="card-heading"><div><span className="card-kicker">Total available balance</span><button className="visibility-button" aria-label="Toggle balance visibility" onClick={() => setShowBalance(!showBalance)}>{showBalance ? 'Hide' : 'Show'}</button></div><button className="more-button" aria-label="Balance options"><MoreHorizontal size={19} /></button></div>
              <div className="balance-value">{showBalance ? accountBalance : 'NPR ••••••••••'} <span className="balance-change"><TrendingUp size={14} /> 8.4%</span></div>
              <div className="balance-footer"><span>Account {accountNumber}</span><button onClick={() => { openModule('Accounts'); announce('Accounts opened') }}>View accounts <ArrowUpRight size={14} /></button></div>
              <div className="balance-grid-lines" />
            </article>
            <article className="stat-card"><div className="stat-icon received"><ArrowDownLeft size={17} /></div><span className="card-kicker">Money received</span><strong>NPR 6,240,500</strong><small><b>+12.8%</b> vs last month</small><div className="mini-chart bars-received"><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="stat-card"><div className="stat-icon sent"><ArrowUpRight size={17} /></div><span className="card-kicker">Money sent</span><strong>NPR 2,180,750</strong><small><b>-4.2%</b> vs last month</small><div className="mini-chart bars-sent"><i /><i /><i /><i /><i /><i /><i /></div></article>
          </section>

          <section className="content-grid">
            <article className="panel flow-panel"><div className="panel-header"><div><h2>Organization cash flow</h2><p>Money moving through your operating accounts</p></div><button className="select-button">Last 30 days <ChevronDown size={14} /></button></div><div className="chart-legend"><span><i className="legend-in" /> Money in</span><span><i className="legend-out" /> Money out</span></div><div className="chart"><div className="chart-y"><span>NPR 3m</span><span>NPR 2m</span><span>NPR 1m</span><span>NPR 0</span></div><div className="chart-area"><div className="grid-line line-1" /><div className="grid-line line-2" /><div className="grid-line line-3" /><div className="grid-line line-4" /><svg viewBox="0 0 650 220" preserveAspectRatio="none" aria-label="Organization cash flow chart"><defs><linearGradient id="flowFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3272dc" stopOpacity=".18" /><stop offset="100%" stopColor="#3272dc" stopOpacity="0" /></linearGradient></defs><path d="M0 151 C35 142 45 117 80 128 S125 158 160 126 S202 80 235 104 S280 142 312 117 S360 63 390 82 S430 116 462 101 S500 46 532 62 S580 109 605 76 S632 40 650 47 L650 220 L0 220Z" fill="url(#flowFill)" /><path d="M0 151 C35 142 45 117 80 128 S125 158 160 126 S202 80 235 104 S280 142 312 117 S360 63 390 82 S430 116 462 101 S500 46 532 62 S580 109 605 76 S632 40 650 47" fill="none" stroke="#3272dc" strokeWidth="3" vectorEffect="non-scaling-stroke" /><path d="M0 176 C42 166 51 150 82 164 S126 180 161 169 S204 133 237 152 S282 176 314 156 S363 123 392 135 S431 157 463 146 S502 111 534 126 S578 159 607 142 S635 119 650 128" fill="none" stroke="#f29c73" strokeWidth="3" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x"><span>Aug 28</span><span>Sep 03</span><span>Sep 09</span><span>Sep 15</span><span>Sep 21</span><span>Sep 26</span></div></div></div></article>
            <article className="panel approvals-panel"><div className="panel-header"><div><h2>{canApprove ? 'Needs your approval' : 'Payment status'}</h2><p>{canApprove ? 'Payments waiting for your review' : 'Requests submitted by your organization'}</p></div><span className="count-badge">{payments.length} pending</span></div><div className="approval-list">{payments.length ? payments.map((payment) => <button className="approval-item" key={payment.name} onClick={() => canApprove ? (setPayments((current) => current.filter((item) => item.name !== payment.name)), announce(`${payment.name} approved`)) : announce('This request is waiting for an approver')}><div className={`payment-avatar ${payment.tone}`}>{payment.initials}</div><div className="payment-info"><b>{payment.name}</b><span>{payment.type}</span></div><div className="payment-amount"><b>{payment.amount}</b><span>{canApprove ? 'Approve' : 'Pending'} {canApprove && <ArrowUpRight size={13} />}</span></div></button>) : <p className="empty-state">All payments are approved.</p>}</div><button className="text-button" onClick={() => { openModule('Payments'); announce('Payment queue opened') }}>View all payments <ArrowUpRight size={15} /></button></article>
          </section>

          <section className="bottom-grid"><article className="panel transactions-panel"><div className="panel-header"><div><h2>Recent activity</h2><p>Your latest account movements</p></div><button className="text-button compact" onClick={downloadStatement}>Download statement <ArrowUpRight size={15} /></button></div><div className="transaction-table"><div className="transaction-head"><span>Transaction</span><span>Date</span><span>Amount</span></div>{recentTransactions.map(({ name, detail, amount, icon: Icon, kind }) => <div className="transaction-row" key={name}><div className="transaction-name"><div className={`transaction-icon ${kind}`}><Icon size={15} /></div><div><b>{name}</b><span>{detail}</span></div></div><span className="transaction-date">Today</span><strong className={kind}>{amount}</strong></div>)}</div></article><article className="panel quick-panel"><div className="panel-header"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div><Sparkles className="sparkle" size={20} /></div><div className="quick-actions"><button onClick={() => announce('New beneficiary flow started')}><div className="quick-icon"><UsersRound size={17} /></div><span>Add beneficiary</span><ArrowUpRight size={14} /></button><button onClick={downloadStatement}><div className="quick-icon"><ReceiptText size={17} /></div><span>Download statement</span><ArrowUpRight size={14} /></button><button onClick={() => currentRole === 'Administrator' ? setUserOpen(true) : announce('Only an administrator can invite teammates')}><div className="quick-icon"><UserRound size={17} /></div><span>Invite a teammate</span><ArrowUpRight size={14} /></button></div><div className="demo-access"><div className="demo-access-heading"><span>Session</span><em>Secure</em></div><code>{currentRole} access</code><small>Authenticated organization session with role-based permissions.</small></div><div className="security-note"><ShieldCheck size={17} /><span><b>Protected by Northstar</b><small>Your account is secured with 2-step verification.</small></span></div></article></section>
        </div>
      </main>
      {moduleOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setModuleOpen(null)}><section className="module-modal" role="dialog" aria-modal="true" aria-labelledby="module-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="card-kicker">Srijal Example Pvt Ltd</span><h2 id="module-title">{moduleOpen}</h2><p>Organization banking workspace</p></div><button className="modal-close" aria-label="Close workspace" onClick={() => setModuleOpen(null)}><X size={18} /></button></div>{moduleOpen === 'Payments' && <div className="module-content"><div className="module-summary"><div><span>Pending approval</span><strong>{payments.length}</strong></div><div><span>Payment permissions</span><strong>{canInitiate ? 'Create' : 'Review'}</strong></div></div><div className="module-list">{payments.map((payment) => <div className="module-list-row" key={payment.name}><div><b>{payment.name}</b><span>{payment.type}</span></div><strong>{payment.amount}</strong><button className="small-action" onClick={() => canApprove ? (setPayments((current) => current.filter((item) => item.name !== payment.name)), announce(`${payment.name} approved`)) : announce('Only an approver can approve this payment')}>{canApprove ? 'Approve' : 'View'}</button></div>)}</div>{canInitiate && <button className="primary-button module-primary-action" onClick={() => { setModuleOpen(null); setPaymentOpen(true) }}><Plus size={15} /> New payment request</button>}</div>}{moduleOpen === 'Accounts' && <div className="module-content"><div className="account-detail-card"><div className="account-detail-top"><span>Primary operating account</span><span className="active-status">Active</span></div><strong>Srijal Example Pvt Ltd</strong><code>2323345554322</code><div className="account-detail-bottom"><span>Available balance<strong>NPR 18,450,280.00</strong></span><span>Currency<strong>NPR</strong></span></div></div><button className="text-button module-link" onClick={() => announce('Statement download started')}><ReceiptText size={15} /> Download account statement</button></div>}{moduleOpen === 'Collections' && <div className="module-content"><div className="module-summary"><div><span>Expected this month</span><strong>NPR 4,260,000</strong></div><div><span>Collected</span><strong>NPR 2,840,500</strong></div></div><div className="module-list"><div className="module-list-row"><div><b>Everest Bank Limited</b><span>Incoming transfer · Today</span></div><strong>+ NPR 2,500,000</strong><span className="active-status">Received</span></div><div className="module-list-row"><div><b>Cloud Factory Nepal</b><span>International collection · 18 Sep</span></div><strong>+ NPR 684,200</strong><span className="active-status">Received</span></div></div></div>}{moduleOpen === 'Cards' && <div className="module-content"><div className="corporate-card-preview"><span>Srijal corporate card</span><strong>•••• 4821</strong><small>Rijan Shrestha · Valid thru 09/28</small></div><div className="module-summary"><div><span>Monthly limit</span><strong>NPR 500,000</strong></div><div><span>Available</span><strong>NPR 427,500</strong></div></div><button className="primary-button module-primary-action" onClick={() => announce('Card management opened')}><CreditCard size={15} /> Manage card</button></div>}</section></div>}
      {paymentOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setPaymentOpen(false)}><section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="card-kicker">Srijal Example Pvt Ltd</span><h2 id="payment-title">Make a payment</h2><p>Create a payment request for approval.</p></div><button className="modal-close" aria-label="Close payment form" onClick={() => setPaymentOpen(false)}><X size={18} /></button></div><form className="payment-form" onSubmit={handleCreatePayment}><label>Beneficiary<input name="beneficiary" required placeholder="Company or beneficiary name" /></label><label>Amount<input name="amount" required type="number" min="1" placeholder="NPR 0.00" /></label><label>Payment purpose<input name="purpose" required placeholder="What is this payment for?" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPaymentOpen(false)}>Cancel</button><button type="submit" className="primary-button">Submit for approval <ArrowUpRight size={15} /></button></div></form></section></div>}
      {userOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setUserOpen(false)}><section className="payment-modal user-modal" role="dialog" aria-modal="true" aria-labelledby="user-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="card-kicker">Administrator controls</span><h2 id="user-title">Team & access</h2><p>Create and manage organization banking users.</p></div><button className="modal-close" aria-label="Close team management" onClick={() => setUserOpen(false)}><X size={18} /></button></div><div className="team-list">{organizationUsers.map((user) => <div className="team-row" key={user.id}><div className="profile-avatar">{user.name.slice(0, 2).toUpperCase()}</div><div><b>{user.name}</b><span>{user.email}</span></div><div className="team-role"><strong>{user.role}</strong><small>{user.status}</small></div></div>)}</div><form className="payment-form" onSubmit={handleCreateUser}><h3>Invite a user</h3><label>Full name<input name="name" required placeholder="Employee full name" /></label><label>Email address<input name="email" type="email" required placeholder="employee@company.com" /></label><label>Access role<select name="role" defaultValue="Initiator"><option value="Initiator">Initiator · Create payments</option><option value="Approver">Approver · Review payments</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setUserOpen(false)}>Cancel</button><button type="submit" className="primary-button">Create user <UsersRound size={15} /></button></div></form></section></div>}
      {notice && <div className="toast"><ClipboardCheck size={17} />{notice}</div>}
    </div>
  )
}

export default App
