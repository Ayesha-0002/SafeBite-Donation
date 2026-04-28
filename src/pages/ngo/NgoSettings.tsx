import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, User, Phone, Mail, Building2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const NgoSettings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem("sb_profile_cache");
      if (cached) {
        const p = JSON.parse(cached);
        return {
          full_name: p.full_name || "",
          phone: p.phone || "",
          email: p.email || "",
          address: p.address || "",
        };
      }
    } catch (error) {
      console.error("Cache parse error:", error);
    }
    return {
      full_name: "",
      phone: "",
      email: "",
      address: "",
    };
  });
  const [loading, setLoading] = useState(!profile.full_name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Safety timeout to ensure loader doesn't stick
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          const newProfile = {
            full_name: data.full_name || "",
            phone: data.phone || "",
            email: user.email || "",
            address: data.address || "",
          };
          setProfile(newProfile);
          localStorage.setItem("sb_profile_cache", JSON.stringify({ ...data, email: user.email }));
        }
      } catch (err) {
        console.error("fetchProfile error:", err);
      } finally {
        setLoading(false);
        clearTimeout(timer);
      }
    };
    fetchProfile();
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("NGO profile updated successfully");
      navigate("/ngo/profile");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border bg-background">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-all active:scale-90">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold">NGO Settings</h1>
      </div>

      <div className="page-padding py-6">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            {loading && !profile.full_name ? (
              // Skeleton for initial load if no cache
              <div className="space-y-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2">
                    <Building2 size={16} className="text-muted-foreground" />
                    Registration Name / NGO Name
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm"
                    placeholder="Enter NGO full name"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2">
                    <Phone size={16} className="text-muted-foreground" />
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm"
                    placeholder="+92 300 1234567"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2">
                    <MapPin size={16} className="text-muted-foreground" />
                    Organization Address
                  </label>
                  <textarea
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm min-h-[80px]"
                    placeholder="Enter complete NGO office address"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2 opacity-50">
                    <Mail size={16} className="text-muted-foreground" />
                    Email (Cannot be changed)
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-input bg-muted/50 text-muted-foreground cursor-not-allowed font-body text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground gradient-primary transition-all hover:opacity-90 active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default NgoSettings;
