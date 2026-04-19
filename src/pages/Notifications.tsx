import { ArrowLeft, Bell, MapPin, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const notifications = [
  {
    id: 1,
    type: "new-food" as const,
    title: "New Food Available!",
    message: "Biryani for 25 servings posted by Royal Restaurant, Gulberg. 1.2 km away.",
    time: "Just now",
    read: false,
  },
  {
    id: 2,
    type: "ai-verified" as const,
    title: "AI Quality Verified",
    message: "Fresh Cake from Sweet Corner has been verified. Quality Score: 92/100.",
    time: "5 min ago",
    read: false,
  },
  {
    id: 3,
    type: "pickup-assigned" as const,
    title: "Pickup Assigned",
    message: "Volunteer Fatima has accepted your Dal Chawal donation for pickup.",
    time: "15 min ago",
    read: false,
  },
  {
    id: 4,
    type: "delivered" as const,
    title: "Delivery Confirmed",
    message: "Your Biryani donation has been delivered to Edhi Foundation Shelter.",
    time: "1 hour ago",
    read: true,
  },
  {
    id: 5,
    type: "fraud-alert" as const,
    title: "⚠️ AI Fraud Alert",
    message: "A donation was flagged by AI for food quality concerns. Admin has been notified.",
    time: "2 hours ago",
    read: true,
  },
  {
    id: 6,
    type: "new-food" as const,
    title: "New Food Available!",
    message: "Daal Chawal for 15 people posted by Mama's Kitchen. 0.8 km away.",
    time: "3 hours ago",
    read: true,
  },
];

const iconMap = {
  "new-food": { icon: MapPin, color: "text-primary", bg: "bg-primary/10" },
  "ai-verified": { icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
  "pickup-assigned": { icon: Bell, color: "text-secondary", bg: "bg-secondary/10" },
  "delivered": { icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
  "fraud-alert": { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
};

const Notifications = () => {
  const navigate = useNavigate();

  return (
    <div className="mobile-container min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        <span className="ml-auto text-xs font-medium text-primary">3 new</span>
      </div>

      <div className="page-padding flex flex-col gap-2">
        {notifications.map((n) => {
          const config = iconMap[n.type];
          const Icon = config.icon;
          return (
            <div
              key={n.id}
              className={`glass-card p-4 flex items-start gap-3 transition-all ${!n.read ? "border-l-4 border-l-primary" : ""}`}
            >
              <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={config.color} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm">{n.title}</h4>
                <p className="text-xs text-muted-foreground font-body mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground font-body mt-1">{n.time}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
