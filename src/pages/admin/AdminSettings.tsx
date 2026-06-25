import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, User, Phone, Mail, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState({
    full_name: authProfile?.full_name || "",
    phone: authProfile?.phone || "",
    email: authProfile?.email || user?.email || "",
  });
  const [loading, setLoading] = useState(!authProfile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authProfile) {
      setProfile({
        full_name: authProfile.full_name || "",
        phone: authProfile.phone || "",
        email: authProfile.email || user?.email || "",
      });
      setLoading(false);
    }
  }, [authProfile, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not logged in");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq("id", currentUser.id);

      if (error) throw error;
      
      await refreshProfile();
      toast.success("Admin profile updated successfully");
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
        <h1 className="text-lg font-bold">Admin Settings</h1>
      </div>

      <div className="page-padding py-6">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="flex flex-col items-center mb-4">
             <div className="w-20 h-20 rounded-3xl gradient-dark flex items-center justify-center text-white shadow-xl mb-3 border border-white/10">
                <Shield size={40} className="stroke-[2]" />
             </div>
             <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">System Admin</p>
          </div>

          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-2 block tracking-widest px-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-bold text-sm shadow-sm"
                      placeholder="Admin Name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-2 block tracking-widest px-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-bold text-sm shadow-sm"
                      placeholder="+92 XXX XXXXXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-2 block tracking-widest px-1 opacity-50">
                    Email (Read-only)
                  </label>
                  <div className="relative opacity-60">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed font-bold text-sm"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white gradient-dark transition-all hover:shadow-xl active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Confirm Updates
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
