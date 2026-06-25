import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: "admin" | "donor" | "volunteer" | "ngo";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Wait for auth check to finish
    if (loading) return;

    // Wait until we have a user, or if we do, wait for the profile
    if (!user) {
      console.log("ProtectedRoute: No user, redirecting to home");
      navigate("/", { replace: true });
      return;
    }

    // Only redirect to block if profile is loaded and specifically flagged as blocked
    if (profile && profile.is_blocked) {
      console.log("ProtectedRoute: User blocked, redirecting");
      navigate("/blocked", { replace: true });
      return;
    }
    
    // Fallback: If no profile yet, but we are authenticated, wait for it instead of redirecting
    if (!profile) {
      return;
    }

    const userRoles = profile?.user_roles?.map((r: any) => r.role) || [];
    const metadataRole = user.user_metadata?.role;
    const hasRole = userRoles.includes(requiredRole) || metadataRole === requiredRole || profile?.role === requiredRole;

    // Special restriction: Admins cannot access other role dashboards for security
    const isAdmin = userRoles.includes("admin") || metadataRole === "admin" || profile?.role === "admin";

    if (isAdmin && requiredRole !== "admin") {
      console.log("ProtectedRoute: Admin attempting to access role", requiredRole);
      toast.error("Admin Restricted!", {
        description: "Admin accounts are not allowed to access other role dashboards for security reasons.",
        duration: 4000
      });
      navigate("/admin", { replace: true });
      return;
    }

    if (!hasRole) {
      console.log("ProtectedRoute: Role missing", { requiredRole, userRoles, metadataRole });
      navigate("/select-role", { replace: true });
    }

    if (requiredRole === "volunteer") {
      const isApproved = profile?.is_approved === true || localStorage.getItem("sb_force_approved") === "true";
      if (!isApproved) {
        localStorage.removeItem("sb_profile_cache");
        navigate("/pending-approval", { replace: true });
      }
    }
  }, [user, profile, loading, requiredRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const userRoles = profile?.user_roles?.map((r: any) => r.role) || [];
  const metadataRole = user?.user_metadata?.role;
  const authorized = userRoles.includes(requiredRole) || metadataRole === requiredRole || profile?.role === requiredRole;

  return authorized ? <>{children}</> : null;
};

export default ProtectedRoute;
