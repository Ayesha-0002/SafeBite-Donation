import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Utensils, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const rolePathMap: Record<string, string> = {
  donor: "/donor",
  ngo: "/ngo",
  volunteer: "/volunteer",
  admin: "/admin",
};

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
    // Sync local showOtpScreen with global inVerificationMode
    setInVerificationMode(showOtpScreen);
  }, [showOtpScreen, setInVerificationMode]);

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
      window.location.reload(); 
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
          if (profile && !profile.phone_verified && profile.phone) {
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
          window.location.reload(); 
        }
      } else {
        const normalizedRole = form.role.trim() as "" | "donor" | "volunteer" | "ngo";
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { data: { full_name: form.name.trim(), phone: form.phone.trim() || null, role: normalizedRole } },
        });
        if (error) throw error;
        setIsLogin(true);
        toast({ title: "Account created! ✅", description: "Please log in." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col p-6">
       <h1 className="text-2xl font-bold mt-12 mb-6 text-center">SafeBite</h1>
       {showOtpScreen ? (
          <div className="flex flex-col gap-4">
             <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="w-full px-4 py-4 rounded-xl border text-center text-2xl font-bold" />
             <button onClick={handleVerifyOtp} className="w-full py-3.5 rounded-xl gradient-primary text-white">Verify</button>
          </div>
       ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border" />}
             <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
             <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
             <button type="submit" className="w-full py-3.5 rounded-xl gradient-primary text-white">{isLogin ? "Log In" : "Sign Up"}</button>
             <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary text-sm">
                {isLogin ? "Need an account? Sign Up" : "Have an account? Log In"}
             </button>
          </form>
       )}
    </div>
  );
};
export default Auth;
