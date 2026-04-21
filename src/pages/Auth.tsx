import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Utensils, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const rolePathMap: Record<string, string> = {
  donor: "/donor",
  ngo: "/ngo",
  volunteer: "/volunteer",
  admin: "/admin",
};

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [tempRoles, setTempRoles] = useState<string[]>([]);

  const handleVerifyOtp = () => {
    if (otp === "123456") {
      toast({ title: "OTP Verified! ✅", description: "Security check passed." });
      if (tempRoles.length === 1) {
        navigate(rolePathMap[tempRoles[0]] || "/select-role", { replace: true });
      } else {
        navigate("/select-role");
      }
    } else {
      toast({ title: "Invalid OTP", description: "Please enter 123456 to continue.", variant: "destructive" });
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        const userRoles = (roles || []).map(r => r.role);
        const metadataRole = user.user_metadata?.role;
        const finalRoles = userRoles.length > 0 ? userRoles : (metadataRole ? [metadataRole] : []);

        if (finalRoles.includes("admin")) {
          navigate("/admin", { replace: true });
          return;
        }

        if (finalRoles.length === 1) {
          navigate(rolePathMap[finalRoles[0]] || "/select-role", { replace: true });
        } else if (finalRoles.length > 1) {
          navigate("/select-role", { replace: true });
        }
      }
    };
    checkUser();
  }, [navigate]);

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
            // Role detection logic
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id);

            const userRoles = (roles || []).map((r) => r.role);

            // Fetch metadata fallback
            const metadataRole = user.user_metadata?.role;
            const finalRoles = userRoles.length > 0 ? userRoles : (metadataRole ? [metadataRole] : []);

            if (finalRoles.includes("admin")) {
              toast({ title: "Welcome back, Admin! 🛡️", description: "Login successful." });
              navigate("/admin", { replace: true });
              return;
            }

            // Check if NGO or Volunteer - if so, trigger OTP (simulated for demo as per user request)
            if (finalRoles.includes("ngo") || finalRoles.includes("volunteer")) {
              setTempRoles(finalRoles);
              setOtpStep(true);
              toast({ 
                title: "Security Check", 
                description: "An OTP has been sent to your registered number. (Demo Code: 123456)",
              });
              setLoading(false);
              return;
            }

            toast({ title: "Welcome back! 🎉", description: "Login successful." });
            if (finalRoles.length === 1) {
              const targetPath = rolePathMap[finalRoles[0]] || "/select-role";
              navigate(targetPath, { replace: true });
            } else {
              navigate("/select-role");
            }
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
              updated_at: new Error().stack?.includes("Auth") ? new Date().toISOString() : undefined, // dummy field to force change if needed
            });

          if (profileError) {
             console.warn("Profile table sync warn:", profileError.message);
             // We don't throw here as the account was created, but log it
          }

          // Case 1: Session is returned (Confirm Email is OFF in Supabase)
          if (data.session) {
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
            <h2 className="text-xl font-bold text-foreground mb-1">Verify OTP</h2>
            <p className="text-muted-foreground text-sm font-body mb-6">
              Enter the 6-digit code sent to your mobile number.
            </p>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000 000"
                className="w-full px-4 py-4 rounded-xl border border-input bg-card text-foreground text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleVerifyOtp}
                className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground gradient-primary transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Verify & Continue
              </button>
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
