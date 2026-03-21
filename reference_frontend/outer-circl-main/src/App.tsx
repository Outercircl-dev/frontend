// PHASE 1: Core architectural fix - Proper provider hierarchy
import React, { FC, Suspense } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { PinterestLoadingSkeleton } from "./components/ui/PinterestSkeleton";
import { AppProviders } from "./components/core/AppProviders";
import { useAuth } from "./hooks/useAuth";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { SafariPrivateModeWarning } from "./components/SafariPrivateModeWarning";
import MobileLoadingScreen from "./components/MobileLoadingScreen";

// Import ALL pages synchronously for stability - Pinterest approach
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import NewsletterSignup from "./pages/NewsletterSignup";
import NotFound from "./pages/NotFound";
import FooterNav from "./components/sections/FooterNav";
import OptimizedEventDetails from "./pages/OptimizedEventDetails";
import SafeDashboard from "./pages/SafeDashboard";
import SafeProfile from './pages/SafeProfile';
import SafeCreateEvent from "./pages/SafeCreateEvent";
import Settings from "./pages/Settings";
import HelpCenter from "./pages/HelpCenter";
import SecurityAdmin from "./pages/SecurityAdmin";
import AdminTest from "./pages/AdminTest";

import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";
import SafeMembership from "./components/membership/SafeMembership";
import SafeNotifications from "./components/notifications/SafeNotifications";
import SafeMessages from "./components/messages/SafeMessages";

// Update document title - Pinterest style
document.title = "outercircl - Find activity friends near you";

// PHASE 1: Simplified protected routes - AppBootstrap guarantees context is ready
const ProtectedRoute: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// PHASE 1: Simplified auth route - AppBootstrap guarantees context is ready
const AuthRoute: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes: FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/community-guidelines" element={<CommunityGuidelines />} />
      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/contact-us" element={<ContactUs />} />
      <Route path="/thebuzz" element={<NewsletterSignup />} />
      <Route path="/help" element={<HelpCenter />} />
      
      {/* Auth routes - redirect to dashboard if logged in */}
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/reset-password" element={<AuthRoute><ResetPassword /></AuthRoute>} />
      
      {/* Protected routes - require authentication */}
      <Route path="/dashboard" element={<ProtectedRoute><SafeDashboard /></ProtectedRoute>} />
      <Route path="/event/:id" element={<ProtectedRoute><OptimizedEventDetails /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><SafeProfile /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProtectedRoute><SafeProfile /></ProtectedRoute>} />
      <Route path="/profile/:userId/followers" element={<ProtectedRoute><SafeProfile /></ProtectedRoute>} />
      <Route path="/profile/:userId/activities" element={<ProtectedRoute><SafeProfile /></ProtectedRoute>} />
      <Route path="/create-activity" element={<ProtectedRoute><SafeCreateEvent /></ProtectedRoute>} />
      <Route path="/create-event" element={<ProtectedRoute><SafeCreateEvent /></ProtectedRoute>} />
      <Route path="/membership" element={<ProtectedRoute><SafeMembership /></ProtectedRoute>} />
      <Route path="/accept-invitation" element={<ProtectedRoute><AcceptInvitation /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><SafeNotifications /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><SafeMessages /></ProtectedRoute>} />
      
      {/* Admin routes */}
      <Route path="/security-admin" element={
        <ProtectedRoute>
          <AdminProtectedRoute>
            <SecurityAdmin />
          </AdminProtectedRoute>
        </ProtectedRoute>
      } />
      <Route path="/admin-test" element={<ProtectedRoute><AdminTest /></ProtectedRoute>} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App: FC = () => {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <SafariPrivateModeWarning />
        <div className="min-h-screen flex flex-col bg-background">
          <div className="flex-1">
            <Suspense fallback={<PinterestLoadingSkeleton />}>
              <AppRoutes />
            </Suspense>
          </div>
          <FooterNav />
        </div>
      </AppErrorBoundary>
    </AppProviders>
  );
};

export default App;