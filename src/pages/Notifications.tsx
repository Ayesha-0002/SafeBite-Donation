import { ArrowLeft, Bell, MapPin, CheckCircle, AlertTriangle, Sparkles, Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<string, any> = {
  "new-food": { icon: MapPin, color: "text-primary", bg: "bg-primary/10" },
  "pickup-assigned": { icon: Bell, color: "text-secondary", bg: "bg-secondary/10" },
  "delivered": { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  "info": { icon: Bell, color: "text-blue-500", bg: "bg-blue-500/10" },
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("cache_notifications");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(notifications.length === 0);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Notifications fetch error:", error);
      } else {
        setNotifications(data || []);
        localStorage.setItem("cache_notifications", JSON.stringify(data || []));
      }
      setLoading(false);

      // Mark all as read when opening notifications page
      if (data && data.length > 0) {
        const unreadIds = data.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) {
          await supabase
            .from("notifications")
            .update({ read: true })
            .in("id", unreadIds);
        }
      }
    };

    fetchNotifications();
  }, []);

  const getIconConfig = (type: string) => {
    return iconMap[type] || { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" };
  };

  return (
    <div className="mobile-container min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="ml-auto text-xs font-medium text-primary">
            {notifications.filter(n => !n.read).length} new
          </span>
        )}
      </div>

      <div className="page-padding flex flex-col gap-2 mt-4 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell size={48} className="text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground font-body">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const config = getIconConfig(n.type);
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                onClick={() => n.related_donation_id && navigate(`/donor`)} // Simple redirect for now
                className={`glass-card p-4 flex items-start gap-3 transition-all cursor-pointer hover:bg-muted/30 ${!n.read ? "border-l-4 border-l-primary" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm">{n.title}</h4>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground font-body mt-1">
                    {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ""}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
