import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Truck, Shield, Loader2, LogOut, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const allRoles = [
  {
    id: "donor" as const,
    title: "Donor",
    description: "You will donate food to the needy",
    icon: Heart,
    path: "/donor",
    color: "bg-primary/10 text-primary",
  },
  {
    id: "ngo" as const,
    title: "NGO / Organization",
    description: "Receive food & assign riders for delivery",
    icon: Building2,
    path: "/ngo",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "volunteer" as const,
    title: "Volunteer / Rider",
    description: "Pickup & deliver food like InDrive",
    icon: Truck,
    path: "/volunteer",
    color: "bg-secondary/10 text-secondary",
  },
  {
    id: "admin" as const,
    title: "Admin",
    description: "Manage platform & oversee operations",
    icon: Shield,
    path: "/admin",
    color: "bg-accent text-accent-foreground",
  },
];

const SelectRole = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(!profile);
  const [approvedRoles, setApprovedRoles] = useState<string[]>(profile?.user_roles?.map((r: any) => r.role) || []);

  useEffect(() => {
    if (authLoading) return;

    const checkRoles = async () => {
      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      // Use roles from profile context if available
      let userRoles = profile?.user_roles?.map((r: any) => r.role) || [];

      // Fallback: If user_roles is still empty in context, maybe it was just created?
      // But we should trust the AuthContext's profile for the most part.
      
      if (userRoles.length === 0 && user.user_metadata?.role) {
        const metadataRole = user.user_metadata.role;
        userRoles = [metadataRole];
        
        // Sync to DB in background
        (async () => {
          await supabase.from("user_roles").insert({
            user_id: user.id,
            role: metadataRole
          });
        })().catch(err => console.warn("Role sync failed", err));
      }

      // Sync phone if missing from profile but in metadata
      if (user.user_metadata?.phone && (!profile || !profile.phone)) {
        (async () => {
           await supabase.from("profiles").update({
             phone: user.user_metadata.phone
           }).eq("id", user.id);
        })().catch(err => console.warn("Phone sync failed", err));
      }

      if (userRoles.includes("admin")) {
        navigate("/admin", { replace: true });
        return;
      }

      if (userRoles.length === 1) {
        const role = allRoles.find((r) => r.id === userRoles[0]);
        if (role) {
          navigate(role.path, { replace: true });
          return;
        }
      }

      setApprovedRoles(userRoles);
      setLoading(false);
    };

    checkRoles();
  }, [user, profile, authLoading, navigate]);


  const handleLogout = async () => {
    await signOut();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const visibleRoles = allRoles.filter((r) => approvedRoles.includes(r.id));

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center page-padding">
      <div className="text-center mb-10 animate-fade-in">
        {visibleRoles.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground font-body mb-2">Choose one</p>
            <h1 className="text-3xl font-bold text-foreground">Select Your Role</h1>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-3">Registration Pending ⏳</h1>
            <p className="text-muted-foreground font-body text-sm max-w-xs mx-auto">
              Your registration is currently under review by the admin. You will be able to access the dashboard once it is approved.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {visibleRoles.map((role, i) => (
          <button
            key={role.id}
            onClick={() => navigate(role.path)}
            className="glass-card-elevated p-5 flex items-center gap-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] animate-slide-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${role.color}`}>
              <role.icon size={28} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{role.title}</h3>
              <p className="text-sm text-muted-foreground font-body">{role.description}</p>
            </div>
          </button>
        ))}

        <button
          onClick={handleLogout}
          className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default SelectRole;
