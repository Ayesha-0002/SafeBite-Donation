import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Utensils, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          });

          if (error) {
            console.error("Supabase login error:", error);
            throw error;
          }
        } catch (loginError) {
          console.error("Supabase login request failed:", loginError);
          throw loginError;
        }

        toast({ title: "Welcome back! 🎉", description: "Login successful." });
        navigate("/select-role");
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
        } catch (signupError) {
          console.error("Supabase signup request failed:", signupError);
          throw signupError;
        }

        toast({
          title: "Account created! ✅",
          description: "Please check your email to verify your account.",
        });
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
                   <option value="ngo">🏛️ NGO / Madrasa — Receive & manage food</option>
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
      </div>
    </div>
  );
};

export default Auth;
