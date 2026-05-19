import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  inVerificationMode: boolean;
  setInVerificationMode: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
  signOut: async () => {},
  inVerificationMode: false,
  setInVerificationMode: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem("sb_user_cache");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [profile, setProfile] = useState<any | null>(() => {
    try {
      const cached = localStorage.getItem("sb_profile_cache");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [inVerificationMode, setInVerificationMode] = useState(false);

  // Speed optimization: Read from local storage before any network call
  useEffect(() => {
    const cachedUser = localStorage.getItem("sb_user_cache");
    const cachedProfile = localStorage.getItem("sb_profile_cache");
    if (cachedUser) setUser(JSON.parse(cachedUser));
    if (cachedProfile) setProfile(JSON.parse(cachedProfile));
    
    // If we have cached profile, we can show UI immediately while revalidating
    // BUT we must keep loading = true until verified by Supabase
  }, []);

  const signOut = async () => {
    console.log("signOut initiated");
    try {
      // CLEAR CACHE IMMEDIATELY for instant UI response
      localStorage.clear();
      sessionStorage.clear();
      
      // Reset React states immediately
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);

      // Suppress supabase signout errors as we already cleared local state
      supabase.auth.signOut().catch(() => {});

      // Use window.location.href for a hard reset to login page
      window.location.href = "/login";
    } catch (err) {
      console.error("SignOut fatal error:", err);
      window.location.href = "/login";
    }
  };

  const fetchProfile = async (uid: string) => {
    try {
      // Speed up by fetching profile and roles in parallel
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid)
      ]);
      
      const profile = profileRes.data;
      const roles = rolesRes.data;

      if (profileRes.error) console.error("Profile fetch error:", profileRes.error);
      if (rolesRes.error) console.error("Roles fetch error:", rolesRes.error);

      const finalProfile = { ...profile, user_roles: roles || [] };
      
      // Update cache
      localStorage.setItem("sb_profile_cache", JSON.stringify(finalProfile));
      
      // Cache role for faster navigation in App.tsx
      if (roles && roles.length > 0) {
        localStorage.setItem(`sb_role_${uid}`, roles[0].role);
      } else if (profile?.role) {
        localStorage.setItem(`sb_role_${uid}`, profile.role);
      }

      return finalProfile;
    } catch (e) {
      console.error("fetchProfile unexpected error:", e);
      return { user_roles: [] };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    if (initialized) return;
    
    const initAuth = async () => {
      setInitialized(true);
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setError("Supabase configuration is missing.");
        setLoading(false);
        return;
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          localStorage.setItem("sb_user_cache", JSON.stringify(currentUser));
          const p = await fetchProfile(currentUser.id);
          setProfile(p);
        } else {
          localStorage.removeItem("sb_user_cache");
          localStorage.removeItem("sb_profile_cache");
        }
      } catch (error) {
        console.error("AuthProvider: initAuth error:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setSession(session);
            setUser(session?.user || null);
            if (session?.user) {
                const p = await fetchProfile(session.user.id);
                setProfile(p);
            }
        } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setProfile(null);
        }
        setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialized]);

  const value = React.useMemo(() => ({ session, user, profile, loading, error, refreshProfile, signOut, inVerificationMode, setInVerificationMode }), [session, user, profile, loading, error, inVerificationMode]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
