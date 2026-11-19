'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, UserRound } from 'lucide-react';
import { assetUrl } from '../services/api.js';

export default function ProfileMenu({ user, onLogout, className = '' }) {
  const menuRef = useRef(null);
  const pathname = usePathname();
  const staff = ['MANAGER', 'SUPER_ADMIN'].includes(user?.role);

  useEffect(() => {
    menuRef.current?.removeAttribute('open');
  }, [pathname]);

  const closeMenu = () => menuRef.current?.removeAttribute('open');
  const logout = () => {
    closeMenu();
    onLogout();
  };

  return <details className={`profile-menu ${className}`} ref={menuRef}>
    <summary aria-label="Open profile menu">
      {user?.profile_photo
        ? <img src={assetUrl(user.profile_photo)} alt="" />
        : <span className="profile-menu-avatar"><UserRound size={17} aria-hidden="true" /></span>}
      <span className="profile-menu-name">{user?.name || 'Account'}</span>
      <ChevronDown size={14} aria-hidden="true" />
    </summary>
    <div className="profile-menu-popover">
      <span className="profile-menu-identity">{user?.email}</span>
      <Link href="/profile" onClick={closeMenu}>My Profile</Link>
      <Link href="/profile#edit" onClick={closeMenu}>Edit Profile</Link>
      <Link href="/profile#password" onClick={closeMenu}>Change Password</Link>
      {staff && <Link href="/dashboard" onClick={closeMenu}>Dashboard</Link>}
      <button type="button" onClick={logout}>Logout</button>
    </div>
  </details>;
}
