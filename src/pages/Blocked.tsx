import { ShieldAlert, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const Blocked = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 animate-pulse">
        <ShieldAlert size={48} className="text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Account Restricted</h1>
      <p className="text-muted-foreground font-body mb-8">
        Your access to SafeBite has been restricted by the administrator due to a violation of our community guidelines.
      </p>
      
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 mb-8 w-full">
        <p className="text-xs text-destructive font-medium text-left">
          Note: If you believe this is a mistake, please contact our support team at support@safebite.org with your registered email address.
        </p>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground gradient-primary transition-all flex items-center justify-center gap-2"
      >
        <LogOut size={18} /> Return to Login
      </button>
    </div>
  );
};

export default Blocked;
