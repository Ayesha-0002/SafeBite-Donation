import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Utensils, Loader2 } from "lucide-react";
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
  });

  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");
  const [timer, setTimer] = useState(120);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    setInVerificationMode(showOtpScreen);
  }, [showOtpScreen, setInVerificationMode]);

  useEffect(() => {
    // Disabled/Bypassed OTP screen for now as requested
    return;
  }, [user, profile, showOtpScreen]);

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

          // Fetch profile details with 600ms timeout to bypass any DB latency
          const [profileRes, dbRolesRes] = await promiseWithTimeout(
            Promise.all([
              supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
              supabase.from("user_roles").select("role").eq("user_id", user.id)
            ]),
            600,
            [{ data: null, error: null }, { data: [], error: null }] as any
          );
          
          const userMetaRole = user.user_metadata?.role;
          const userMetaPhone = user.user_metadata?.phone;
          const userMetaName = user.user_metadata?.full_name;

          let profile = profileRes.data;
          let dbRoles = dbRolesRes.data || [];
          console.log("Auth: Login success, profile:", profile, "roles:", dbRoles);

          // Fast fallback to prevent blank/unauthenticated state when query is slow
          if (!profile) {
            profile = {
              id: user.id,
              full_name: userMetaName || "User",
              phone: userMetaPhone || "",
              role: userMetaRole || ""
            };
          }
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
        const normalizedRole = form.role.trim() as "" | "donor" | "volunteer" | "ngo";
        
        // --- ADD THIS CHECK ---
        if (!normalizedRole) {
          toast({ title: "Role Error", description: "Please select a role.", variant: "destructive" });
          setLoading(false);
          return;
        }
        // ----------------------

        if (!form.phone.trim()) {
          toast({ title: "Phone number required ⚠️", description: "You must enter a WhatsApp phone number to register an account.", variant: "destructive" });
          setLoading(false);
          return;
        }
        sessionStorage.setItem("sb_just_signed_up", "true");
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { data: { full_name: form.name.trim(), phone: form.phone.trim(), role: normalizedRole } },
        });
        if (error) {
          sessionStorage.removeItem("sb_just_signed_up");
          throw error;
        }
        await supabase.auth.signOut();
        setIsLogin(true);
        setForm({
          name: "", email: "", phone: "", password: "",
          role: ""
        });
        toast({ title: "Account created! ✅", description: "Account created successfully. Please login to continue." });
      }
    } catch (err: any) {
      (window as any).__safebite_signing_in = false;
      toast({ title: "Login Error", description: err.message, variant: "destructive" });
    } finally {
      (window as any).__safebite_signing_in = false;
      setLoading(false);
    }
  };

  return (
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
               <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" required />
               <input type="tel" placeholder="WhatsApp Number (e.g. +92...)" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" required />
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

             <button type="submit" className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition mt-2">
                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : (isLogin ? "Log In" : "Sign Up")}
             </button>
             
             <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-gray-500 text-sm hover:text-emerald-700 text-center mt-2">
                {isLogin ? "Need an account? Sign Up" : "Have an account? Log In"}
             </button>
          </form>
       )}
       </div>
    </div>
  );
};
export default Auth;
