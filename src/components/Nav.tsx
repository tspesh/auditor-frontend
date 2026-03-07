import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '',
  );

  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    document.addEventListener('astro:after-swap', update);
    return () => document.removeEventListener('astro:after-swap', update);
  }, []);

  const isActive = pathname === href;

  return (
    <a
      href={href}
      className={`text-sm font-medium transition-colors ${
        isActive
          ? 'text-growth-400'
          : 'text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {children}
    </a>
  );
}

export default function Nav() {
  const { session, profile, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
    : session?.user?.email ?? '';

  return (
    <header className="bg-neutral-900 text-neutral-0">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/" className="font-heading text-xl font-bold tracking-tight">
            <span className="text-growth-500">Auditor</span>
            <span className="text-neutral-400 font-normal text-caption ml-2">
              by Better Off Growth
            </span>
          </a>

          {!loading && session && (
            <nav className="hidden sm:flex items-center gap-5">
              <NavLink href="/dashboard">Dashboard</NavLink>
              {profile?.role === 'admin' && (
                <NavLink href="/admin">Admin</NavLink>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-4 w-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
          ) : session ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-growth-500 flex items-center justify-center text-white font-bold text-xs">
                  {(profile?.first_name?.[0] ?? session.user?.email?.[0] ?? '?').toUpperCase()}
                </div>
                <span className="text-sm text-neutral-300 max-w-[140px] truncate">
                  {displayName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-neutral-400 hover:text-neutral-200 font-medium transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="text-sm font-medium text-growth-400 hover:text-growth-300 transition-colors"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
