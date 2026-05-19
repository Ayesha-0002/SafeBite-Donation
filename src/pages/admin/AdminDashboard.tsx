import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Shield, Users, AlertTriangle, CheckCircle, XCircle, Bell, LayoutDashboard, Sparkles, UserCog, LogOut, Loader2, Package, Search, Star, FileText, TrendingUp, MapPin, Calendar, Utensils, Navigation, Clock, Eye } from "lucide-react";
import logo from "@/assets/rizq-logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format, isValid } from "date-fns";
import React from "react";
import LeafletMap from "@/components/LeafletMap";

import { useAuth } from "@/context/AuthContext";

const tabs = ["Statistics", "Donations", "Donor Analytics", "Rider Analytics", "NGO Logs", "Rider Live Tracker", "Registration Requests", "User Management"] as const;

const COLORS = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(220, 70%, 50%)"];

const safeFormat = (date: any, formatStr: string, fallback = "N/A") => {
  if (!date) return fallback;
  const d = new Date(date);
  if (!isValid(d)) return fallback;
  return format(d, formatStr);
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Admin Tab Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-destructive/5 rounded-3xl border border-destructive/20 text-center animate-fade-in shadow-xl shadow-destructive/5 my-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4 shadow-inner">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-black text-foreground mb-2 uppercase tracking-tight">Component Encountered an Issue</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">A specific part of the dashboard failed to render. You can still use other sections.</p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25"
          >
            Attempt Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dashboard rendered at: 2026-04-21
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Statistics");
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <aside className="w-64 gradient-dark min-h-screen p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white border border-white/30 shadow-lg">
              <Utensils size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-primary-foreground">SafeBite Admin</span>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {[
              { icon: LayoutDashboard, label: "Statistics", tab: "Statistics" as const },
              { icon: FileText, label: "Donations", tab: "Donations" as const },
              { icon: TrendingUp, label: "Donor Analytics", tab: "Donor Analytics" as const },
              { icon: Users, label: "Rider Analytics", tab: "Rider Analytics" as const },
              { icon: FileText, label: "NGO Logs", tab: "NGO Logs" as const },
              { icon: Navigation, label: "Rider Tracker", tab: "Rider Live Tracker" as const },
              { icon: UserCog, label: "Registrations", tab: "Registration Requests" as const },
              { icon: Users, label: "User Management", tab: "User Management" as const },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.tab)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.tab
                    ? "gradient-primary text-primary-foreground"
                    : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-foreground/60 hover:text-primary-foreground">
            <LogOut size={18} /> Log Out
          </button>
        </aside>
        <main className="flex-1 p-8 overflow-auto">
          <AdminContent activeTab={activeTab} />
        </main>
      </div>

      {/* Mobile view */}
      <div className="lg:hidden">
        <div className="gradient-primary px-5 pt-6 pb-4 rounded-b-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white border border-white/30 shadow-lg">
                <Utensils size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary-foreground">SafeBite Admin</h1>
                <p className="text-xs text-primary-foreground/70">Control Room</p>
              </div>
            </div>
            <Bell size={22} className="text-primary-foreground/80" />
          </div>
        </div>
        <div className="flex gap-1 px-4 mt-4 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="page-padding">
          <AdminContent activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
};

const AdminContent = ({ activeTab }: { activeTab: string }) => {
  return (
    <ErrorBoundary key={activeTab}>
      {activeTab === "Statistics" && <StatisticsTab />}
      {activeTab === "Donations" && <DonationsTab />}
      {activeTab === "Donor Analytics" && <DonorAnalyticsTab />}
      {activeTab === "Rider Analytics" && <RiderAnalyticsTab />}
      {activeTab === "NGO Logs" && <NgoLogsTab />}
      {activeTab === "Rider Live Tracker" && <RiderTrackerTab />}
      {activeTab === "Registration Requests" && <RegistrationRequestsTab />}
      {activeTab === "User Management" && <UserManagementTab />}
    </ErrorBoundary>
  );
};

// ============ STATISTICS TAB (with real-time stat cards) ============
const StatisticsTab = () => {
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem("adm_stats");
      return cached ? JSON.parse(cached) : { total: 0, delivered: 0, posted: 0, rejected: 0, activeNgos: 0 };
    } catch { return { total: 0, delivered: 0, posted: 0, rejected: 0, activeNgos: 0 }; }
  });
  const [donations, setDonations] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("adm_donations");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Admin: Fetching stats...");
        const [donationsRes, rolesRes] = await Promise.all([
          supabase.from("food_donations").select("*"),
          supabase.from("user_roles").select("role"),
        ]);
        if (donationsRes.error) throw donationsRes.error;
        const d = donationsRes.data || [];
        const roles = rolesRes.data || [];
        console.log("Admin: Fetched donations:", d.length);
        setDonations(d);
        const newStats = {
          total: d.length,
          delivered: d.filter(x => x.status === "delivered").length,
          posted: d.filter(x => x.status === "posted").length,
          rejected: d.filter(x => x.status === "rejected").length,
          activeNgos: roles.filter(r => r.role === "volunteer").length,
        };
        setStats(newStats);
        localStorage.setItem("adm_donations", JSON.stringify(d));
        localStorage.setItem("adm_stats", JSON.stringify(newStats));
      } catch (e: any) {
        console.error("fetchStats error:", e);
        setError(e.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statusPieData = useMemo(() => [
    { name: "Delivered", value: stats.delivered },
    { name: "Posted", value: stats.posted },
    { name: "Rejected", value: stats.rejected },
    { name: "Other", value: Math.max(0, stats.total - stats.delivered - stats.posted - stats.rejected) },
  ].filter(d => d.value > 0), [stats]);

  const weeklyData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map((day, i) => {
      const dayDonations = donations.filter(d => new Date(d.created_at).getDay() === i);
      return { day, donations: dayDonations.length, delivered: dayDonations.filter(d => d.status === "delivered").length };
    });
  }, [donations]);

  const forceRefresh = () => {
    localStorage.removeItem("adm_stats");
    localStorage.removeItem("adm_donations");
    window.location.reload();
  };

  return (
    <div className="animate-fade-in">
      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
        <AlertTriangle size={14} /> {error}
        <button onClick={forceRefresh} className="ml-auto underline decoration-dotted">Clear Cache</button>
      </div>}

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { value: stats.total, label: "Total Food Donations", icon: Package, color: "text-primary" },
          { value: stats.delivered, label: "Successful Deliveries", icon: CheckCircle, color: "text-primary" },
          { value: stats.activeNgos, label: "Active Volunteers", icon: Navigation, color: "text-secondary" },
          { value: stats.posted, label: "Open / Posted", icon: Bell, color: "text-secondary" },
          { value: stats.rejected, label: "Rejected / Unsafe", icon: AlertTriangle, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="stat-card group hover:scale-[1.02] transition-transform relative overflow-hidden">
            {loading && <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-2xl pointer-events-none" />}
            <s.icon size={20} className={s.color} />
            <p className="text-2xl font-black text-foreground">{s.value || 0}</p>
            <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5 relative overflow-hidden">
          <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <PieChart size={16} className="text-primary" /> Donation Status
          </h3>
          {loading && statusPieData.length === 0 ? (
            <div className="h-[200px] w-full bg-muted/40 animate-pulse rounded-2xl" />
          ) : statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center opacity-30">
              <Package size={40} className="mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">No Activity Recorded</p>
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <TrendingUp size={16} className="text-primary" /> Weekly Performance
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="donations" stroke="hsl(160, 84%, 39%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} animationDuration={1500} />
              <Line type="monotone" dataKey="delivered" stroke="hsl(38, 92%, 50%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} animationDuration={1500} />
              <Legend verticalAlign="top" height={36}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card overflow-hidden mt-6">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
            <Clock size={16} className="text-secondary" /> Recent Activity
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Content</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Donor</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && donations.length === 0 ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : donations.slice(0, 5).map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/5">
                  <TableCell className="font-bold text-xs">{d.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.donor?.full_name || "Community"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[9px] uppercase font-black tracking-tighter border-none ${
                        d.status === "posted" ? "bg-primary/20 text-primary" : 
                        d.status === "delivered" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-[10px] text-muted-foreground">
                    {safeFormat(d.created_at, "hh:mm a")}
                  </TableCell>
                </TableRow>
              ))}
              {(!loading || donations.length > 0) && donations.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-30 text-xs font-bold uppercase tracking-widest">No recent activity detected</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

// ============ DONOR ANALYTICS TAB ============
// ============ DONATIONS TAB (Full Feed for Admin) ============
const DonationsTab = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const { data: donations, error } = await supabase
        .from("food_donations")
        .select("*, donor:profiles!donor_id(full_name, email)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setDonations(donations || []);
    } catch (e: any) {
      toast.error("Failed to load donations: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const filtered = donations.filter(d => {
    const matchesSearch = (d.title || "").toLowerCase().includes(search.toLowerCase()) || 
                         (d.donor?.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package size={22} className="text-primary" /> Donation Feed
            {loading && <Loader2 size={16} className="animate-spin text-muted-foreground ml-2" />}
          </h2>
          <p className="text-xs text-muted-foreground">Monitor all food contributions across the platform</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search by title or donor..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 h-10 rounded-xl" 
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-10 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="posted">Active</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Donation</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Donor</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && donations.length === 0 ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-6 w-20 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                  <Package size={40} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">No donations found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground">{d.title}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin size={10} /> {d.location}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs text-foreground">{d.donor?.full_name || "Unknown"}</span>
                      <span className="text-[10px] text-muted-foreground">{d.donor?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {safeFormat(d.created_at, "MMM dd, yyyy")}
                    <br />
                    <span className="text-[9px] opacity-50">{safeFormat(d.created_at, "hh:mm a")}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`font-black text-[9px] uppercase tracking-widest border-none px-2 py-0.5 ${
                      d.status === "delivered" ? "bg-success/20 text-success" :
                      d.status === "posted" ? "bg-primary/20 text-primary" :
                      d.status === "accepted" || d.status === "picked_up" ? "bg-orange-500/20 text-orange-600" :
                      "bg-destructive/20 text-destructive"
                    }`}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs font-black ${
                      (d.ai_quality_score || 0) > 80 ? "text-success" : 
                      (d.ai_quality_score || 0) > 50 ? "text-orange-500" : "text-destructive"
                    }`}>
                      {d.ai_quality_score || 0}%
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const DonorAnalyticsTab = () => {
  const [donorData, setDonorData] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("adm_donor_data");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [detailsDialog, setDetailsDialog] = useState<any | null>(null);
  const [ratingDialog, setRatingDialog] = useState<{ userId: string; name: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const [donationsRes, profilesRes, ratingsRes] = await Promise.all([
          supabase.from("food_donations").select("*").order("created_at", { ascending: false }),
          supabase.from("profiles").select("id, full_name, email, role"),
          supabase.from("donation_ratings").select("*"),
        ]);
        if (donationsRes.error) throw donationsRes.error;
        
        const donations = donationsRes.data || [];
        const profiles = profilesRes.data || [];
        const allRatings = ratingsRes.data || [];
        setRatings(allRatings);

        // Pre-group ratings for faster lookup
        const ratingsMap = new Map<string, { total: number; count: number }>();
        allRatings.forEach(r => {
          const stats = ratingsMap.get(r.rated_user_id) || { total: 0, count: 0 };
          stats.total += r.rating;
          stats.count++;
          ratingsMap.set(r.rated_user_id, stats);
        });

        // Group by donor using a Map for O(n) performance
        const donorMap = new Map<string, any>();
        
        // Pre-map profiles for faster lookup
        const profileMap = new Map(profiles.map(p => [p.id, p]));

        donations.forEach(d => {
          if (!donorMap.has(d.donor_id)) {
            const profile = profileMap.get(d.donor_id);
            const userRating = ratingsMap.get(d.donor_id);
            donorMap.set(d.donor_id, {
              id: d.donor_id,
              name: profile?.full_name || "Unknown",
              email: profile?.email || "",
              avgRating: userRating ? (userRating.total / userRating.count).toFixed(1) : null,
              totalPosts: 0,
              delivered: 0,
              rejected: 0,
              pending: 0,
              donations: []
            });
          }
          const donor = donorMap.get(d.donor_id);
          donor.totalPosts++;
          donor.donations.push(d);
          if (d.status === "delivered") donor.delivered++;
          else if (d.status === "rejected") donor.rejected++;
          else donor.pending++;
        });

        // Correctly convert Map values to Array for the table
        const data = Array.from(donorMap.values()).sort((a, b) => b.totalPosts - a.totalPosts);
        setDonorData(data);
        localStorage.setItem("adm_donor_data", JSON.stringify(data));
      } catch (err: any) {
        console.error("Donor fetch error:", err);
        setError(err.message || "Failed to load donor analytics");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSubmitRating = async () => {
    if (!ratingDialog) return;
    if (ratingValue === 0) {
      toast.error("Please select a rating from 1 to 5 stars");
      return;
    }
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { error } = await supabase.from("donation_ratings").insert({
      donation_id: "00000000-0000-0000-0000-000000000000", // general rating
      rated_user_id: ratingDialog.userId,
      rated_by_user_id: user.id,
      rating: ratingValue,
      comment: ratingComment || null,
    });
    if (error) { toast.error("Rating failed"); return; }
    toast.success(`Rated ${ratingDialog.name} ⭐${ratingValue}`);
    setRatingDialog(null);
    setRatingComment("");
    // Refresh ratings
    const { data } = await supabase.from("donation_ratings").select("*");
    setRatings(data || []);
  };

  const filtered = useMemo(() =>
    donorData.filter(d => (d.name || "").toLowerCase().includes(search.toLowerCase()) || (d.email || "").toLowerCase().includes(search.toLowerCase())),
    [donorData, search]
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <TrendingUp size={18} className="text-secondary" /> Donor Analytics
          {loading && <Loader2 size={14} className="animate-spin text-muted-foreground ml-2" />}
        </h3>
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search donors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
        </div>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2 animate-shake">
        <AlertTriangle size={14} /> {error}
      </div>}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Donor Name</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Email</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Total Posts</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Delivered</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Pending</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Rejected</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Avg Rating</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && donorData.length === 0 ? (
                [1,2,3,4,5].map(i => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                    <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                    <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                    <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                    <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                    <TableCell><div className="h-8 w-20 bg-muted animate-pulse rounded-lg mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.map(d => (
                <TableRow key={d.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-bold cursor-pointer hover:text-primary transition-colors text-sm" onClick={() => setDetailsDialog(d)}>
                    {d.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-medium">{d.email}</TableCell>
                  <TableCell className="text-center font-black text-foreground">{d.totalPosts}</TableCell>
                  <TableCell className="text-center"><Badge variant="secondary" className="bg-primary/10 text-primary font-black border-transparent">{d.delivered}</Badge></TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5 font-black">{d.pending}</Badge></TableCell>
                  <TableCell className="text-center"><Badge variant="destructive" className="font-black">{d.rejected}</Badge></TableCell>
                  <TableCell className="text-center">
                    {d.avgRating ? (
                      <span className="flex items-center justify-center gap-1 text-sm font-black text-foreground">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" /> {d.avgRating}
                      </span>
                    ) : <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">N/A</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => { setRatingDialog({ userId: d.id, name: d.name }); setRatingValue(0); }}
                      className="text-[10px] px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground font-black uppercase tracking-wider active:scale-95 transition-transform shadow-md shadow-primary/20"
                    >
                      Rate
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {(!loading || donorData.length > 0) && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-20 font-bold uppercase tracking-widest text-xs opacity-50">No donors found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Donation Details Dialog */}
      {detailsDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setDetailsDialog(null)}>
          <div className="bg-card rounded-[2rem] p-5 sm:p-8 w-full max-w-4xl shadow-2xl animate-scale-in max-h-[92vh] overflow-hidden flex flex-col border border-border/50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Package size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-2xl text-foreground tracking-tight">{detailsDialog.name}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    <span>Avg Rating: <b>{detailsDialog.avgRating || "N/A"}</b></span>
                    <span className="mx-1">•</span>
                    <span>{detailsDialog.email}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDetailsDialog(null)}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-all hover:rotate-90"
              >
                <XCircle size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-8">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: "Total Posts", value: detailsDialog.totalPosts, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Delivered", value: detailsDialog.delivered, icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
                  { label: "Pending", value: detailsDialog.pending, icon: Bell, color: "text-orange-500", bg: "bg-orange-500/10" },
                  { label: "Rejected", value: detailsDialog.rejected, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
                ].map((stat) => (
                  <div key={stat.label} className={`${stat.bg} p-4 rounded-2xl border border-white/5`}>
                     <div className="flex items-center justify-between mb-2">
                       <stat.icon size={16} className={stat.color} />
                     </div>
                     <p className="text-2xl font-black text-foreground">{stat.value}</p>
                     <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* History Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-5">
                  <h5 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" /> Monthly Activity
                  </h5>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(() => {
                        const monthsMap: Record<string, any> = {};
                        detailsDialog.donations.forEach((d: any) => {
                          if (!d.created_at || isNaN(new Date(d.created_at).getTime())) return;
                          const monthStr = format(new Date(d.created_at), "MMM yyyy");
                          if (!monthsMap[monthStr]) monthsMap[monthStr] = { month: monthStr, posts: 0, delivered: 0 };
                          monthsMap[monthStr].posts++;
                          if (d.status === "delivered") monthsMap[monthStr].delivered++;
                        });
                        return Object.values(monthsMap).reverse();
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="posts" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="delivered" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <h5 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <Star size={16} className="text-yellow-500" /> Rating Trend (Daily)
                  </h5>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(() => {
                        const dayMap: Record<string, any> = {};
                        const userRatings = ratings.filter(r => r.rated_user_id === detailsDialog.id);
                        userRatings.forEach((r: any) => {
                          const ts = r.created_at ? new Date(r.created_at) : new Date();
                          if (isNaN(ts.getTime())) return;
                          const dateStr = format(ts, "dd MMM");
                          if (!dayMap[dateStr]) dayMap[dateStr] = { day: dateStr, rating: 0, count: 0 };
                          dayMap[dateStr].rating += r.rating;
                          dayMap[dateStr].count++;
                        });
                        return Object.values(dayMap).map((d: any) => ({ ...d, avg: (d.rating / d.count).toFixed(1) }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
                        <YAxis hide domain={[0, 5]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="avg" stroke="hsl(38, 92%, 50%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Posts List */}
              <div>
                <h5 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" /> Post History
                </h5>
                <div className="flex flex-col gap-3">
                  {detailsDialog.donations.map((dn: any) => (
                    <div key={dn.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-muted/30 transition-all border border-transparent hover:border-border/60">
                      <div className="flex items-center gap-4">
                        {dn.image_url ? (
                          <img 
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${dn.image_url}`} 
                            alt={dn.title} 
                            className="w-14 h-14 rounded-2xl object-cover ring-1 ring-border group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                            <Utensils size={24} className="text-muted-foreground/30" />
                          </div>
                        )}
        <div className="min-w-0">
          <h6 className="font-bold text-foreground text-sm truncate">{dn.title}</h6>
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground font-body mt-0.5">
            <span className="flex items-center gap-1 text-primary"><MapPin size={10} /> {dn.location}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar size={10} /> {safeFormat(dn.created_at, "dd MMM yyyy, hh:mm a")}</span>
          </div>
        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status</p>
                          <Badge 
                            variant={dn.status === "delivered" ? "secondary" : dn.status === "rejected" ? "destructive" : "outline"} 
                            className={`text-[10px] font-bold ${dn.status === "delivered" ? "bg-primary/10 text-primary" : ""}`}
                          >
                            {dn.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="h-10 w-[1px] bg-border/60 mx-1 hidden sm:block" />
                        <div className="flex flex-col items-end">
                           <div className="flex items-center gap-1 mb-1">
                             {dn.status === "rejected" && <Badge variant="destructive" className="h-4 px-1.5 text-[9px] font-black">REJECTED</Badge>}
                           </div>
                           <p className="text-[10px] text-muted-foreground font-mono">{dn.quantity} Servings</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex justify-end">
              <button 
                onClick={() => setDetailsDialog(null)}
                className="px-8 py-3 rounded-2xl bg-foreground text-background font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Dialog */}
      {ratingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRatingDialog(null)}>
          <div className="bg-card rounded-2xl p-6 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-foreground mb-1">Rate {ratingDialog.name}</h4>
            <p className="text-xs text-muted-foreground mb-4">Give a rating based on food quality & reliability</p>
            <div className="flex gap-2 justify-center mb-4">
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} onClick={() => setRatingValue(v)}>
                  <Star size={28} className={v <= ratingValue ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"} />
                </button>
              ))}
            </div>
            <Input placeholder="Comment (optional)" value={ratingComment} onChange={e => setRatingComment(e.target.value)} className="mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setRatingDialog(null)} className="flex-1 py-2 rounded-xl border text-sm font-medium text-muted-foreground">Cancel</button>
              <button onClick={handleSubmitRating} className="flex-1 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ NGO RECEIVING LOGS TAB ============
// ============ RIDER ANALYTICS TAB ============
const RiderAnalyticsTab = () => {
  const [riderStats, setRiderStats] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("adm_rider_stats");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRider, setSelectedRider] = useState<any | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const [trackingRes, profilesRes, ratingsRes, donationsRes] = await Promise.all([
          supabase.from("volunteer_tracking").select("*"),
          supabase.from("profiles").select("id, full_name, email, role, phone").eq("role", "volunteer"),
          supabase.from("donation_ratings").select("*"),
          supabase.from("food_donations").select("id, assigned_volunteer_id, status").not("assigned_volunteer_id", "is", null)
        ]);
        console.log("Analytics: trackingRes", trackingRes);
        console.log("Analytics: profilesRes", profilesRes);
        console.log("Analytics: ratingsRes", ratingsRes);
        console.log("Analytics: donationsRes", donationsRes);

        if (trackingRes.error) throw trackingRes.error;
        if (profilesRes.error) throw profilesRes.error;
        if (donationsRes.error) throw donationsRes.error;

        const tracking = trackingRes.data || [];
        const volunteers = profilesRes.data || [];
        const ratings = ratingsRes.data || [];
        const donations = donationsRes.data || [];

        const ratingsMap = new Map<string, { total: number; count: number }>();
        ratings.forEach(r => {
          const stats = ratingsMap.get(r.rated_user_id) || { total: 0, count: 0 };
          stats.total += r.rating;
          stats.count++;
          ratingsMap.set(r.rated_user_id, stats);
        });

        // Group donation status by volunteer for better accuracy
        const donationStatusMap = new Map<string, { active: number; completed: number }>();
        donations.forEach(d => {
          const vId = d.assigned_volunteer_id;
          if (!vId) return;
          const stats = donationStatusMap.get(vId) || { active: 0, completed: 0 };
          if (d.status === "delivered") stats.completed++;
          else stats.active++;
          donationStatusMap.set(vId, stats);
        });
        
        const riderMap = new Map<string, any>();
        volunteers.forEach(v => {
          if (!v.id) return;
          const donationStats = donationStatusMap.get(v.id) || { active: 0, completed: 0 };
          
          riderMap.set(v.id, {
            id: v.id,
            name: v.full_name || "Unknown",
            email: v.email || "N/A",
            phone: v.phone || "N/A",
            activeTasks: donationStats.active,
            completedDeliveries: donationStats.completed,
            avgRating: "N/A",
            lastSeen: null,
            status: donationStats.active > 0 ? "active" : "offline"
          });
        });

        tracking.forEach(t => {
          if (riderMap.has(t.volunteer_id)) {
            const rider = riderMap.get(t.volunteer_id);
            const trackDate = new Date(t.updated_at);
            if (!rider.lastSeen || trackDate > new Date(rider.lastSeen)) {
              rider.lastSeen = t.updated_at;
            }
          }
        });

        const finalData = Array.from(riderMap.values()).map(r => {
          const ratingData = ratingsMap.get(r.id);
          return {
            ...r,
            avgRating: ratingData ? (ratingData.total / ratingData.count).toFixed(1) : "N/A"
          };
        }).sort((a, b) => b.completedDeliveries - a.completedDeliveries);

        setRiderStats(finalData);
        localStorage.setItem("adm_rider_stats", JSON.stringify(finalData));
      } catch (err: any) {
        console.error("Rider Analytics error:", err);
        setError(err.message || "Failed to load rider fleet data");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = useMemo(() => 
    riderStats.filter(r => 
      (r.name || "").toLowerCase().includes(search.toLowerCase()) || 
      (r.phone || "").includes(search)
    ),
    [riderStats, search]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h3 className="font-bold text-foreground">Volunteer Efficiency Reports</h3>
          <p className="text-xs text-muted-foreground">Performance metrics and delivery history for all riders.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search riders..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 h-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
        <AlertTriangle size={14} /> {error}
      </div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Top Rider", value: riderStats[0]?.name || "N/A", icon: Star, color: "text-yellow-500" },
          { label: "Active Fleet", value: riderStats.filter(r => r.activeTasks > 0).length, icon: Navigation, color: "text-primary" },
          { label: "Total Completed", value: riderStats.reduce((sum, r) => sum + r.completedDeliveries, 0), icon: CheckCircle, color: "text-success" },
          { label: "Avg Service Rating", value: "⭐ 4.8", icon: TrendingUp, color: "text-blue-500" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex flex-col items-center text-center">
            <s.icon size={20} className={`${s.color} mb-2`} />
            <p className="text-lg font-bold text-foreground truncate w-full">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Volunteer Details</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Deliveries</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Rating</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Active Task</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && riderStats.length === 0 ? (
                [1,2,3,4,5].map(i => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell colSpan={5}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.map(r => (
                <TableRow 
                  key={r.id} 
                  className="hover:bg-muted/30 cursor-pointer transition-colors group"
                  onClick={() => setSelectedRider(r)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-sm group-hover:scale-105 transition-transform">
                        {(r.name || "?").slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{r.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{r.phone || "N/A"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold bg-primary/5 text-primary border-primary/10">{r.completedDeliveries}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star size={12} className={r.avgRating !== "N/A" ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"} />
                      <span className="text-xs font-bold">{r.avgRating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-black text-foreground">
                    {r.activeTasks}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={r.status === "active" ? "secondary" : "outline"} className={r.status === "active" ? "bg-success/10 text-success border-success/20 animate-pulse" : "text-muted-foreground/40 border-muted"}>
                      {(r.status || "OFFLINE").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-[10px] text-muted-foreground font-bold uppercase">
                    <span className="flex items-center justify-end gap-1">
                      <Clock size={12} /> {safeFormat(r.lastSeen, "dd MMM, hh:mm a", "NEVER")}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!loading || riderStats.length > 0) && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-bold uppercase tracking-widest text-[10px] opacity-50">No riders found matching filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selectedRider} onOpenChange={() => setSelectedRider(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          {selectedRider && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="gradient-primary p-6 text-primary-foreground relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                    <Navigation size={28} />
                  </div>
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-1 px-3 backdrop-blur-md">
                    {selectedRider.status.toUpperCase()}
                  </Badge>
                </div>
                <h4 className="text-2xl font-black tracking-tight">{selectedRider.name}</h4>
                <p className="text-white/70 text-sm font-medium mt-1 uppercase tracking-widest text-[10px] font-black">{selectedRider.email}</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Deliveries</p>
                    <p className="text-xl font-black text-foreground">{selectedRider.completedDeliveries}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Active</p>
                    <p className="text-xl font-black text-primary">{selectedRider.activeTasks}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Rating</p>
                    <p className="text-xl font-black text-yellow-500">{selectedRider.avgRating}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                        <Phone size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Phone Contact</p>
                        <p className="text-xs font-bold text-foreground">{selectedRider.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                        <Activity size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Last Movement</p>
                        <p className="text-xs font-bold text-foreground">{safeFormat(selectedRider.lastSeen, "dd MMM, hh:mm a")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedRider(null)}
                  className="w-full py-3.5 rounded-2xl bg-muted text-foreground font-black uppercase text-xs tracking-widest hover:bg-muted/80 transition-all active:scale-95 border border-border/50 shadow-inner"
                >
                  Close Report
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const NgoLogsTab = () => {
  const [logs, setLogs] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("adm_ngo_logs");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [selectedNgo, setSelectedNgo] = useState<any | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const [donationsRes, profilesRes] = await Promise.all([
          supabase.from("food_donations").select("*").not("ngo_verified_by", "is", null).order("created_at", { ascending: false }),
          supabase.from("profiles").select("id, full_name"),
        ]);
        if (donationsRes.error) throw donationsRes.error;
        if (profilesRes.error) throw profilesRes.error;
        
        const donations = donationsRes.data || [];
        const profiles = profilesRes.data || [];

        const profileMap = new Map(profiles.map(p => [p.id, p]));

        const enriched = donations.map(d => {
          const donor = profileMap.get(d.donor_id);
          const ngo = profileMap.get(d.ngo_verified_by);
          return {
            ...d,
            donorName: donor?.full_name || "Unknown Donor",
            ngoName: ngo?.full_name || "Unknown NGO",
            // Fallback for verification time if missing
            verificationTime: d.ngo_verified_at || d.delivered_at || d.updated_at || d.created_at
          };
        });
        setLogs(enriched);
        localStorage.setItem("adm_ngo_logs", JSON.stringify(enriched));
      } catch (err: any) {
        console.error("NGO logs fetch error:", err);
        setError(err.message || "Failed to load NGO logs");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const locations = useMemo(() => [...new Set(logs.map(l => l.location || "Unknown"))], [logs]);

  const filtered = useMemo(() => {
    let result = logs;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => (l.donorName || "").toLowerCase().includes(s) || (l.ngoName || "").toLowerCase().includes(s) || (l.title || "").toLowerCase().includes(s));
    }
    if (locationFilter !== "all") result = result.filter(l => l.location === locationFilter);
    if (dateFilter !== "all") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (dateFilter === "today") result = result.filter(l => new Date(l.verificationTime).getTime() >= startOfDay);
      if (dateFilter === "week") result = result.filter(l => (now.getTime() - new Date(l.verificationTime).getTime()) < 7 * 86400000);
      if (dateFilter === "month") result = result.filter(l => (now.getTime() - new Date(l.verificationTime).getTime()) < 30 * 86400000);
    }
    return result;
  }, [logs, search, locationFilter, dateFilter]);

  const ngoSummary = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    const map: Record<string, any> = {};
    const now = new Date();
    
    logs.forEach(log => {
      const ngoId = log.ngo_verified_by;
      if (!ngoId) return;
      if (!map[ngoId]) {
        map[ngoId] = { 
          id: ngoId, 
          name: log.ngoName, 
          total: 0, 
          count: 0, 
          weekly: 0, 
          monthly: 0,
          logs: [] 
        };
      }
      map[ngoId].total += (Number(log.quantity) || 0);
      map[ngoId].count++;
      map[ngoId].logs.push(log);
      
      const logDate = new Date(log.verificationTime);
      if (!isNaN(logDate.getTime())) {
        if ((now.getTime() - logDate.getTime()) < 7 * 86400000) map[ngoId].weekly += (Number(log.quantity) || 0);
        if ((now.getTime() - logDate.getTime()) < 30 * 86400000) map[ngoId].monthly += (Number(log.quantity) || 0);
      }
    });
    return Object.values(map).sort((a: any, b: any) => b.total - a.total);
  }, [logs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
        <AlertTriangle size={14} /> {error}
      </div>}
      
      {/* Today's Highlight Recap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 border-l-4 border-l-blue-500 relative overflow-hidden">
           {loading && logs.length === 0 && <div className="absolute inset-0 bg-primary/5 animate-pulse z-10" />}
           <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
               <Calendar size={20} />
             </div>
             <div>
               <h4 className="font-bold text-sm text-foreground">Today's Receiving Log</h4>
               <p className="text-[10px] text-muted-foreground uppercase font-black">Live updates</p>
             </div>
           </div>
           <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
             {loading && logs.length === 0 ? (
                [1,2,3].map(i => <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-xl" />)
             ) : logs.filter(l => new Date(l.verificationTime).toDateString() === new Date().toDateString()).length === 0 ? (
               <p className="text-xs text-muted-foreground text-center py-10 italic">No receiving logs for today yet</p>
             ) : (
               logs.filter(l => new Date(l.verificationTime).toDateString() === new Date().toDateString()).map(l => (
                 <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                       <Package size={14} className="text-primary" />
                     </div>
                     <div>
                       <p className="text-[11px] font-bold text-foreground leading-tight">{l.ngoName} received {l.title}</p>
                        <p className="text-[9px] text-muted-foreground">From {l.donorName} • {safeFormat(l.verificationTime, "hh:mm a")}</p>
                     </div>
                   </div>
                   <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-black">+{l.quantity}</Badge>
                 </div>
               ))
             )}
           </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-orange-500 relative overflow-hidden">
           {loading && logs.length === 0 && <div className="absolute inset-0 bg-primary/5 animate-pulse z-10" />}
           <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
               <TrendingUp size={20} />
             </div>
             <div>
               <h4 className="font-bold text-sm text-foreground">Daily Distribution</h4>
               <p className="text-[10px] text-muted-foreground uppercase font-black">Summary</p>
             </div>
           </div>
           <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
               <p className="text-xs font-bold text-muted-foreground">Total Servings (Today)</p>
               <p className="text-2xl font-black text-foreground">
                 {logs.filter(l => new Date(l.verificationTime).toDateString() === new Date().toDateString()).reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)}
               </p>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-muted/20 rounded-xl">
                 <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Top Area</p>
                 <p className="text-xs font-bold text-foreground truncate">
                   {(() => {
                     const todayLogs = logs.filter(l => new Date(l.verificationTime).toDateString() === new Date().toDateString());
                     if (todayLogs.length === 0) return "N/A";
                     const locMap: Record<string, number> = {};
                     todayLogs.forEach(l => {
                       const loc = l.location || "Unknown";
                       locMap[loc] = (locMap[loc] || 0) + 1;
                     });
                     const sorted = Object.entries(locMap).sort((a,b) => b[1] - a[1]);
                     return sorted[0]?.[0] || "N/A";
                   })()}
                 </p>
               </div>
               <div className="p-3 bg-muted/20 rounded-xl">
                 <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Unique Donors</p>
                 <p className="text-xs font-bold text-foreground">
                    {new Set(logs.filter(l => new Date(l.verificationTime).toDateString() === new Date().toDateString()).map(l => l.donor_id)).size}
                 </p>
               </div>
             </div>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText size={18} className="text-primary" /> NGO Receiving Reports
          {loading && <Loader2 size={14} className="animate-spin text-muted-foreground ml-2" />}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl">
              <Calendar size={14} className="mr-1" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="today">Today's Report</SelectItem>
              <SelectItem value="week">Past 7 Days</SelectItem>
              <SelectItem value="month">Past 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards for NGOs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && logs.length === 0 ? (
          [1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)
        ) : (
          ngoSummary.slice(0, 4).map((ngo: any) => (
            <div 
              key={ngo.id} 
              onClick={() => setSelectedNgo(ngo)}
              className="glass-card p-4 border-l-4 border-l-primary cursor-pointer hover:bg-muted font-black transition-all hover:scale-[1.02] active:scale-95"
            >
              <div className="flex justify-between items-start mb-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate max-w-[150px]">{ngo.name}</p>
                <TrendingUp size={12} className="text-primary" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-black text-foreground">{ngo.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total Servings</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">{ngo.count}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-black">Pickups</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* NGO Performance Statistics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> NGO Performance Statistics
          </h4>
          <span className="text-[10px] text-muted-foreground uppercase font-black">Click an NGO for Detailed Monthly Report</span>
        </div>
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>NGO Name</TableHead>
                <TableHead className="text-center">Weekly Servings</TableHead>
                <TableHead className="text-center">Monthly Servings</TableHead>
                <TableHead className="text-center">Total Servings</TableHead>
                <TableHead className="text-center text-primary font-black uppercase text-[10px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ngoSummary.map((ngo) => (
                <TableRow 
                  key={ngo.id} 
                  className="cursor-pointer hover:bg-primary/5 transition-colors group"
                  onClick={() => setSelectedNgo(ngo)}
                >
                  <TableCell className="font-bold text-foreground group-hover:text-primary">{ngo.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-primary/20 text-primary">{ngo.weekly}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-orange-500/20 text-orange-500">{ngo.monthly}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-black text-foreground">{ngo.total}</TableCell>
                  <TableCell className="text-center">
                    <button className="text-[10px] bg-primary text-primary-foreground px-3 py-1 rounded-full font-black uppercase shadow-sm active:scale-90 transition-transform">
                      View Report
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px] h-10">
              <MapPin size={14} className="mr-1" />
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everywhere</SelectItem>
              {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Food Item</TableHead>
              <TableHead>Donor</TableHead>
              <TableHead>Received By (NGO)</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Verified At</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && logs.length === 0 ? (
              [1,2,3,4,5].map(i => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered.map(l => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedLog(l)}>
                <TableCell className="font-bold text-primary">{l.title}</TableCell>
                <TableCell>{l.donorName}</TableCell>
                <TableCell>{l.ngoName}</TableCell>
                <TableCell className="text-sm">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-primary" />
                    {l.location}
                  </span>
                </TableCell>
                <TableCell className="text-center font-bold px-4 bg-muted/30 rounded-lg">{l.quantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{safeFormat(l.verificationTime, "dd MMM, hh:mm a", "—")}</TableCell>
                <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary">Verified ✓</Badge></TableCell>
              </TableRow>
            ))}
            {(!loading || logs.length > 0) && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10 opacity-50 font-bold uppercase tracking-widest text-[10px]">No NGO receiving logs found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* NGO Report Dialog */}
      {selectedNgo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setSelectedNgo(null)}>
          <div className="bg-card rounded-[2rem] p-5 sm:p-8 w-full max-w-4xl shadow-2xl animate-scale-in max-h-[92vh] overflow-hidden flex flex-col border border-border/50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <FileText size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-2xl text-foreground tracking-tight">{selectedNgo.name}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Verified Partner</span>
                    <span className="mx-1">•</span>
                    <span>Performance Report</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNgo(null)}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-all hover:rotate-90"
              >
                <XCircle size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-8">
              {/* Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Weekly Receiving</p>
                  <p className="text-2xl font-black text-foreground">{selectedNgo.weekly}</p>
                  <p className="text-[10px] text-muted-foreground">Servings (Last 7 Days)</p>
                </div>
                <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Monthly Receiving</p>
                  <p className="text-2xl font-black text-foreground">{selectedNgo.monthly}</p>
                  <p className="text-[10px] text-muted-foreground">Servings (Last 30 Days)</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-2xl border border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Impact</p>
                  <p className="text-2xl font-black text-foreground">{selectedNgo.total}</p>
                  <p className="text-[10px] text-muted-foreground">Servings Collected in Total</p>
                </div>
              </div>

              {/* Impact Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-5">
                   <h5 className="font-bold text-sm mb-4 flex items-center gap-2">
                     <TrendingUp size={16} className="text-primary" /> Daily Activity (Servings)
                   </h5>
                   <div className="h-[200px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={(() => {
                         const dayMap: Record<string, any> = {};
                         selectedNgo.logs.slice(0, 30).forEach((l: any) => {
                           const day = safeFormat(l.verificationTime, "dd MMM");
                           if (!dayMap[day]) dayMap[day] = { day, quantity: 0 };
                           dayMap[day].quantity += l.quantity;
                         });
                         return Object.values(dayMap).slice(-7);
                       })()}>
                         <XAxis dataKey="day" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
                         <YAxis hide />
                         <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                         <Bar dataKey="quantity" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} barSize={30} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                <div className="glass-card p-5">
                   <h5 className="font-bold text-sm mb-4 flex items-center gap-2">
                     <Utensils size={16} className="text-primary" /> Receiving Volume (Monthly)
                   </h5>
                   <div className="h-[200px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={(() => {
                         const monthMap: Record<string, any> = {};
                         selectedNgo.logs.forEach((l: any) => {
                           const month = safeFormat(l.verificationTime, "MMM yyyy");
                           if (!monthMap[month]) monthMap[month] = { month, volume: 0 };
                           monthMap[month].volume += l.quantity;
                         });
                         return Object.values(monthMap).reverse();
                       })()}>
                         <XAxis dataKey="month" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
                         <YAxis hide />
                         <Tooltip />
                         <Line type="monotone" dataKey="volume" stroke="hsl(160, 84%, 39%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} />
                       </LineChart>
                     </ResponsiveContainer>
                   </div>
                </div>
              </div>

              {/* Individual Records for this NGO */}
              <div className="space-y-4">
                <h5 className="font-bold text-sm flex items-center gap-2">
                  <Clock size={16} className="text-primary" /> Recent Receiving History
                </h5>
                <div className="flex flex-col gap-3">
                  {selectedNgo.logs.slice(0, 10).map((l: any) => (
                    <div key={l.id} className="glass-card p-4 flex items-center justify-between group hover:bg-muted/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{l.title}</p>
                          <p className="text-[10px] text-muted-foreground font-body">Donor: {l.donorName} • 📍 {l.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{l.quantity} Qty</p>
                        <p className="text-[10px] text-muted-foreground">{safeFormat(l.verificationTime, "dd MMM, hh:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex justify-end">
              <button 
                onClick={() => setSelectedNgo(null)}
                className="px-8 py-3 rounded-2xl bg-foreground text-background font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Dialog */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <div className="bg-card rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl animate-scale-in border border-border/50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-xl text-foreground">Receiving Details</h4>
              <button onClick={() => setSelectedLog(null)} className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-all">
                <XCircle size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Utensils size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1">Food Item</p>
                  <h5 className="font-bold text-lg leading-tight">{selectedLog.title}</h5>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-2xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Donor</p>
                  <p className="font-bold text-sm">{selectedLog.donorName}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-2xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">NGO</p>
                  <p className="font-bold text-sm">{selectedLog.ngoName}</p>
                </div>
              </div>

              <div className="space-y-4 px-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <MapPin size={16} className="text-primary" /> Location
                  </span>
                  <span className="font-bold text-sm">{selectedLog.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Calendar size={16} className="text-primary" /> Verified Date
                  </span>
                  <span className="font-bold text-sm text-right">
                    {safeFormat(selectedLog.verificationTime, "dd MMM yyyy", "—")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Bell size={16} className="text-primary" /> Verified Time
                  </span>
                  <span className="font-bold text-sm">
                    {safeFormat(selectedLog.verificationTime, "hh:mm a", "—")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Package size={16} className="text-primary" /> Quantity
                  </span>
                  <span className="text-lg font-black text-primary">{selectedLog.quantity} Servings</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedLog(null)}
                className="w-full py-4 rounded-2xl bg-foreground text-background font-bold text-sm hover:opacity-90 transition-all shadow-lg mt-4"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ REGISTRATION REQUESTS TAB ============
const RegistrationRequestsTab = () => {
  const [requests, setRequests] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("adm_requests");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("registration_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setRequests(data || []);
      localStorage.setItem("adm_requests", JSON.stringify(data || []));
    } catch (err: any) {
      console.error("fetchRequests error:", err);
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    const { error } = await supabase
      .from("registration_requests")
      .update({ status: action, reviewed_by: (await supabase.auth.getUser()).data.user?.id })
      .eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(action === "approved" ? "User approved! Role assigned automatically." : "Request rejected.");
    fetchRequests();
  };

  return (
    <div className="animate-fade-in">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <UserCog size={18} className="text-primary" /> Registration Requests
        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground ml-2" />}
      </h3>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
        <AlertTriangle size={14} /> {error}
      </div>}

      {loading && requests.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 glass-card">
           <UserCog size={40} className="mx-auto text-muted-foreground/30 mb-3" />
           <p className="text-sm font-bold uppercase tracking-widest opacity-50">No registration requests</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="glass-card-elevated p-4 animate-fade-in">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-black text-foreground text-sm uppercase tracking-tight">{r.full_name}</h4>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">{r.requested_role} · CNIC: {r.cnic}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">📞 {r.phone}</p>
                  {r.address && <p className="text-xs text-muted-foreground leading-relaxed">📍 {r.address}</p>}
                  {r.organization && <p className="text-xs text-muted-foreground leading-relaxed font-bold">🏢 {r.organization}</p>}
                  {r.reason && <p className="text-[11px] text-foreground bg-muted/50 p-2 rounded-lg mt-2 italic border-l-2 border-primary/20">"{r.reason}"</p>}
                </div>
                <Badge className={r.status === "approved" ? "bg-success/10 text-success border-success/20" : r.status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground"}>
                  {r.status.toUpperCase()}
                </Badge>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleAction(r.id, "approved")} className="flex-1 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] text-primary-foreground gradient-primary transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20">
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button onClick={() => handleAction(r.id, "rejected")} className="flex-1 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] text-destructive-foreground bg-destructive transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-destructive/20">
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ RIDER TRACKER TAB ============
const RiderTrackerTab = () => {
  const [riders, setRiders] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("adm_riders");
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingLogs, setTrackingLogs] = useState<any[]>([]);

  const fetchRiders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trackingRes, profilesRes, donationsRes] = await Promise.all([
        supabase.from("volunteer_tracking").select("id, volunteer_id, donation_id, status, updated_at, latitude, longitude").order("updated_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, phone"),
        supabase.from("food_donations").select("id, title, location, status")
      ]);
      if (trackingRes.error) throw trackingRes.error;

      const tracking = trackingRes.data || [];
      const profiles = profilesRes.data || [];
      const donations = donationsRes.data || [];

      // Use Maps for O(1) lookups instead of .find()
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      const donationMap = new Map(donations.map(d => [d.id, d]));
      
      const map = new Map<string, any>();
      
      tracking.forEach(t => {
        const key = `${t.volunteer_id}-${t.donation_id}`;
        if (!map.has(key)) {
          const profile = profileMap.get(t.volunteer_id);
          const donation = donationMap.get(t.donation_id);
          
          map.set(key, {
            ...t,
            riderName: profile?.full_name || "Unknown Rider",
            riderPhone: profile?.phone || "",
            donationTitle: donation?.title || "Donation",
            donationLocation: donation?.location || "N/A",
            currentDonationStatus: donation?.status || t.status
          });
        }
      });

      const enriched = Array.from(map.values());
      setRiders(enriched);
      localStorage.setItem("adm_riders", JSON.stringify(enriched));
    } catch (err: any) {
      console.error("fetchRiders error:", err);
      setError(err.message || "Fleet tracking sync failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiders();
    
    // Use a unique channel ID to avoid "already subscribed" errors during rapid remounts
    const channelId = `admin-rider-tracking-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId);
    
    channel
      .on('postgres_changes', { event: '*', table: 'volunteer_tracking' }, () => {
        fetchRiders();
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.log(`Realtime channel status: ${status}`);
        }
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRiders]);

  const activeRiders = useMemo(() => riders.filter(r => r.status && r.status !== 'delivered'), [riders]);
  const completedRiders = useMemo(() => riders.filter(r => r.status === 'delivered').slice(0, 50), [riders]);

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
        <AlertTriangle size={14} /> {error}
      </div>}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Navigation size={20} />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Rider Fleet Operations</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Real-time GPS Tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin text-muted-foreground mr-1" />}
          <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 flex items-center gap-2 py-1 px-3">
             <span className={`w-2 h-2 rounded-full bg-primary ${activeRiders.length > 0 ? 'animate-ping' : ''}`} />
             {activeRiders.length} Active Now
          </Badge>
          <button 
            onClick={fetchRiders}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-all active:scale-95"
          >
            <Eye size={18} />
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="glass-card p-2 h-[350px] relative overflow-hidden mb-6 group">
        {(activeRiders.length > 0 && activeRiders[0].latitude && activeRiders[0].longitude) ? (
          <LeafletMap 
            latitude={activeRiders[0].latitude} 
            longitude={activeRiders[0].longitude} 
            className="rounded-[1.5rem] w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-muted/30 rounded-[1.5rem] flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/50">
             <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4 shadow-inner">
               <Navigation size={32} className="text-muted-foreground/20" />
             </div>
             <h5 className="font-bold text-foreground text-sm uppercase tracking-widest">Global Dispatch Link</h5>
             <p className="text-xs text-muted-foreground font-body mt-2 max-w-[250px]">Wait for active riders with GPS coordinates to appear on the tracking system.</p>
          </div>
        )}
        <div className="absolute top-4 right-4 z-[400]">
           <Badge className="bg-background/90 backdrop-blur-md text-foreground border-border/50 text-[9px] font-bold py-1 shadow-lg">🗺️ Real-time Fleet Map</Badge>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
           <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><Navigation size={20} /></div>
           <div>
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">En Route</p>
             <p className="text-xl font-bold text-foreground">{activeRiders.filter(r => r.status === 'en-route').length}</p>
           </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-orange-500">
           <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500"><MapPin size={20} /></div>
           <div>
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Arrived at Pickup</p>
             <p className="text-xl font-bold text-foreground">{activeRiders.filter(r => r.status === 'arrived').length}</p>
           </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-success">
           <div className="p-3 rounded-xl bg-success/10 text-success"><CheckCircle size={20} /></div>
           <div>
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Last 24h Finish</p>
             <p className="text-xl font-bold text-foreground">{completedRiders.length}</p>
           </div>
        </div>
      </div>

      {/* Live Active Riders Cards */}
      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
        <span className="w-4 h-0.5 bg-primary/30" /> Active Operations
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeRiders.length === 0 ? (
          <div className="col-span-full py-16 bg-muted/30 rounded-[2.5rem] border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
              <Navigation size={32} className="text-muted-foreground/30" />
            </div>
            <h5 className="font-bold text-foreground text-sm">Quiet Hour</h5>
            <p className="text-xs text-muted-foreground font-body mt-1">No riders are currently out on deliveries.</p>
          </div>
        ) : (
          activeRiders.map(rider => (
            <div key={rider.id} className="glass-card-elevated p-5 relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -mr-12 -mt-12 -z-10 group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-110 ${rider.status === 'en-route' ? 'bg-primary' : 'bg-orange-500'}`}>
                    <Navigation size={22} className={rider.status === 'en-route' ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{rider.riderName}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block mt-0.5">ID: {rider.volunteer_id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                   <div className={`w-2.5 h-2.5 rounded-full mb-1 ${rider.status === 'en-route' ? 'bg-blue-500 animate-pulse' : 'bg-orange-500'}`} />
                   <span className="text-[8px] font-black uppercase text-muted-foreground">Live Status</span>
                </div>
              </div>

              <div className="space-y-3 bg-muted/40 p-4 rounded-3xl border border-border/30 backdrop-blur-sm">
                 <div className="flex items-start gap-2.5">
                   <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary" />
                   <div className="flex-1 min-w-0">
                     <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Cargo Information</p>
                     <p className="text-xs font-bold text-foreground truncate leading-tight">{rider.donationTitle}</p>
                     <p className="text-[10px] text-muted-foreground truncate mt-0.5">📌 {rider.donationLocation}</p>
                   </div>
                 </div>
                 
                 <div className="h-px bg-border/50 my-1" />

                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-1.5">
                     <Clock size={12} className="text-primary" />
                     <span className="text-[10px] font-bold text-foreground">
                       Last Sync: {rider.updated_at && !isNaN(new Date(rider.updated_at).getTime()) 
                         ? format(new Date(rider.updated_at), "hh:mm:ss a") 
                         : "Real-time"}
                     </span>
                   </div>
                   <Badge variant="outline" className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-lg ${(rider.status || '').toLowerCase() === 'en-route' ? 'text-blue-600 border-blue-500/20 bg-blue-50' : 'text-orange-600 border-orange-500/20 bg-orange-50'}`}>
                     {(rider.status || 'UNKNOWN').toUpperCase()}
                   </Badge>
                 </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button 
                  onClick={() => window.open(`https://www.google.com/maps?q=${rider.latitude},${rider.longitude}`, '_blank')}
                  className="flex-1 bg-background border border-border rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-primary transition-all flex items-center justify-center gap-1.5"
                >
                  <MapPin size={12} />
                  View Map
                </button>
                <button className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all">
                   <Eye size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Completed Deliveries Logs */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
            <Clock size={16} className="text-muted-foreground" /> RECENT DELIVERY LOGS
          </h3>
          <span className="text-[10px] text-muted-foreground font-mono">Showing last {completedRiders.length} successful tasks</span>
        </div>
        <div className="glass-card rounded-3xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border/50">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-black tracking-wider py-4">Rider</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-wider py-4">Package & Destination</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-wider py-4">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-wider py-4">Completion Time</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-black tracking-wider py-4 pr-6">Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedRiders.map(rider => (
                  <TableRow key={rider.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary border border-primary/10 font-bold text-xs uppercase">
                          {rider.riderName.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-[13px] text-foreground leading-none mb-1">{rider.riderName}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">{rider.riderPhone || 'No contact'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-[200px]">
                        <p className="font-bold text-[13px] text-foreground truncate mb-1">{rider.donationTitle}</p>
                        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                          <MapPin size={8} /> {rider.donationLocation}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-success font-black text-[10px] uppercase tracking-wider bg-success/5 border border-success/10 px-2 py-1 rounded-lg w-fit">
                        <CheckCircle size={10} strokeWidth={3} />
                        Delivered
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-[11px] font-medium text-muted-foreground font-mono">
                      {rider.updated_at && !isNaN(new Date(rider.updated_at).getTime())
                        ? format(new Date(rider.updated_at), "dd MMM · hh:mm a")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <button className="text-[10px] font-black text-primary uppercase hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-all">Verification</button>
                    </TableCell>
                  </TableRow>
                ))}
                {completedRiders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center opacity-30">
                        <Package size={40} className="mb-2" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Log Data Found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ USER MANAGEMENT TAB ============
const UserManagementTab = () => {
  const [users, setUsers] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("adm_users");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterToday, setFilterToday] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const fetchUserActivity = async (userId: string) => {
    setActivityLoading(true);
    const { data } = await supabase
      .from("food_donations")
      .select("*")
      .or(`donor_id.eq.${userId},assigned_volunteer_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    setUserActivity(data || []);
    setActivityLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUser(authData.user);
      
      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("*")
      ]);
      if (rolesRes.error) throw rolesRes.error;

      const roles = rolesRes.data || [];
      const profiles = profilesRes.data || [];

      const rolesMap = new Map(roles.map(r => [r.user_id, r.role]));

      const merged = (profiles).map(p => {
        return { ...p, role: rolesMap.get(p.id) || "user" };
      });
      setUsers(merged);
      localStorage.setItem("adm_users", JSON.stringify(merged));
    } catch (err: any) {
      console.error("fetchUsers error:", err);
      setError(err.message || "Failed to load user records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBlock = async (userId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: !currentStatus })
      .eq("id", userId);
    
    if (error) {
      toast.error("Failed to update status.");
      return;
    }
    
    toast.success(currentStatus ? "User unblocked successfully" : "User blocked from platform");
    fetchUsers();
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        (u.full_name || "").toLowerCase().includes(search.toLowerCase()) || 
        (u.email || "").toLowerCase().includes(search.toLowerCase());
      
      const isToday = u.created_at && new Date(u.created_at).toDateString() === new Date().toDateString();
      const matchesDate = filterToday ? isToday : true;
      const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;

      return matchesSearch && matchesDate && matchesRole;
    });
  }, [users, search, filterToday, roleFilter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center mb-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Users size={18} className="text-primary" /> User Management ({filteredUsers.length})
          {loading && <Loader2 size={14} className="animate-spin text-muted-foreground ml-2" />}
        </h3>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px] h-10 rounded-xl">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="donor">Donors</SelectItem>
              <SelectItem value="volunteer">Volunteers</SelectItem>
              <SelectItem value="ngo">NGOs</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <button 
            onClick={() => setFilterToday(!filterToday)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
              filterToday ? "gradient-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground border-border"
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
        <AlertTriangle size={14} /> {error}
      </div>}

      <div className="flex flex-col gap-3">
        {loading && users.length === 0 ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)
        ) : filteredUsers.map((u) => {
          const isSelf = currentUser?.id === u.id;
          return (
            <div 
              key={u.id} 
              onClick={() => { setSelectedUser(u); fetchUserActivity(u.id); }}
              className={`glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in hover:bg-muted/20 cursor-pointer transition-all ${u.is_blocked ? "opacity-75 bg-destructive/5" : ""}`}
            >
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.is_blocked ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"}`}>
                  {(u.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground text-sm truncate">{u.full_name}</h4>
                    {u.is_blocked && <Badge variant="destructive" className="h-4 text-[8px] px-1.5 font-bold uppercase tracking-widest">Blocked</Badge>}
                    {isSelf && <Badge variant="outline" className="h-4 text-[8px] px-1.5 font-bold border-primary text-primary uppercase tracking-widest">Self</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-body truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] py-0 h-4 uppercase font-black">{u.role || "unknown"}</Badge>
                    <span className="text-[10px] text-muted-foreground font-body font-medium flex items-center gap-1">
                      <Calendar size={10} /> {safeFormat(u.created_at || new Date().toISOString(), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {!isSelf && (
                  <button 
                    onClick={(e) => handleToggleBlock(u.id, !!u.is_blocked, e)}
                    className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                      u.is_blocked 
                        ? "bg-primary text-primary-foreground border-transparent hover:ring-2 hover:ring-primary/20" 
                        : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                    }`}
                  >
                    {u.is_blocked ? "Unblock" : "Block"}
                  </button>
                )}
                <button className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:text-primary transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {(loading || users.length > 0) && filteredUsers.length === 0 && (
          <div className="text-center py-16 glass-card border-dashed border-2 border-border/50">
            <Users size={40} className="mx-auto text-muted-foreground/10 mb-3" />
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No records found</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl animate-scale-in">
          {selectedUser && (
            <div>
              <div className={`p-8 text-white relative ${selectedUser.is_blocked ? "bg-destructive" : "gradient-primary"}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl font-bold text-2xl">
                    {(selectedUser.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <Badge className="bg-white/20 text-white border-none backdrop-blur-md py-1 px-3">
                    {selectedUser.role.toUpperCase()}
                  </Badge>
                </div>
                <h4 className="text-2xl font-black tracking-tight">{selectedUser.full_name}</h4>
                <p className="opacity-70 text-sm font-medium">{selectedUser.email}</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                        <MapPin size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Base Location</p>
                        <p className="text-xs font-bold text-foreground">{selectedUser.address || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                        <Phone size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Phone Number</p>
                        <p className="text-xs font-bold text-foreground">{selectedUser.phone || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-xs font-black text-foreground uppercase tracking-widest">Recent Activity</h5>
                  {activityLoading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading activity...</div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {userActivity.length > 0 ? (
                        userActivity.map(a => (
                          <div key={a.id} className="p-3 bg-muted/20 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-foreground truncate max-w-[150px]">{a.title}</p>
                                <p className="text-[9px] text-muted-foreground">{safeFormat(a.created_at, "dd MMM, hh:mm a")}</p>
                            </div>
                            <Badge variant={a.status === 'delivered' ? 'secondary' : 'outline'} className="text-[9px]">{a.status}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center py-4">No recent activity.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={(e) => { handleToggleBlock(selectedUser.id, !!selectedUser.is_blocked, e); setSelectedUser(null); }}
                    className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                      selectedUser.is_blocked 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-destructive text-white"
                    }`}
                  >
                    {selectedUser.is_blocked ? "Unblock Account" : "Block Account"}
                  </button>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 py-4 rounded-2xl bg-muted text-foreground font-black uppercase text-xs tracking-widest border border-border/50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
