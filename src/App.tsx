import React, { lazy, Suspense, useEffect } from 'react';
import { motion } from 'motion/react';
import { QuickDictionarySuite } from './components/dictionary/QuickDictionarySuite';
import { PaletteQuickModal } from './components/theme/PaletteQuickModal';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { AppProvider, useApp } from './lib/AppContext';
import {
  buildAuthRedirectUrl,
  isProtectedRoute,
  normalizeRoutePath,
} from './lib/authGuard';
import { RouterProvider, useRouter } from './lib/router';
import { AboutPage } from './pages/AboutPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { GuidePage } from './pages/GuidePage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LabPage } from './pages/LabPage';
import { LibraryPage } from './pages/LibraryPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfilePage } from './pages/ProfilePage';
import { KeyboardShortcutsModal } from './components/ui/KeyboardShortcutsModal';

// Code-split /admin editorial console for leaner initial load
const AdminPage = lazy(() => import('./pages/AdminPage'));

function RouteView() {
  const { pathname, search, navigate } = useRouter();
  const { user } = useApp();

  const normalizedPath = normalizeRoutePath(pathname);
  const effectivePath = normalizedPath === '/survey' ? '/onboarding' : normalizedPath;
  const blockedByAuth = !user.isAuthenticated && isProtectedRoute(effectivePath);

  useEffect(() => {
    if (normalizedPath === '/survey' && user.isAuthenticated) {
      navigate('/onboarding', { replace: true });
      return;
    }
    if (!blockedByAuth) {
      return;
    }
    // Single inline notice is displayed by AuthPage — no duplicate toast here
    navigate(buildAuthRedirectUrl(effectivePath, search), { replace: true });
  }, [blockedByAuth, normalizedPath, effectivePath, search, navigate, user.isAuthenticated]);

  let pageNode: React.ReactNode;

  if (blockedByAuth) {
    pageNode = (
      <AuthPage
        forcedReason="auth_required"
        forcedRedirect={`${effectivePath}${search}`}
      />
    );
  } else if (effectivePath === '/') {
    pageNode = <HomePage />;
  } else if (effectivePath === '/about') {
    pageNode = <AboutPage />;
  } else if (effectivePath === '/auth') {
    pageNode = <AuthPage />;
  } else if (effectivePath === '/onboarding') {
    pageNode = <OnboardingPage />;
  } else if (effectivePath === '/dashboard') {
    pageNode = <DashboardPage />;
  } else if (effectivePath === '/library') {
    pageNode = <LibraryPage />;
  } else if (effectivePath.startsWith('/library/')) {
    const docId = decodeURIComponent(effectivePath.slice('/library/'.length));
    pageNode = <DocumentDetailPage documentId={docId} />;
  } else if (effectivePath === '/glossary') {
    pageNode = <GlossaryPage />;
  } else if (effectivePath === '/lab') {
    pageNode = <LabPage />;
  } else if (effectivePath === '/guide') {
    pageNode = <GuidePage />;
  } else if (effectivePath === '/history') {
    pageNode = <HistoryPage />;
  } else if (effectivePath === '/profile') {
    pageNode = <ProfilePage />;
  } else if (effectivePath === '/admin') {
    pageNode = (
      <Suspense
        fallback={
          <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-text-muted)]">
            Đang tải trang Quản trị nội dung…
          </div>
        }
      >
        <AdminPage />
      </Suspense>
    );
  } else {
    pageNode = <HomePage />;
  }

  return (
    <motion.div
      key={blockedByAuth ? '/auth' : effectivePath}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {pageNode}
    </motion.div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppProvider>
          <RouterProvider>
            <RouteView />
            <PaletteQuickModal />
            <QuickDictionarySuite />
            <KeyboardShortcutsModal />
          </RouterProvider>
        </AppProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
