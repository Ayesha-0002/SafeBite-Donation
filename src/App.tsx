import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
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
  const { user, profile, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    console.log("[AuthGuard] state changed:", { loading, error, user: !!user, profile: !!profile, pathname });
    
    const isAuthPage = ["/", "/login", "/register"].includes(pathname);

    // Speed up: If we have a user but loading is still true, check for cached role
    if (loading && user) {
      const cachedRole = localStorage.getItem(`sb_role_${user.id}`);
      if (cachedRole && isAuthPage) {
        console.log("[AuthGuard] Found cached role, instant redirect:", cachedRole);
        const roleMap: Record<string, string> = {
          donor: "/donor",
          ngo: "/ngo",
          volunteer: "/volunteer",
          admin: "/admin",
        };
        navigate(roleMap[cachedRole] || "/select-role", { replace: true });
        return;
      }
    }

    if (loading || error) return;

    // 1. Unauthenticated users: must be on auth pages
    if (!user && !isAuthPage) {
      console.log("[AuthGuard] Unauthenticated user on protected page, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    // 2. Authenticated users on Auth pages: redirect to dashboard or role selection
    if (user && isAuthPage) {
      const userRoles = profile?.user_roles?.map((r: any) => r.role) || [];
      const metadataRole = user.user_metadata?.role;
      const profileRole = profile?.role;
      
      console.log("[AuthGuard] Authenticated user on auth page, redirecting", { userRoles, metadataRole, profileRole });

      if (userRoles.includes("admin")) {
        navigate("/admin", { replace: true });
      } else if (userRoles.length === 1) {
        const roleMap: Record<string, string> = {
          donor: "/donor",
          ngo: "/ngo",
          volunteer: "/volunteer",
          admin: "/admin",
        };
        navigate(roleMap[userRoles[0]] || "/select-role", { replace: true });
      } else if (profileRole || metadataRole) {
        const roleMap: Record<string, string> = {
          donor: "/donor",
          ngo: "/ngo",
          volunteer: "/volunteer",
          admin: "/admin",
        };
        const targetRole = profileRole || metadataRole;
        navigate(roleMap[targetRole] || "/select-role", { replace: true });
      } else {
        navigate("/select-role", { replace: true });
      }
      return;
    }

    // 3. Blocked users: must be on blocked page
    if (user && profile?.is_blocked && pathname !== "/blocked") {
      console.log("[AuthGuard] User is blocked, redirecting to blocked page");
      navigate("/blocked", { replace: true });
      return;
    }

    // 4. Authenticated users with NO permissions/roles: must go to select-role
    const userRoles = profile?.user_roles?.map((r: any) => r.role) || [];
    const hasAnyRole = userRoles.length > 0 || !!user?.user_metadata?.role || !!profile?.role;

    if (user && !hasAnyRole && !pathname.includes("select-role") && pathname !== "/blocked" && !isAuthPage) {
      console.log("[AuthGuard] User has no role, redirecting to select-role");
      navigate("/select-role", { replace: true });
    }
  }, [user, profile, loading, error, navigate, pathname]);

  const isAuthPage = ["/", "/login", "/register", "/select-role"].includes(pathname);
  const isDashboard = ["/donor", "/ngo", "/volunteer", "/admin"].some(path => pathname.startsWith(path));
  
  // If we have a user and we are on an auth page, we are DEFINITELY about to redirect.
  // We should show the loader to prevent flashing the login form or the wrong dashboard.
  const isPendingRedirect = user && isAuthPage;
  
  const showLoader = loading || isPendingRedirect; 

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
