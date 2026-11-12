import Navbar from '../components/Navbar.jsx';
export default function MainLayout({ user, onLogout, children }) {
  return <div className="app-shell"><Navbar user={user} onLogout={onLogout} /><main className="main">{children}</main></div>;
}
