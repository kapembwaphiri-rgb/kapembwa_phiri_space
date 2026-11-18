import Navbar from '../components/Navbar.jsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function MainLayout({ user, onLogout, children }) {
  const pathname = usePathname();
  if (pathname === '/dashboard' && ['MANAGER', 'SUPER_ADMIN'].includes(user?.role)) {
    return <div className="seller-dashboard-route">{children}</div>;
  }
  return <div className="app-shell">
    <Navbar user={user} onLogout={onLogout} />
    <main className="main">{children}</main>
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link href="/" className="footer-wordmark">CHI-WHITE</Link>
          <p>Considered essentials and distinctive pieces, made for your everyday.</p>
        </div>
        <div className="footer-column">
          <h2>Explore</h2>
          <Link href="/catalog">Shop all</Link>
          <Link href="/catalog/white-shirts">Plain shirts</Link>
          <Link href="/catalog/hoodies">Hoodies</Link>
          <Link href="/catalog/designer">Designer</Link>
        </div>
        <div className="footer-column">
          <h2>Your account</h2>
          <Link href={user ? '/bag' : '/login'}>{user ? 'Your bag' : 'Sign in'}</Link>
          <Link href="/signup">Create an account</Link>
          {['MANAGER', 'SUPER_ADMIN'].includes(user?.role) && <Link href="/dashboard">Store dashboard</Link>}
        </div>
        <div className="footer-note">
          <span className="eyebrow">CHI-WHITE / ZAMBIA</span>
          <p>Find your fit. Make it yours.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Chi-White. All rights reserved.</span>
        <Link href="/catalog">Continue shopping <span aria-hidden="true">↗</span></Link>
      </div>
    </footer>
  </div>;
}
