import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, Utensils, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast({ title: "Error", description: "Password cannot be empty.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: "Success! 🎉", description: "Your password has been reset successfully. Please log in with your new password." });
      // Clean up session / sign out just to ensure clear login state
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast({ title: "Reset Failed", description: err.message || "Could not reset password. Your link may have expired.", variant: "destructive" });
    } finally {
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
          <p className="text-gray-500 mt-2">Reset your account password</p>
        </div>

        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition mt-2 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : "Update Password"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-gray-500 text-sm hover:text-emerald-700 text-center mt-2"
          >
            Back to Log In
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
