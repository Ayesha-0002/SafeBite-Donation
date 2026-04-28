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
  const { user, profile, refreshProfile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "" as "" | "donor" | "volunteer" | "ngo",
  });

  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");
  const [tempRoles, setTempRoles] = useState<string[]>([]);
  const [timer, setTimer] = useState(120);

  useEffect(() => {
    let interval: any;
    if (otpStep && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpStep, timer]);

  const triggerOtp = async (phone: string, roles: string[]) => {
    setCurrentPhone(phone);
    setTempRoles(roles);
    setTimer(120);
    console.log(`[Auth] Triggering WhatsApp PIN for ${phone}`);
    try {
      // Mock WhatsApp PIN sending for now
      const demoPin = Math.floor(1000 + Math.random() * 9000).toString();
      setOtpStep(true);
      toast({ 
        title: "WhatsApp Security Check", 
        description: `A 4-digit PIN has been sent to your WhatsApp. (Demo PIN: ${demoPin})`,
      });
      console.log("DEMO PIN:", demoPin);
      // We store it in a way we can verify for demo
      (window as any)._demo_pin = demoPin;
    } catch (err: any) {
      console.error("[Auth] triggerOtp error:", err);
      toast({ title: "WhatsApp Error", description: "Could not send PIN. Please try again.", variant: "destructive" });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) return;
    if (timer === 0) {
      toast({ title: "PIN Expired", description: "PIN is no longer valid. Please resend.", variant: "destructive" });
      return;
    }
    setLoading(true);
    
    // Simulate verification
    setTimeout(async () => {
      const demoPin = (window as any)._demo_pin;
      if (otp === demoPin || otp === "1234") {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("profiles").update({ phone_verified: true }).eq("id", user.id);
            // Also store verified status in local storage for instant feedback
            localStorage.setItem(`verified_${user.id}`, "true");
          }
          toast({ title: "Verified! ✅", description: "WhatsApp identity confirmed." });
          if (tempRoles.length === 1) {
            navigate(rolePathMap[tempRoles[0]] || "/select-role", { replace: true });
          } else {
            navigate("/select-role");
          }
        } catch (e) {
          console.error("Profile update error", e);
        }
      } else {
        toast({ title: "Invalid PIN", description: "The code you entered is incorrect.", variant: "destructive" });
      }
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    if (user && !otpStep) {
      // Logic for automatic redirection if already logged in is handled by App.tsx's AuthGuard
    }
  }, [user, otpStep, navigate]);


  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!form.email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast({
        title: "Reset Link Sent! 📧",
        description: "Check your email for the password reset link.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send reset link.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        try {
          const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          });

          if (error) {
            console.error("Supabase login error:", error);
            throw error;
          }

            if (user) {
              // Parallel data fetching for roles and profile
              const [rolesRes, profileRes] = await Promise.all([
                supabase.from("user_roles").select("role").eq("user_id", user.id),
                supabase.from("profiles").select("phone, role").eq("id", user.id).maybeSingle()
              ]);

              const userRoles = (rolesRes.data || []).map((r) => r.role);
              const profile = profileRes.data;

              // Cache immediately
              const metadataRole = user.user_metadata?.role;
              const finalRoles = userRoles.length > 0 ? userRoles : (metadataRole ? [metadataRole] : []);
              const firstRole = finalRoles[0] || profile?.role;
              if (firstRole) localStorage.setItem(`sb_role_${user.id}`, firstRole);

              if (finalRoles.includes("admin")) {
                toast({ title: "Welcome back, Admin! 🛡️", description: "Login successful." });
                navigate("/admin", { replace: true });
                return;
              }
              
              if (finalRoles.includes("donor") || finalRoles.includes("ngo") || finalRoles.includes("volunteer")) {
                if (profile && !profile.role && finalRoles.length > 0) {
                   supabase.from("profiles").update({ role: finalRoles[0] }).eq("id", user.id).then(() => {});
                }

                if (profile?.phone) {
                  triggerOtp(profile.phone, finalRoles);
                  setLoading(false);
                  return;
                }
              }

              toast({ title: "Welcome back! 🎉", description: "Login successful." });
              navigate(rolePathMap[firstRole] || "/select-role", { replace: true });
              return;
            }
        } catch (loginError) {
          console.error("Supabase login request failed:", loginError);
          throw loginError;
        }
      } else {
        const normalizedRole = form.role.trim() as "" | "donor" | "volunteer" | "ngo";
        const signupMetadata = {
          full_name: form.name.trim(),
          phone: form.phone.trim() || null,
          role: normalizedRole,
        };

        if (!signupMetadata.full_name) {
          throw new Error("Full name is required.");
        }

        if (!signupMetadata.role || !["donor", "ngo", "volunteer"].includes(signupMetadata.role)) {
          throw new Error("Please select a valid role before signing up.");
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email: form.email.trim(),
            password: form.password,
            options: {
              data: signupMetadata,
              emailRedirectTo: window.location.origin,
            },
          });

          if (error) {
            console.error("Supabase signup error:", {
              message: error.message,
              status: error.status,
              metadataKeys: Object.keys(signupMetadata),
            });
            throw error;
          }

          if (!data.user) {
            throw new Error("Signup could not be completed.");
          }

          // Force update the profiles table to ensure phone and name are saved
          // (This works even if the trigger hasn't finished or isn't there, assuming RLS allows update or the profile already exists)
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              full_name: signupMetadata.full_name,
              phone: signupMetadata.phone,
              role: signupMetadata.role,
              updated_at: new Date().toISOString(),
            });

          if (profileError) {
             console.warn("Profile table sync warn:", profileError.message);
             // We don't throw here as the account was created, but log it
          }

          // Case 1: Session is returned (Confirm Email is OFF in Supabase)
          if (data.session) {
            if (signupMetadata.phone) {
               triggerOtp(signupMetadata.phone, [normalizedRole]);
               setLoading(false);
               return;
            }
            toast({
              title: "Account created! ✅",
              description: "Welcome to SafeBite! You are now logged in.",
            });
            const targetPath = rolePathMap[normalizedRole] || "/select-role";
            navigate(targetPath, { replace: true });
            return;
          }

          // Case 2: Session is NOT returned (Confirm Email is ON - default)
          toast({
            title: "Account created! ✅",
            description: "Please check your email to verify your account and log in.",
          });
          setIsLogin(true); // Switch to login tab so they can login after verifying

        } catch (signupError) {
          console.error("Supabase signup request failed:", signupError);
          throw signupError;
        }
      }
    } catch (err: any) {
      const description = err?.message === "Database error saving new user"
        ? "Signup metadata is being sent correctly, but your database trigger handle_new_user is failing. Update the trigger to safely insert full_name, phone, and role only when the role is valid."
        : err?.message || "Something went wrong.";

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-primary pt-12 pb-16 px-6 text-center rounded-b-[2rem]">
        <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-4">
          <Utensils size={32} className="text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-primary-foreground">SafeBite</h1>
        <p className="text-primary-foreground/70 text-sm font-body mt-1">
          Smart Food Redistribution Platform
        </p>
      </div>

      {/* Toggle */}
      <div className="px-6 -mt-6 relative z-10">
        <div className="bg-card rounded-2xl border border-border p-1.5 flex gap-1 shadow-sm">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isLogin
                ? "gradient-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              !isLogin
                ? "gradient-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 pt-6 pb-8 flex-1">
        {otpStep ? (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-foreground mb-1">Verify WhatsApp</h2>
            <p className="text-muted-foreground text-sm font-body mb-2">
              Enter the 4-digit code sent to your WhatsApp number.
            </p>
            <div className="flex items-center gap-2 mb-6">
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${timer === 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary animate-pulse'}`}>
                {timer === 0 ? "Expired" : `PIN Valid for: ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="0000"
                className="w-full px-4 py-4 rounded-xl border border-input bg-card text-foreground text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleVerifyOtp}
                disabled={timer === 0 || loading || otp.length < 4}
                className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground gradient-primary transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Verify WhatsApp"}
              </button>
              
              {timer === 0 && (
                <button
                  type="button"
                  onClick={() => triggerOtp(currentPhone, tempRoles)}
                  className="w-full py-3 rounded-xl font-semibold border-2 border-primary text-primary hover:bg-primary/5 transition-all"
                >
                  Resend New Code
                </button>
              )}

              <button
                onClick={() => setOtpStep(false)}
                className="text-center text-sm text-muted-foreground font-body mt-2"
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-foreground mb-1">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-muted-foreground text-sm font-body mb-6">
              {isLogin
                ? "Sign in to continue helping redistribute food."
                : "Join SafeBite and start making a difference."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Phone No.
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm"
                  />
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Select Role
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={form.role}
                      onChange={(e) => handleChange("role", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm appearance-none pr-10"
                    >
                      <option value="" disabled>Choose your role</option>
                       <option value="donor">🤲 Donor — Donate food to the needy</option>
                       <option value="ngo">🏛️ NGO / Organization — Receive & manage food</option>
                       <option value="volunteer">🚚 Volunteer — Pickup & deliver food</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder={isLogin ? "Enter your password" : "Create a password (min 6 chars)"}
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isLogin && (
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {resetLoading ? "Sending..." : "Forgot Password?"}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground gradient-primary transition-all hover:opacity-90 active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {isLogin ? "Log In" : "Sign Up"}
              </button>

              <p className="text-center text-sm text-muted-foreground font-body mt-2">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary font-medium"
                >
                  {isLogin ? "Sign Up" : "Log In"}
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
