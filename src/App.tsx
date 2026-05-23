import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import React, { useEffect, Suspense, lazy } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Lazy-loaded page components for route-level code splitting
const Auth = lazy(() => import("./pages/Auth"));
const SelectRole = lazy(() => import("./pages/SelectRole"));
const DonorDashboard = lazy(() => import("./pages/donor/DonorDashboard"));
const PostFood = lazy(() => import("./pages/donor/PostFood"));
const DonorHistory = lazy(() => import("./pages/donor/DonorHistory"));
const DonorChat = lazy(() => import("./pages/donor/DonorChat"));
const DonorProfile = lazy(() => import("./pages/donor/DonorProfile"));
const DonorSettings = lazy(() => import("./pages/donor/DonorSettings"));
const NgoDashboard = lazy(() => import("./pages/ngo/NgoDashboard"));
const NgoChat = lazy(() => import("./pages/ngo/NgoChat"));
const NgoTrackRider = lazy(() => import("./pages/ngo/NgoTrackRider"));
const NgoProfile = lazy(() => import("./pages/ngo/NgoProfile"));
const NgoSettings = lazy(() => import("./pages/ngo/NgoSettings"));
const VolunteerDashboard = lazy(() => import("./pages/volunteer/VolunteerDashboard"));
const LiveTracking = lazy(() => import("./pages/volunteer/LiveTracking"));
const VolunteerPickups = lazy(() => import("./pages/volunteer/VolunteerPickups"));
const VolunteerProfile = lazy(() => import("./pages/volunteer/VolunteerProfile"));
const VolunteerSettings = lazy(() => import("./pages/volunteer/VolunteerSettings"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Blocked = lazy(() => import("./pages/Blocked"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="mobile-container min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <Loader2 className="animate-spin text-primary mx-auto mb-4" size={40} />
      <p className="text-sm text-muted-foreground animate-pulse font-bold tracking-wide uppercase text-[10px]">Loading section...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading, error, inVerificationMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const lastRedirect = React.useRef<string | null>(null);

  useEffect(() => {
    // Only block if we have a fatal config error, or if we are still loading without user/profile cache
    if (error) return;
    if (loading && !(user && profile)) return;
    
    const authPages = ["/", "/login", "/register"];
    const selectRolePage = "/select-role";
    const blockedPage = "/blocked";
    
    const isAuthPage = authPages.includes(pathname);
    const isSelectRolePage = pathname === selectRolePage;
    const isBlockedPage = pathname === blockedPage;

    const userRoles = profile?.user_roles?.map((r: any) => r.role) || [];
    const hasAnyRole = userRoles.length > 0 || !!user?.user_metadata?.role || !!profile?.role;
    // OTP verification bypassed for now as requested
    const needsVerification = false;

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
  
  const showLoader = loading && !profile && !user; 

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
    <Suspense fallback={
      <div style={{
        display: "flex",
        justifyContent: "center", 
        alignItems: "center",
        height: "100vh",
        background: "#fff"
      }}>
        <div style={{
          width: "40px",
          height: "40px", 
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #22c55e",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
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
    </Suspense>
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
