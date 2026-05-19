import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Utensils, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, refreshProfile, setInVerificationMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    role: "" as "" | "donor" | "volunteer" | "ngo",
  });

  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");
  const [timer, setTimer] = useState(120);

  useEffect(() => {
    setInVerificationMode(showOtpScreen);
  }, [showOtpScreen, setInVerificationMode]);

  useEffect(() => {
    if (user && profile && !profile.phone_verified && profile.phone && !showOtpScreen) {
      setCurrentPhone(profile.phone);
      setShowOtpScreen(true);
      fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: profile.phone }),
      }).catch(console.error);
    }
  }, [user, profile, showOtpScreen]);

  useEffect(() => {
    let interval: any;
    if (showOtpScreen && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showOtpScreen, timer]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(), password: form.password,
        });
        if (error) throw error;
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
          console.log("Auth: Login success, profile:", profile);
          if (profile && !profile.phone_verified && profile.phone) {
             console.log("Auth: Triggering OTP verification for:", profile.phone);
             setCurrentPhone(profile.phone);
             await fetch("/api/send-otp", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ phone: profile.phone }),
             });
             setShowOtpScreen(true);
             setTimer(120);
             setLoading(false);
             return;
          }
          toast({ title: "Welcome back! 🎉", description: "Login successful." });
        }
      } else {
        const normalizedRole = form.role.trim() as "" | "donor" | "volunteer" | "ngo";
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { data: { full_name: form.name.trim(), phone: form.phone.trim() || null, role: normalizedRole } },
        });
        if (error) throw error;
        setIsLogin(true);
        toast({ title: "Account created! ✅", description: "Please log in." });
      }
    } catch (err: any) {
      toast({ title: "Login Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
       <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
         <div className="flex flex-col items-center mb-8">
           <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 text-emerald-600">
             <Utensils size={32} />
           </div>
           <h1 className="text-3xl font-extrabold text-gray-900">SafeBite</h1>
           <p className="text-gray-500 mt-2">{isLogin ? "Welcome back to your account" : "Join the SafeBite community"}</p>
         </div>
         
         {showOtpScreen ? (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
             <h2 className="text-xl font-bold text-gray-900 text-center">Verify WhatsApp ({timer}s)</h2>
             <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="w-full px-4 py-4 rounded-xl border border-gray-200 text-center text-2xl font-bold tracking-widest" />
             <button onClick={handleVerifyOtp} className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition">
               {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : "Verify Identity"}
             </button>
          </div>
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
