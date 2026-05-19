import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import React, { useEffect } from "react";
import Auth from "./pages/Auth";
import SelectRole from "./pages/SelectRole";
import ProtectedRoute from "./components/ProtectedRoute";
import DonorDashboard from "./pages/donor/DonorDashboard";
import PostFood from "./pages/donor/PostFood";
import DonorHistory from "./pages/donor/DonorHistory";
import DonorChat from "./pages/donor/DonorChat";
import DonorProfile from "./pages/donor/DonorProfile";
import DonorSettings from "./pages/donor/DonorSettings";
import NgoDashboard from "./pages/ngo/NgoDashboard";
import NgoChat from "./pages/ngo/NgoChat";
import NgoTrackRider from "./pages/ngo/NgoTrackRider";
import NgoProfile from "./pages/ngo/NgoProfile";
import NgoSettings from "./pages/ngo/NgoSettings";
import VolunteerDashboard from "./pages/volunteer/VolunteerDashboard";
import LiveTracking from "./pages/volunteer/LiveTracking";
import VolunteerPickups from "./pages/volunteer/VolunteerPickups";
import VolunteerProfile from "./pages/volunteer/VolunteerProfile";
import VolunteerSettings from "./pages/volunteer/VolunteerSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Blocked from "./pages/Blocked";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";

const queryClient = new QueryClient();

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading, error, inVerificationMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const lastRedirect = React.useRef<string | null>(null);

  useEffect(() => {
    // Only proceed if auth information is ready
    if (loading || error) return;
    
    const authPages = ["/", "/login", "/register"];
    const selectRolePage = "/select-role";
    const blockedPage = "/blocked";
    
    const isAuthPage = authPages.includes(pathname);
    const isSelectRolePage = pathname === selectRolePage;
    const isBlockedPage = pathname === blockedPage;

    const userRoles = profile?.user_roles?.map((r: any) => r.role) || [];
    const hasAnyRole = userRoles.length > 0 || !!user?.user_metadata?.role || !!profile?.role;
    const needsVerification = user && profile && profile.phone && !profile.phone_verified;

    console.log("[AuthGuard] state:", { 
      pathname, 
      user: !!user, 
      profile: !!profile, 
      needsVerification, 
      inVerificationMode,
      hasAnyRole
    });

    // 1. Unauthenticated users: must be on auth pages
    if (!user) {
      if (!isAuthPage && pathname !== "/login") {
        console.log("[AuthGuard] Redirecting unauthenticated user to login");
        navigate("/login", { replace: true });
      }
      return;
    }

    // Wait for profile to load for authenticated users
    if (!profile) return;

    // 2. Blocked users
    if (profile?.is_blocked && !isBlockedPage) {
      console.log("[AuthGuard] Redirecting blocked user to blocked page");
      navigate(blockedPage, { replace: true });
      return;
    }
    
    // 3. Unverified users
    if (needsVerification && !isAuthPage && !isSelectRolePage && !isBlockedPage && !inVerificationMode) {
       console.log("[AuthGuard] User needs verification, redirecting to login");
       navigate("/login", { replace: true });
       return;
    }

    // 4. No role
    if (!hasAnyRole && !isSelectRolePage && !isBlockedPage && !isAuthPage) {
      console.log("[AuthGuard] No role found, redirecting to select-role");
      navigate(selectRolePage, { replace: true });
      return;
    }
    
    // 5. Authenticated users on Auth pages/SelectRole
    if (isAuthPage || isSelectRolePage) {
      if (needsVerification && !isSelectRolePage) {
        console.log("[AuthGuard] Authenticated but unverified, staying on auth page for OTP");
        return;
      }

      let target = selectRolePage;
      if (hasAnyRole) {
        const allRoles = [...userRoles, profile?.role, user.user_metadata?.role].filter(Boolean);
        if (allRoles.includes("admin")) target = "/admin";
        else if (allRoles.includes("donor")) target = "/donor";
        else if (allRoles.includes("ngo")) target = "/ngo";
        else if (allRoles.includes("volunteer")) target = "/volunteer";
      }

      if (pathname !== target) {
        console.log(`[AuthGuard] Redirecting authenticated user to ${target}`);
        navigate(target, { replace: true });
      }
      return;
    }
  }, [user, profile, loading, error, navigate, pathname, inVerificationMode]);

  const isAuthPage = ["/", "/login", "/register", "/select-role"].includes(pathname);
  const isDashboard = ["/donor", "/ngo", "/volunteer", "/admin"].some(path => pathname.startsWith(path));
  
  const showLoader = loading; 

  if (error) {
    return (
      <div className="mobile-container min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center p-6 bg-destructive/10 rounded-2xl border border-destructive/20 shadow-sm">
          <p className="text-destructive font-bold mb-2">Configuration Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (showLoader) {
    return (
      <div className="mobile-container min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={40} />
          <p className="text-sm text-muted-foreground animate-pulse">Initializing SafeBite...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AuthGuardWrapper = () => (
  <AuthGuard>
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/select-role" element={<SelectRole />} />
      <Route path="/blocked" element={<Blocked />} />
      <Route path="/notifications" element={<Notifications />} />
      
      {/* Donor Routes */}
      <Route path="/donor" element={<ProtectedRoute requiredRole="donor"><DonorDashboard /></ProtectedRoute>} />
      <Route path="/donor/post" element={<ProtectedRoute requiredRole="donor"><PostFood /></ProtectedRoute>} />
      <Route path="/donor/history" element={<ProtectedRoute requiredRole="donor"><DonorHistory /></ProtectedRoute>} />
      <Route path="/donor/chat" element={<ProtectedRoute requiredRole="donor"><DonorChat /></ProtectedRoute>} />
      <Route path="/donor/profile" element={<ProtectedRoute requiredRole="donor"><DonorProfile /></ProtectedRoute>} />
      <Route path="/donor/settings" element={<ProtectedRoute requiredRole="donor"><DonorSettings /></ProtectedRoute>} />
      
      {/* NGO / Organization Routes */}
      <Route path="/ngo" element={<ProtectedRoute requiredRole="ngo"><NgoDashboard /></ProtectedRoute>} />
      <Route path="/ngo/requests" element={<ProtectedRoute requiredRole="ngo"><NgoDashboard /></ProtectedRoute>} />
      <Route path="/ngo/chat" element={<ProtectedRoute requiredRole="ngo"><NgoChat /></ProtectedRoute>} />
      <Route path="/ngo/track" element={<ProtectedRoute requiredRole="ngo"><NgoTrackRider /></ProtectedRoute>} />
      <Route path="/ngo/profile" element={<ProtectedRoute requiredRole="ngo"><NgoProfile /></ProtectedRoute>} />
      <Route path="/ngo/settings" element={<ProtectedRoute requiredRole="ngo"><NgoSettings /></ProtectedRoute>} />
      
      {/* Volunteer / Rider Routes */}
      <Route path="/volunteer" element={<ProtectedRoute requiredRole="volunteer"><VolunteerDashboard /></ProtectedRoute>} />
      <Route path="/volunteer/tracking" element={<ProtectedRoute requiredRole="volunteer"><LiveTracking /></ProtectedRoute>} />
      <Route path="/volunteer/pickups" element={<ProtectedRoute requiredRole="volunteer"><VolunteerPickups /></ProtectedRoute>} />
      <Route path="/volunteer/profile" element={<ProtectedRoute requiredRole="volunteer"><VolunteerProfile /></ProtectedRoute>} />
      <Route path="/volunteer/settings" element={<ProtectedRoute requiredRole="volunteer"><VolunteerSettings /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthGuardWrapper />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
