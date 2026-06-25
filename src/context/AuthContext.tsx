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
  setAuthData: (session: Session | null, user: User | null, profile: any | null) => void;
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
  setAuthData: () => {},
});

const promiseWithTimeout = <T,>(promise: Promise<T>, ms: number, defaultValue: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(defaultValue), ms))
  ]);
};

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
  const [loading, setLoading] = useState(() => {
    try {
      const token = localStorage.getItem("safebite-auth-token");
      const cachedUser = localStorage.getItem("sb_user_cache");
      if (!token && !cachedUser) {
        // Absolutely no session exists. Load page instantly with no loading screen!
        return false;
      }
      const cachedProfile = localStorage.getItem("sb_profile_cache");
      return !(cachedUser && cachedProfile);
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [inVerificationMode, setInVerificationMode] = useState(false);
  const lastFetchedUid = React.useRef<string | null>(null);

  const setAuthData = React.useCallback((newSession: Session | null, newUser: User | null, newProfile: any | null) => {
    setSession(newSession);
    setUser(newUser);
    setProfile(newProfile);
    setLoading(false);
  }, []);

  // Speed optimization: Read from local storage before any network call
  useEffect(() => {
    const cachedUser = localStorage.getItem("sb_user_cache");
    const cachedProfile = localStorage.getItem("sb_profile_cache");
    if (cachedUser) setUser(JSON.parse(cachedUser));
    if (cachedProfile) setProfile(JSON.parse(cachedProfile));
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

  const fetchProfile = async (uid: string, authUser?: User | null) => {
    // If we already loaded a profile that is fully active, we can skip fetching to save bandwidth.
    // However, if the profile lacks approval or is still "user/volunteer" in transition, we MUST fetch it from DB.
    if (lastFetchedUid.current === uid && profile && (profile.is_approved === true || profile.role !== "volunteer")) {
      console.log("fetchProfile: Profile already loaded and approved, skipping network fetch.");
      return profile;
    }
    lastFetchedUid.current = uid;
    try {
      // Speed up by fetching profile and roles in parallel with timing safety (6 seconds timeout)
      const fetchPromise = Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid)
      ]);

      const TIMEOUT_SENTINEL = "TIMEOUT_EXCEEDED";
      const result = await Promise.race([
        fetchPromise,
        new Promise<any>((resolve) => setTimeout(() => resolve(TIMEOUT_SENTINEL), 6000))
      ]);

      let profileRes = { data: null, error: null };
      let rolesRes = { data: [], error: null };
      let isTimeout = false;

      if (result === TIMEOUT_SENTINEL) {
        isTimeout = true;
        console.warn("fetchProfile: Database query timed out after 6 seconds.");
      } else {
        const [pRes, rRes] = result;
        profileRes = pRes || { data: null, error: null };
        rolesRes = rRes || { data: [], error: null };
      }
      
      const dbProfile = profileRes.data;
      let roles = rolesRes.data || [];

      if (profileRes.error) console.error("Profile fetch error:", profileRes.error);
      if (rolesRes.error) console.error("Roles fetch error:", rolesRes.error);

      // If we timed out or got an error, let's keep the existing state instead of deleting roles
      if (isTimeout && profile) {
        console.log("fetchProfile: Retaining existing cached profile due to backend timeout.");
        return profile;
      }

      // Use the passed in user or fallback to authContext's state user (Avoid supabase.auth.getUser() deadlock)
      const currentUser = authUser || user;
      const metaPhone = currentUser?.user_metadata?.phone;
      const metaRole = currentUser?.user_metadata?.role;
      const metaName = currentUser?.user_metadata?.full_name;

      // Ensure role is in user_roles table
      if (!isTimeout && roles.length === 0 && metaRole) {
        console.log("AuthContext: user_roles is empty, syncing role from metadata:", metaRole);
        try {
          const { data: insertedRole, error: insertError } = await supabase
            .from("user_roles")
            .insert({ user_id: uid, role: metaRole })
            .select("role");
          
          if (!insertError && insertedRole && insertedRole.length > 0) {
            roles = insertedRole;
          } else {
            roles = [{ role: metaRole }];
          }
        } catch (err) {
          console.warn("AuthContext role sync failed:", err);
          roles = [{ role: metaRole }];
        }
      }

      // Automatically sync name, phone, and email from auth metadata/user to the public profiles table in Supabase
      let finalSyncedProfile = dbProfile;
      const dbPhone = dbProfile?.phone;
      const dbName = dbProfile?.full_name;
      const dbEmail = dbProfile?.email;
      
      const metaEmail = currentUser?.email;
      const finalName = dbName || metaName || "User";
      const finalPhone = dbPhone || metaPhone || "";
      const finalEmail = dbEmail || metaEmail || "";

      const needsProfileCreation = !isTimeout && !dbProfile && uid;
      const needsSync = !isTimeout && dbProfile && (dbName !== finalName || dbPhone !== finalPhone || dbEmail !== finalEmail);

      if (uid && needsProfileCreation) {
        console.log("AuthContext: Profile row missing, creating with metadata/auth info...", { finalName, finalPhone, finalEmail });
        try {
          const { data: insertData, error: insertErr } = await supabase
            .from("profiles")
            .upsert({
              id: uid,
              full_name: finalName,
              phone: finalPhone,
              email: finalEmail
            })
            .select("*")
            .maybeSingle();

          if (!insertErr && insertData) {
            finalSyncedProfile = insertData;
          } else {
            console.warn("AuthContext profile insert error:", insertErr);
            finalSyncedProfile = {
              id: uid,
              full_name: finalName,
              phone: finalPhone,
              email: finalEmail
            };
          }
        } catch (insertCatchErr) {
          console.warn("AuthContext profiles insert failed:", insertCatchErr);
          finalSyncedProfile = {
            id: uid,
            full_name: finalName,
            phone: finalPhone,
            email: finalEmail
          };
        }
      } else if (uid && needsSync) {
        console.log("AuthContext: Profile exists but has missing/stale values, syncing...", { finalName, finalPhone, finalEmail });
        try {
          const { data: updateData, error: updateErr } = await supabase
            .from("profiles")
            .update({
              full_name: finalName,
              phone: finalPhone,
              email: finalEmail
            })
            .eq("id", uid)
            .select("*")
            .maybeSingle();

          if (!updateErr && updateData) {
            finalSyncedProfile = updateData;
          } else {
            console.warn("AuthContext profile update error:", updateErr);
            finalSyncedProfile = {
              ...dbProfile,
              full_name: finalName,
              phone: finalPhone,
              email: finalEmail
            };
          }
        } catch (updateCatchErr) {
          console.warn("AuthContext profiles update failed:", updateCatchErr);
          finalSyncedProfile = {
            ...dbProfile,
            full_name: finalName,
            phone: finalPhone,
            email: finalEmail
          };
        }
      }

      if (!finalSyncedProfile) {
        finalSyncedProfile = {
          id: uid,
          full_name: finalName,
          phone: finalPhone,
          email: finalEmail
        };
      }
      
      const finalProfile = { 
        ...finalSyncedProfile, 
        phone: finalSyncedProfile?.phone || metaPhone || null,
        email: finalSyncedProfile?.email || currentUser?.email || null,
        user_roles: roles || [] 
      };
      
      // Update cache
      if (!isTimeout) {
        localStorage.setItem("sb_profile_cache", JSON.stringify(finalProfile));
        
        // Cache role for faster navigation in App.tsx
        if (roles && roles.length > 0) {
          localStorage.setItem(`sb_role_${uid}`, roles[0].role);
        } else if (finalSyncedProfile?.role) {
          localStorage.setItem(`sb_role_${uid}`, finalSyncedProfile.role);
        }
      }

      return finalProfile;
    } catch (e) {
      console.error("fetchProfile unexpected error:", e);
      return { user_roles: [] };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      setLoading(true);
      lastFetchedUid.current = null;
      const p = await fetchProfile(user.id, user);
      setProfile(p);
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (active) setLoading(false);
    }, 200);

    const initAuth = async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setError("Supabase configuration is missing.");
        clearTimeout(timeout);
        setLoading(false);
        return;
      }
      
      try {
        const sessionRes = await promiseWithTimeout(
          supabase.auth.getSession(),
          200,
          { data: { session: null }, error: null } as any
        );
        if (!active) return;
        const session = sessionRes.data?.session || null;
        setSession(session);
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          localStorage.setItem("sb_user_cache", JSON.stringify(currentUser));
          const p = await fetchProfile(currentUser.id, currentUser);
          if (active) setProfile(p);
        } else {
          localStorage.removeItem("sb_user_cache");
          localStorage.removeItem("sb_profile_cache");
          if (active) {
            setUser(null);
            setProfile(null);
          }
          clearTimeout(timeout);
          if (active) setLoading(false);
        }
      } catch (error) {
        console.error("AuthProvider: initAuth error:", error);
      } finally {
        if (active) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    };

    initAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[AuthContext] event: ${event}`);
        if (!active) return;
        
        clearTimeout(timeout);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if ((window as any).__safebite_signing_up) {
                console.log("[AuthContext] Skipping onAuthStateChange during active signup flow");
                return;
            }

            // Bypass duplicate updates & loading states for direct login flow in Auth.tsx
            if ((window as any).__safebite_signing_in) {
                console.log("[AuthContext] Skipping onAuthStateChange duplicate fetch during active login flow");
                setSession(session);
                setUser(session?.user || null);
                return;
            }

            const hasCache = !!localStorage.getItem("sb_profile_cache");
            const cachedUserStr = localStorage.getItem("sb_user_cache");
            const cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
            const isDifferentUser = session?.user?.id !== cachedUser?.id;
            
            if (!hasCache || isDifferentUser) {
                setLoading(true);
            }
            
            setSession(session);
            setUser(session?.user || null);
            if (session?.user) {
                if (hasCache && !isDifferentUser) {
                    // Dynamic optimization: update state in background, never block/display loading screen
                    fetchProfile(session.user.id, session.user).then((p) => {
                        if (active) setProfile(p);
                    }).catch(() => {});
                } else {
                    const p = await fetchProfile(session.user.id, session.user);
                    if (active) setProfile(p);
                }
            }
            if (active) setLoading(false);
        } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setProfile(null);
            localStorage.removeItem("sb_user_cache");
            localStorage.removeItem("sb_profile_cache");
            if (active) setLoading(false);
        }
    });

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = React.useMemo(() => ({ session, user, profile, loading, error, refreshProfile, signOut, inVerificationMode, setInVerificationMode, setAuthData }), [session, user, profile, loading, error, inVerificationMode, setAuthData]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
