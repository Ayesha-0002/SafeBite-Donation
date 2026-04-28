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
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
  signOut: async () => {},
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

  // Speed optimization: Read from local storage before any network call
  useEffect(() => {
    const cachedUser = localStorage.getItem("sb_user_cache");
    const cachedProfile = localStorage.getItem("sb_profile_cache");
    if (cachedUser) setUser(JSON.parse(cachedUser));
    if (cachedProfile) setProfile(JSON.parse(cachedProfile));
    
    // If we have cached profile, we can show UI immediately while revalidating
    if (cachedProfile) {
      setLoading(false);
    }
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
    let mounted = true;

    const initAuth = async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log("AuthProvider: initAuth starting", {
        url: url ? "SET" : "MISSING",
        key: key ? "SET" : "MISSING"
      });

      if (!url || !key) {
        setError("Supabase configuration is missing. Please check your environment variables.");
        setLoading(false);
        return;
      }
      const safetyTimeout = setTimeout(() => {
        if (mounted) {
          console.warn("AuthProvider: initAuth safety timeout reached, forcing loading false");
          setLoading(false);
        }
      }, 1500); // Reduced from 3000 to 1500 for snappier feel

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("AuthProvider: initAuth getSession result", { hasSession: !!session, error: sessionError });
        
        if (mounted) {
          setSession(session);
          const currentUser = session?.user || null;
          setUser(currentUser);
          
          if (currentUser) {
            localStorage.setItem("sb_user_cache", JSON.stringify(currentUser));
          } else {
            localStorage.removeItem("sb_user_cache");
            localStorage.removeItem("sb_profile_cache");
          }
          
          // SPEED OPTIMIZATION: If we have a user and a cached profile, we can stop loading right now
          if (currentUser && profile && mounted) {
            setLoading(false);
          }
          
          if (currentUser) {
            console.log("AuthProvider: initAuth fetching profile for", currentUser.id);
            const p = await fetchProfile(currentUser.id);
            console.log("AuthProvider: initAuth profile fetched", { hasProfile: !!p });
            if (mounted) {
              setProfile(p);
              setLoading(false); // Ensure loading is false after profile is fetched
            }
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("AuthProvider: initAuth error:", error);
        if (mounted) setLoading(false);
      } finally {
        clearTimeout(safetyTimeout);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      if (mounted) {
        setSession(session);
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          localStorage.setItem("sb_user_cache", JSON.stringify(currentUser));
          const p = await fetchProfile(currentUser.id);
          if (mounted) setProfile(p);
        } else {
          setUser(null);
          setProfile(null);
          localStorage.removeItem("sb_user_cache");
          localStorage.removeItem("sb_profile_cache");
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, error, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
