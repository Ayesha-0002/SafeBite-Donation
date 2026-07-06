import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Utensils, Loader2, AlertTriangle, Terminal, Copy, Check, ExternalLink, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, refreshProfile, setInVerificationMode, signOut, setAuthData } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    role: "" as "" | "donor" | "volunteer" | "ngo",
    address: "",
  });

  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");
  const [timer, setTimer] = useState(120);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [ngoList, setNgoList] = useState<any[]>([]);
  const [selectedNgoId, setSelectedNgoId] = useState("");
  const [ngoSearch, setNgoSearch] = useState("");
  const [fetchingNgos, setFetchingNgos] = useState(false);
  const [showDbTriggerFix, setShowDbTriggerFix] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const copySqlToClipboard = () => {
    const sqlText = `-- Copy and paste this directly into your Supabase SQL Editor to fix the triggers and schemas:

-- 1. Safely add 'ngo' value to app_role enum type if it does not exist
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ngo';

-- 2. Ensure public.profiles table has the status, is_approved, role and ngo_id columns, and any older triggers are dropped
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ngo_id uuid;

-- 3. Create or replace the handle_new_user trigger function with nested error trapping
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We use nested EXCEPTION blocks so a column mismatch or enum failure CANNOT crash registrations.
  BEGIN
    -- Safely insert profile row
    INSERT INTO public.profiles (id, full_name, phone, role, avatar_url, is_approved)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      COALESCE(new.raw_user_meta_data->>'role', 'donor'),
      new.raw_user_meta_data->>'avatar_url',
      CASE WHEN (new.raw_user_meta_data->>'role') = 'donor' THEN true ELSE false END
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role;
  EXCEPTION WHEN OTHERS THEN
    -- Suppress profile insertion errors so user registration can still succeed
  END;
  
  BEGIN
    -- SAFELY insert into user_roles ONLY if role is one of the valid enum values
    IF (COALESCE(new.raw_user_meta_data->>'role', 'donor')) IN ('admin', 'donor', 'volunteer', 'ngo') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (new.id, (new.raw_user_meta_data->>'role')::app_role)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Suppress role insertion errors so user registration can still succeed
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Clean up any duplicated or old triggers on auth.users and bind our pristine trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

    navigator.clipboard.writeText(sqlText);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  useEffect(() => {
    setInVerificationMode(showOtpScreen);
  }, [showOtpScreen, setInVerificationMode]);

  useEffect(() => {
    // Disabled/Bypassed OTP screen for now as requested
    return;
  }, [user, profile, showOtpScreen]);

  useEffect(() => {
    if (form.role !== "volunteer") {
      setNgoList([]);
      setSelectedNgoId("");
      return;
    }
    setFetchingNgos(true);
    
    const loadNgos = async () => {
      try {
        console.group("🏥 NGO Fetching Diagnostic");
        setFetchingNgos(true);
        console.log("Supabase: Starting NGO Fetch...");
        


        const resultMap = new Map<string, string>();

        // Only fetch actual registered NGOs
        // Stage 1: Fetch from profiles first
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .limit(200);
          
        if (profErr) {
          console.error("Diagnostic: Error fetching profiles:", profErr);
        } else {
          console.log(`Diagnostic: Profiles table returned ${profData?.length || 0} rows.`);
          if (profData) {
            profData.forEach(p => {
              const r = String(p.role || "").toLowerCase().trim();
              const nameLower = String(p.full_name || "").toLowerCase();
              if (r === "ngo") {
                resultMap.set(p.id, p.full_name || (p as any).name || "Unnamed NGO");
              }
            });
            console.log(`Diagnostic: Profiles matching 'ngo' role or name keywords: ${resultMap.size}`);
          }
        }

        // Stage 2: Fetch from user_roles
        const { data: roleData, error: roleErr } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("role", "ngo");
          
        if (roleErr) {
          console.error("Diagnostic: Error fetching user_roles:", roleErr);
        } else {
          console.log(`Diagnostic: user_roles table returned ${roleData?.length || 0} NGO roles.`);
          if (roleData) {
            const missingIds = roleData
              .map(r => r.user_id)
              .filter(id => id && !resultMap.has(id));
              
            if (missingIds.length > 0) {
              console.log(`Diagnostic: Found ${missingIds.length} NGOs in user_roles missing from profiles/defaults. Fetching names...`);
              const { data: extraProfs } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", missingIds);
                
              if (extraProfs) {
                extraProfs.forEach(p => {
                  resultMap.set(p.id, p.full_name || (p as any).name || "Unnamed NGO");
                });
              }

              // Self-heal: For any registered NGO whose profile was not created, assign the known name or a fallback
              missingIds.forEach(id => {
                if (!resultMap.has(id)) {
                  resultMap.set(id, `Registered NGO #${id.substring(0, 4)}`);
                }
              });
            }
          }
        }

        // Stage 3: Fetch pending/newly signed up NGOs from registration_requests so they appear immediately
        try {
          const { data: reqData, error: reqErr } = await supabase
            .from("registration_requests")
            .select("user_id, full_name, requested_role")
            .eq("requested_role", "ngo");
          
          if (reqErr) {
            console.error("Diagnostic: Error fetching NGO registration_requests:", reqErr);
          } else if (reqData) {
            console.log(`Diagnostic: registration_requests table returned ${reqData.length} NGO registration requests.`);
            reqData.forEach(r => {
              if (r.user_id && (!resultMap.has(r.user_id) || resultMap.get(r.user_id)?.startsWith("Registered NGO #"))) {
                resultMap.set(r.user_id, r.full_name || "New Registered NGO");
              }
            });
          }
        } catch (reqCatchErr) {
          console.error("Diagnostic: Exception while fetching registration_requests:", reqCatchErr);
        }

        // Add default/fallback NGOs as fallbacks if the final list is still empty (highly unlikely now)
        const finalNgos = Array.from(resultMap.entries()).map(([id, full_name]) => ({
          id,
          full_name
        }));

        console.log("Diagnostic: Final NGO List (Combined):", finalNgos);
        setNgoList(finalNgos);

      } catch (err) {
        console.error("NGO Load Critical Error:", err);
      } finally {
        setFetchingNgos(false);
        console.groupEnd();
      }
    };

    loadNgos();
  }, [form.role]);

  useEffect(() => {
    let interval: any;
    if (showOtpScreen && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      clearInterval(interval);
      toast({
        title: "OTP Expired ⏳",
        description: "Verification time exceeded. Returning to login screen.",
        variant: "destructive"
      });
      signOut();
    }
    return () => clearInterval(interval);
  }, [showOtpScreen, timer, signOut, toast]);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) return;
    setLoading(true);
    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentPhone, otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid OTP");
      await supabase.from("profiles").update({ phone_verified: true }).eq("id", user?.id);
      await refreshProfile();
      toast({ title: "Verified! ✅", description: "Identity confirmed." });
      setInVerificationMode(false);
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message || "Invalid code.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleUpdatePhone = async () => {
    if (!newPhone.trim()) {
      toast({ title: "Error", description: "Phone number cannot be empty.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { phone: newPhone.trim() }
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase.from("profiles").update({
        phone: newPhone.trim()
      }).eq("id", user?.id);
      if (dbError) throw dbError;

      const finalPhone = newPhone.trim();
      setCurrentPhone(finalPhone);
      setOtp("");
      setIsEditingPhone(false);

      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: finalPhone }),
      });
      const data = await response.json();
      if (data.demoCode) {
        toast({ 
          title: "Simulation Mode", 
          description: `Twilio limit reached. Use demo code: ${data.demoCode}`,
          duration: 10000
        });
      } else {
        toast({ title: "OTP Sent 💬", description: `A verification OTP has been sent to ${finalPhone}` });
      }

      setTimer(120);
      await refreshProfile();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to edit phone number.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({ title: "Email required ⚠️", description: "Please enter your email address to receive reset instructions.", variant: "destructive" });
      return;
    }
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Email sent! ✉️", description: "If an account exists with this email, a recovery link has been sent." });
      setShowForgotPassword(false);
    } catch (err: any) {
      toast({ title: "Reset Failed", description: err.message || "Failed to send reset link.", variant: "destructive" });
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        sessionStorage.removeItem("sb_just_signed_up");
        (window as any).__safebite_signing_in = true;
        const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(), password: form.password,
        });
        if (error) {
          (window as any).__safebite_signing_in = false;
          throw error;
        }
        if (user) {
          // Helper promise with timeout to prevent loading deadlock
          const promiseWithTimeout = <T,>(promise: Promise<T>, ms: number, defaultValue: T): Promise<T> => {
            return Promise.race([
              promise,
              new Promise<T>((resolve) => setTimeout(() => resolve(defaultValue), ms))
            ]);
          };

          const TIMEOUT_SENTINEL = "TIMEOUT_EXCEEDED";
          const fetchPromise = Promise.all([
            supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", user.id)
          ]);

          const result = await Promise.race([
            fetchPromise,
            new Promise<any>((resolve) => setTimeout(() => resolve(TIMEOUT_SENTINEL), 7000))
          ]);

          let profile = null;
          let dbRoles: any[] = [];
          let isTimeout = false;

          const userMetaRole = user.user_metadata?.role;
          const userMetaPhone = user.user_metadata?.phone;
          const userMetaName = user.user_metadata?.full_name;

          if (result === TIMEOUT_SENTINEL) {
            isTimeout = true;
            console.log("Auth login: fetch profile timed out, using metadata fallback for fast login flow");
            profile = {
              id: user.id,
              full_name: userMetaName || "User",
              phone: userMetaPhone || "",
              role: userMetaRole || ""
            };
            if (userMetaRole) {
              dbRoles = [{ role: userMetaRole }];
            }
          } else {
            const [profileRes, dbRolesRes] = result;
            profile = profileRes?.data || null;
            dbRoles = dbRolesRes?.data || [];
          }

          // Automatically create/upsert profile row if missing, or update if anything is empty
          if (!isTimeout && !profile) {
            console.log("No profile record found in DB. Auto-creating profile row with:", user.id);
            try {
              const { data: insertedProfile } = await supabase
                .from("profiles")
                .upsert({
                  id: user.id,
                  full_name: userMetaName || "User",
                  phone: userMetaPhone || "",
                  email: user.email || ""
                })
                .select("*")
                .maybeSingle();

              profile = insertedProfile || {
                id: user.id,
                full_name: userMetaName || "User",
                phone: userMetaPhone || "",
                email: user.email || ""
              };

              // Also auto-sync user_roles if empty
              if (userMetaRole && dbRoles.length === 0) {
                await supabase.from("user_roles").upsert({ user_id: user.id, role: userMetaRole });
                dbRoles = [{ role: userMetaRole }];
              }
            } catch (err) {
              console.warn("Auth login: fallback profile self-healing failed:", err);
              profile = {
                id: user.id,
                full_name: userMetaName || "User",
                phone: userMetaPhone || "",
                email: user.email || ""
              };
            }
          } else if (!isTimeout && profile) {
            // Self-heal/Sync missing fields under any category
            const hasPhone = !!profile.phone;
            const hasName = !!profile.full_name;
            const hasEmail = !!profile.email;

            if ((!hasPhone && userMetaPhone) || (!hasName && userMetaName) || (!hasEmail && user.email)) {
              console.log("Auth login: syncing missing fields in existing profile row");
              const updates: any = {};
              if (!hasPhone && userMetaPhone) updates.phone = userMetaPhone;
              if (!hasName && userMetaName) updates.full_name = userMetaName;
              if (!hasEmail && user.email) updates.email = user.email;

              const { data: updatedProfile } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", user.id)
                .select("*")
                .maybeSingle();
              
              if (updatedProfile) {
                profile = updatedProfile;
              }
            }
          }

          console.log("Auth: Login success, profile:", profile, "roles:", dbRoles);

          if (dbRoles.length === 0 && userMetaRole) {
            dbRoles = [{ role: userMetaRole }];
          }
          
          // OTP Verification bypassed for now as requested
          toast({ title: "Welcome back! 🎉", description: "Login successful." });
          
          const userRoles = dbRoles?.map((r: any) => r.role) || [];
          const allRoles = [...userRoles, profile?.role, user.user_metadata?.role].filter(Boolean);
          
          // Instantly write user and profile cache to local storage to trigger instant login redirects in App.tsx
          const finalProfile = { 
            ...profile, 
            user_roles: dbRoles || [] 
          };
          localStorage.setItem("sb_user_cache", JSON.stringify(user));
          localStorage.setItem("sb_profile_cache", JSON.stringify(finalProfile));
          if (dbRoles && dbRoles.length > 0) {
            localStorage.setItem(`sb_role_${user.id}`, dbRoles[0].role);
          } else if (profile?.role) {
            localStorage.setItem(`sb_role_${user.id}`, profile.role);
          }
          
          // Instantly set context state to prevent any state delay and trigger immediate navigation
          setAuthData(session, user, finalProfile);
          (window as any).__safebite_signing_in = false;
          
          let target = "/select-role";
          if (allRoles.includes("admin")) target = "/admin";
          else if (allRoles.includes("donor")) target = "/donor";
          else if (allRoles.includes("ngo")) target = "/ngo";
          else if (allRoles.includes("volunteer")) target = "/volunteer";

          navigate(target, { replace: true });
        }
      } else {
        const nameClean = form.name.trim();
        const phoneClean = form.phone.trim();
        const emailClean = form.email.trim();
        const passwordClean = form.password;
        const normalizedRole = form.role.trim() as "" | "donor" | "volunteer" | "ngo";
        
        // Strict Signup requirements: WhatsApp no, email, role, and name are mandatory
        if (!nameClean || nameClean.length < 2) {
          toast({ title: "Signup Error ⚠️", description: "Full name is required to signup.", variant: "destructive" });
          setLoading(false);
          return;
        }

        if (!phoneClean || phoneClean.length < 10) {
          toast({ title: "Signup Error ⚠️", description: "A valid contact number (min. 10 digits) is required to signup.", variant: "destructive" });
          setLoading(false);
          return;
        }

        if (!emailClean) {
          toast({ title: "Signup Error ⚠️", description: "Email address is required to signup.", variant: "destructive" });
          setLoading(false);
          return;
        }

        if (!passwordClean) {
          toast({ title: "Signup Error ⚠️", description: "Password is required to signup.", variant: "destructive" });
          setLoading(false);
          return;
        }

        if (!normalizedRole) {
          toast({ title: "Signup Error ⚠️", description: "Please select a role to register.", variant: "destructive" });
          setLoading(false);
          return;
        }

        if (normalizedRole === "volunteer" && !selectedNgoId) {
          toast({
            title: "NGO Required ⚠️",
            description: "Please select an NGO to send your join request.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        const addressClean = form.address ? form.address.trim() : null;
        if (normalizedRole === "ngo" && !addressClean) {
          toast({ title: "Address Required ⚠️", description: "Please provide your NGO address.", variant: "destructive" });
          setLoading(false);
          return;
        }

        (window as any).__safebite_signing_up = true;
        sessionStorage.setItem("sb_just_signed_up", "true");
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: emailClean, password: passwordClean,
          options: { data: { full_name: nameClean, phone: phoneClean, role: normalizedRole, address: addressClean } },
        });
        if (error) {
          sessionStorage.removeItem("sb_just_signed_up");
          throw error;
        }

          if (signUpData?.user) {
            console.log("Auth signup: Auto-creating profile row and role record", signUpData.user.id);
            
            // 1. Create Profile and Initial Role (Non-approved roles are set as 'user' initially or tracked in requests)
            const isImmediate = normalizedRole === "donor";
            
            await Promise.all([
              supabase
                .from("profiles")
                .upsert({
                  id: signUpData.user.id,
                  full_name: nameClean,
                  phone: phoneClean,
                  address: addressClean,
                  role: isImmediate ? normalizedRole : "user" // Set to user if needs approval
                }),
              isImmediate && supabase
                .from("user_roles")
                .upsert({
                  user_id: signUpData.user.id,
                  role: normalizedRole
                })
            ].filter(Boolean) as Promise<any>[]).catch((err) => console.warn("Failed to complete profile/role setup:", err));

          // 2. Handle NGO/Volunteer Registration Requests for Admin/NGO Approval
          if (normalizedRole === "ngo" || normalizedRole === "volunteer") {
            // Insert into registration_requests for Admin Dashboard "Registrations" tab
            try {
              await supabase
                .from("registration_requests")
                .insert({
                  id: signUpData.user.id,
                  email: emailClean,
                  full_name: nameClean,
                  phone: phoneClean,
                  address: addressClean,
                  requested_role: normalizedRole,
                  status: "pending",
                  created_at: new Date().toISOString(),
                  cnic: "N/A"
                });
            } catch (err) {
              console.warn("Registration request failed:", err);
            }
          }

          // 3. For Volunteers, also send join request to the specific NGO
          if (normalizedRole === "volunteer" && selectedNgoId && signUpData?.user) {
            try {
              await supabase
                .from("rider_join_requests")
                .insert({
                  rider_id: signUpData.user.id,
                  ngo_id: selectedNgoId,
                  status: "pending"
                });
            } catch (err) {
              console.warn("Join request failed:", err);
            }

            try {
              await supabase
                .from("notifications")
                .insert({
                  user_id: selectedNgoId,
                  title: "New Rider Request! 🚴",
                  message: `${nameClean} wants to join your NGO team as a rider.`,
                  type: "info"
                });
            } catch {
              // Ignore
            }
          }
        }

        await supabase.auth.signOut();
        setIsLogin(true);
        setForm({
          name: "", email: "", phone: "", password: "",
          role: "", address: ""
        });
        toast({
          title: normalizedRole === "volunteer" ? "Request Sent! ✅" : "Account created! 🎉",
          description: "Your account has been created. Please login.",
        });
      }
    } catch (err: any) {
      if (!isLogin) {
        await supabase.auth.signOut().catch(() => {});
      }
      (window as any).__safebite_signing_in = false;
      (window as any).__safebite_signing_up = false;
      if (err.message?.includes("Database error saving new user")) {
        setShowDbTriggerFix(true);
      }

      let errorMsg = err.message || "An unknown error occurred.";
      if (errorMsg === "Failed to fetch") {
        errorMsg = "Network Error: Cannot connect to database. Your Supabase project might be paused due to inactivity (please unpause it at supabase.com), or an ad-blocker could be blocking the connection.";
      }

      toast({ title: isLogin ? "Login Error" : "Signup Error", description: errorMsg, variant: "destructive" });
    } finally {
      (window as any).__safebite_signing_in = false;
      (window as any).__safebite_signing_up = false;
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
       <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
         <div className="flex flex-col items-center mb-8">
           <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 text-emerald-600">
             <Utensils size={32} />
           </div>
           <h1 className="text-3xl font-extrabold text-gray-900">SafeBite</h1>
           <p className="text-gray-500 mt-2">
             {showForgotPassword 
               ? "Reset your account password" 
               : isLogin 
                 ? "Welcome back to your account" 
                 : "Join the SafeBite community"}
           </p>
         </div>
         
         {showOtpScreen ? (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
             <h2 className="text-xl font-bold text-gray-900 text-center">Verify WhatsApp ({timer}s)</h2>
             <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="w-full px-4 py-4 rounded-xl border border-gray-200 text-center text-2xl font-bold tracking-widest" />
             <button onClick={handleVerifyOtp} className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition">
               {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : "Verify Identity"}
              </button>
              <button type="button" onClick={() => signOut()} className="text-gray-500 text-sm hover:text-emerald-700 text-center mt-2 font-medium transition duration-200 w-full mb-1">
                Wrong number or need to log out?
              </button>
              <button style={{ display: 'none' }}>
             </button>
          </div>
       ) : showForgotPassword ? (
          <form onSubmit={handleSendResetEmail} className="flex flex-col gap-4 animate-in fade-in duration-300">
             <p className="text-sm text-gray-500 text-center mb-2">
               Enter your email address and we will send you a secure password reset link.
             </p>
             <input 
               type="email" 
               placeholder="Email Address" 
               value={resetEmail} 
               onChange={(e) => setResetEmail(e.target.value)} 
               className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
               required 
             />
             <button type="submit" className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition mt-2 flex items-center justify-center gap-2" disabled={sendingReset}>
               {sendingReset ? <Loader2 size={20} className="animate-spin" /> : "Send Reset Link"}
             </button>
             <button type="button" onClick={() => setShowForgotPassword(false)} className="text-gray-500 text-sm hover:text-emerald-700 text-center mt-2">
               Back to Log In
             </button>
          </form>
       ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <>
               <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" required minLength={2}/>
               <input type="tel" placeholder="WhatsApp Number (e.g. +92...)" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" required minLength={10}/>
              </>
            )}
             <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" required />
             <div className="relative w-full">
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
             </div>

             {isLogin && (
               <div className="flex justify-end -mt-2">
                 <button 
                   type="button" 
                   onClick={() => {
                     setResetEmail(form.email);
                     setShowForgotPassword(true);
                   }}
                   className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
                 >
                   Forgot Password?
                 </button>
               </div>
             )}
             
             {!isLogin && (
                <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value as any})} className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" required>
                    <option value="">Select Role</option>
                    <option value="donor">Donor</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="ngo">NGO</option>
                </select>
             )}

             {!isLogin && form.role === "ngo" && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MapPin size={20} className="text-gray-400" />
                  </div>
                  <input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="NGO Address (Required)" className="w-full pl-11 pr-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white/50" required />
                </div>
             )}

             {!isLogin && form.role === "volunteer" && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-gray-600">
                    Select your NGO to send join request:
                  </p>
                  <input
                    type="text"
                    placeholder="Search NGO by name..."
                    value={ngoSearch}
                    onChange={(e) => setNgoSearch(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                  {fetchingNgos ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
                      <Loader2 size={14} className="animate-spin" /> Loading NGOs...
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white shadow-inner">
                      {ngoList
                        .filter(n => n.full_name?.toLowerCase().includes(ngoSearch.toLowerCase()))
                        .map(ngo => {
                          const isSelected = selectedNgoId === ngo.id;
                          return (
                            <div
                              key={ngo.id}
                              onClick={() => setSelectedNgoId(ngo.id)}
                              className={`flex items-center justify-between px-4 py-2.5 transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-50/70"
                                  : "hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                                <span className={`text-sm ${isSelected ? "text-emerald-950 font-bold" : "text-gray-700 font-medium"}`}>
                                  {ngo.full_name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNgoId(ngo.id);
                                }}
                                className={`text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg border transition-all ${
                                  isSelected
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-950"
                                }`}
                              >
                                {isSelected ? "✓ SELECTED" : "Send Invite"}
                              </button>
                            </div>
                          );
                        })}
                      {ngoList.filter(n =>
                        n.full_name?.toLowerCase().includes(ngoSearch.toLowerCase())
                      ).length === 0 && !fetchingNgos && (
                        <p className="text-xs text-gray-400 text-center py-3">No NGOs found</p>
                      )}
                    </div>
                  )}
                  {!selectedNgoId && (
                    <p className="text-xs text-amber-600 font-medium px-1">
                      ⚠️ Please select an NGO to send your join request
                    </p>
                  )}
                </div>
              )}

             <button type="submit" className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition mt-2">
                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : (isLogin ? "Log In" : "Sign Up")}
             </button>
             
             <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-gray-500 text-sm hover:text-emerald-700 text-center mt-2">
                {isLogin ? (
                  <>
                    Need an account? <span className="font-bold text-emerald-600">Sign Up</span>
                  </>
                ) : (
                  <>
                    Have an account? <span className="font-bold text-emerald-600">Log In</span>
                  </>
                )}
             </button>
          </form>
       )}
       </div>
    </div>

    {showDbTriggerFix && (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl border border-slate-100 p-6 sm:p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-slate-900 text-lg font-black tracking-tight font-sans">Database Trigger Fix Needed 🛠️</h3>
              <p className="text-[11px] text-gray-500 font-semibold uppercase mt-0.5">Your Supabase "handle_new_user" trigger function is crashing</p>
            </div>
          </div>

          <div className="space-y-3 font-semibold text-xs leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
            <p>
              <strong>Why am I seeing this?</strong> Supabase's automatic registration trigger function <code className="bg-slate-200 px-1.5 py-0.5 rounded text-amber-700 font-bold">handle_new_user</code> fails because the <code className="bg-slate-200 px-1.5 py-0.5 rounded text-indigo-700 font-bold">profiles</code> column layout changed or the <code className="bg-slate-200 px-1.5 py-0.5 rounded text-emerald-700 font-bold">user_roles</code> enum casts do not align correctly (e.g. attempting to insert custom roles directly).
            </p>
            <p>
              <strong>How to fix this in 10 seconds:</strong> You must copy the safe, robust SQL script below and run it inside your <strong>Supabase Dashboard SQL Editor</strong>. This will drop the faulty columns/triggers and restore a healthy, crash-free registration flow!
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1 font-mono">
                <Terminal size={12} /> SQL Script to Run
              </span>
              <button
                onClick={copySqlToClipboard}
                className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-xl transition ${
                  sqlCopied
                    ? "bg-emerald-50 text-emerald-700 font-bold shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {sqlCopied ? (
                  <>
                    <Check size={14} className="text-emerald-500 shrink-0" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="shrink-0" /> Copy Code
                  </>
                )}
              </button>
            </div>

            <div className="relative font-mono text-[10px] bg-slate-900 text-slate-300 p-4 rounded-2xl overflow-x-auto max-h-48 border border-slate-800 shadow-inner text-left">
              <pre className="whitespace-pre">
{`-- Copy and paste this directly into your Supabase SQL Editor to fix the triggers and schemas:

-- 1. Safely add 'ngo' value to app_role enum type if it does not exist
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ngo';

-- 2. Ensure public.profiles table has the status, is_approved, role and ngo_id columns, and any older triggers are dropped
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ngo_id uuid;

-- 3. Create or replace the handle_new_user trigger function with nested error trapping
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We use nested EXCEPTION blocks so a column mismatch or enum failure CANNOT crash registrations.
  BEGIN
    -- Safely insert profile row
    INSERT INTO public.profiles (id, full_name, phone, role, avatar_url, is_approved)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      COALESCE(new.raw_user_meta_data->>'role', 'donor'),
      new.raw_user_meta_data->>'avatar_url',
      CASE WHEN (new.raw_user_meta_data->>'role') = 'donor' THEN true ELSE false END
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role;
  EXCEPTION WHEN OTHERS THEN
    -- Suppress profile insertion errors so user registration can still succeed
  END;
  
  BEGIN
    -- SAFELY insert into user_roles ONLY if role is one of the valid enum values
    IF (COALESCE(new.raw_user_meta_data->>'role', 'donor')) IN ('admin', 'donor', 'volunteer', 'ngo') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (new.id, (new.raw_user_meta_data->>'role')::app_role)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Suppress role insertion errors so user registration can still succeed
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Clean up any duplicated or old triggers on auth.users and bind our pristine trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`}
               </pre>
             </div>
           </div>

           <div className="flex border-t border-gray-100 pt-4 gap-3 mt-1">
             <a
               href="https://supabase.com/dashboard"
               target="_blank"
               rel="noreferrer"
               className="flex-1 py-3 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/10 animate-pulse"
             >
               <ExternalLink size={14} /> Open Supabase
             </a>
             <button
               onClick={() => setShowDbTriggerFix(false)}
               className="flex-1 py-3 text-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-750 font-bold text-xs transition"
             >
               Dismiss Code
             </button>
           </div>
         </div>
       </div>
     )}
    </>
  );
};
export default Auth;
