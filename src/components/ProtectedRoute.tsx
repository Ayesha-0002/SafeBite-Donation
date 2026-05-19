import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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
    // Standard role check: checks user_roles table, metadata fallback, and direct profile role field
    const hasRole = userRoles.includes(requiredRole) || metadataRole === requiredRole || profile?.role === requiredRole;

    if (!hasRole) {
      console.log("ProtectedRoute: Role missing", { requiredRole, userRoles, metadataRole });
      navigate("/select-role", { replace: true });
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
