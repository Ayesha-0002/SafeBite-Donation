import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Shield, Users, AlertTriangle, CheckCircle, XCircle, Bell, LayoutDashboard, Sparkles, UserCog, LogOut, Loader2, Package, Search, Star, FileText, TrendingUp, MapPin, Calendar } from "lucide-react";
import logo from "@/assets/rizq-logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const tabs = ["Statistics", "Donor Analytics", "NGO Logs", "Registration Requests", "AI Fraud Detection", "User Management"] as const;

const COLORS = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(220, 70%, 50%)"];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Statistics");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <aside className="w-64 gradient-dark min-h-screen p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <img src={logo} alt="Logo" className="w-8 h-8" />
            <span className="text-lg font-bold text-primary-foreground">SafeBite Admin</span>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {[
              { icon: LayoutDashboard, label: "Statistics", tab: "Statistics" as const },
              { icon: TrendingUp, label: "Donor Analytics", tab: "Donor Analytics" as const },
              { icon: FileText, label: "NGO Logs", tab: "NGO Logs" as const },
              { icon: UserCog, label: "Registrations", tab: "Registration Requests" as const },
              { icon: Sparkles, label: "AI Fraud Detection", tab: "AI Fraud Detection" as const },
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
          <button onClick={() => navigate("/")} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-foreground/60 hover:text-primary-foreground">
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
              <Shield size={24} className="text-primary-foreground" />
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
  if (activeTab === "Statistics") return <StatisticsTab />;
  if (activeTab === "Donor Analytics") return <DonorAnalyticsTab />;
  if (activeTab === "NGO Logs") return <NgoLogsTab />;
  if (activeTab === "Registration Requests") return <RegistrationRequestsTab />;
  if (activeTab === "AI Fraud Detection") return <FraudDetectionTab />;
  return <UserManagementTab />;
};

// ============ STATISTICS TAB (with real-time stat cards) ============
const StatisticsTab = () => {
  const [stats, setStats] = useState({ total: 0, delivered: 0, posted: 0, rejected: 0, activeNgos: 0 });
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [donationsRes, rolesRes] = await Promise.all([
        supabase.from("food_donations").select("*"),
        supabase.from("user_roles").select("*"),
      ]);
      const d = donationsRes.data || [];
      const roles = rolesRes.data || [];
      setDonations(d);
      setStats({
        total: d.length,
        delivered: d.filter(x => x.status === "delivered").length,
        posted: d.filter(x => x.status === "posted").length,
        rejected: d.filter(x => !x.ai_safe).length,
        activeNgos: roles.filter(r => r.role === "volunteer").length,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statusPieData = [
    { name: "Delivered", value: stats.delivered },
    { name: "Posted", value: stats.posted },
    { name: "Rejected", value: stats.rejected },
    { name: "Other", value: Math.max(0, stats.total - stats.delivered - stats.posted - stats.rejected) },
  ].filter(d => d.value > 0);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = days.map((day, i) => {
    const dayDonations = donations.filter(d => new Date(d.created_at).getDay() === i);
    return { day, donations: dayDonations.length, delivered: dayDonations.filter(d => d.status === "delivered").length };
  });

  const qualityData = [
    { range: "90-100", count: donations.filter(d => d.ai_quality_score && d.ai_quality_score >= 90).length },
    { range: "80-89", count: donations.filter(d => d.ai_quality_score && d.ai_quality_score >= 80 && d.ai_quality_score < 90).length },
    { range: "70-79", count: donations.filter(d => d.ai_quality_score && d.ai_quality_score >= 70 && d.ai_quality_score < 80).length },
    { range: "<70", count: donations.filter(d => d.ai_quality_score && d.ai_quality_score < 70).length },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div>
      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { value: stats.total, label: "Total Food Donations", icon: Package, color: "text-primary" },
          { value: stats.delivered, label: "Successful Deliveries", icon: CheckCircle, color: "text-primary" },
          { value: stats.activeNgos, label: "Active NGOs/Volunteers", icon: Users, color: "text-secondary" },
          { value: stats.posted, label: "Active / Posted", icon: Bell, color: "text-secondary" },
          { value: stats.rejected, label: "AI Rejected", icon: AlertTriangle, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <s.icon size={20} className={s.color} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground text-center">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-4">
          <h3 className="font-semibold text-foreground mb-3">📊 Donation Status</h3>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No donation data yet</p>
          )}
        </div>

        <div className="glass-card p-4">
          <h3 className="font-semibold text-foreground mb-3">📈 Weekly Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="donations" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="delivered" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-4">
        <h3 className="font-semibold text-foreground mb-3">🤖 AI Quality Score Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={qualityData}>
            <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============ DONOR ANALYTICS TAB ============
const DonorAnalyticsTab = () => {
  const [donorData, setDonorData] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingDialog, setRatingDialog] = useState<{ userId: string; name: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const [donationsRes, profilesRes, ratingsRes] = await Promise.all([
        supabase.from("food_donations").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("donation_ratings").select("*"),
      ]);
      const donations = donationsRes.data || [];
      const profiles = profilesRes.data || [];
      const allRatings = ratingsRes.data || [];
      setRatings(allRatings);

      // Group by donor
      const donorMap: Record<string, any> = {};
      donations.forEach(d => {
        if (!donorMap[d.donor_id]) {
          const profile = profiles.find(p => p.id === d.donor_id);
          donorMap[d.donor_id] = {
            id: d.donor_id,
            name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            totalPosts: 0,
            delivered: 0,
            rejected: 0,
          };
        }
        donorMap[d.donor_id].totalPosts++;
        if (d.status === "delivered") donorMap[d.donor_id].delivered++;
        if (!d.ai_safe) donorMap[d.donor_id].rejected++;
      });

      setDonorData(Object.values(donorMap).sort((a, b) => b.totalPosts - a.totalPosts));
      setLoading(false);
    };
    fetch();
  }, []);

  const getAvgRating = (userId: string) => {
    const userRatings = ratings.filter(r => r.rated_user_id === userId);
    if (userRatings.length === 0) return null;
    return (userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length).toFixed(1);
  };

  const handleSubmitRating = async () => {
    if (!ratingDialog) return;
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
    donorData.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase())),
    [donorData, search]
  );

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" /> Donor Analytics
        </h3>
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search donors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donor Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Total Posts</TableHead>
              <TableHead className="text-center">Delivered</TableHead>
              <TableHead className="text-center">Rejected</TableHead>
              <TableHead className="text-center">Avg Rating</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.email}</TableCell>
                <TableCell className="text-center font-bold">{d.totalPosts}</TableCell>
                <TableCell className="text-center"><Badge variant="secondary" className="bg-primary/10 text-primary">{d.delivered}</Badge></TableCell>
                <TableCell className="text-center"><Badge variant="destructive">{d.rejected}</Badge></TableCell>
                <TableCell className="text-center">
                  {getAvgRating(d.id) ? (
                    <span className="flex items-center justify-center gap-1 text-sm font-semibold">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" /> {getAvgRating(d.id)}
                    </span>
                  ) : <span className="text-muted-foreground text-xs">N/A</span>}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={() => { setRatingDialog({ userId: d.id, name: d.name }); setRatingValue(5); }}
                    className="text-xs px-3 py-1 rounded-lg gradient-primary text-primary-foreground font-medium"
                  >
                    ⭐ Rate
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No donors found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
const NgoLogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      const [donationsRes, profilesRes] = await Promise.all([
        supabase.from("food_donations").select("*").not("ngo_verified_by", "is", null),
        supabase.from("profiles").select("*"),
      ]);
      const donations = donationsRes.data || [];
      const profiles = profilesRes.data || [];

      const enriched = donations.map(d => {
        const donor = profiles.find(p => p.id === d.donor_id);
        const ngo = profiles.find(p => p.id === d.ngo_verified_by);
        return {
          ...d,
          donorName: donor?.full_name || "Unknown",
          ngoName: ngo?.full_name || "Unknown",
        };
      });
      setLogs(enriched);
      setLoading(false);
    };
    fetch();
  }, []);

  const locations = useMemo(() => [...new Set(logs.map(l => l.location))], [logs]);

  const filtered = useMemo(() => {
    let result = logs;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => l.donorName.toLowerCase().includes(s) || l.ngoName.toLowerCase().includes(s) || l.title.toLowerCase().includes(s));
    }
    if (locationFilter !== "all") result = result.filter(l => l.location === locationFilter);
    if (dateFilter !== "all") {
      const now = new Date();
      if (dateFilter === "today") result = result.filter(l => new Date(l.ngo_verified_at).toDateString() === now.toDateString());
      if (dateFilter === "week") result = result.filter(l => (now.getTime() - new Date(l.ngo_verified_at).getTime()) < 7 * 86400000);
      if (dateFilter === "month") result = result.filter(l => (now.getTime() - new Date(l.ngo_verified_at).getTime()) < 30 * 86400000);
    }
    return result;
  }, [logs, search, locationFilter, dateFilter]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <FileText size={18} className="text-primary" /> NGO Receiving Logs
      </h3>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or food item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <MapPin size={14} className="mr-1" />
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[150px]">
            <Calendar size={14} className="mr-1" />
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
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
            {filtered.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.title}</TableCell>
                <TableCell>{l.donorName}</TableCell>
                <TableCell>{l.ngoName}</TableCell>
                <TableCell className="text-sm"><span className="flex items-center gap-1"><MapPin size={12} className="text-muted-foreground" />{l.location}</span></TableCell>
                <TableCell className="text-center">{l.quantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.ngo_verified_at ? format(new Date(l.ngo_verified_at), "dd MMM yyyy, hh:mm a") : "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary">Verified ✓</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No NGO receiving logs found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// ============ REGISTRATION REQUESTS TAB ============
const RegistrationRequestsTab = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    const { data } = await supabase.from("registration_requests").select("*").order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <UserCog size={18} className="text-primary" /> Registration Requests
      </h3>
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No registration requests</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="glass-card-elevated p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-foreground">{r.full_name}</h4>
                  <p className="text-xs text-muted-foreground font-body">{r.requested_role.toUpperCase()} · CNIC: {r.cnic}</p>
                  <p className="text-xs text-muted-foreground font-body">📞 {r.phone}</p>
                  {r.address && <p className="text-xs text-muted-foreground font-body">📍 {r.address}</p>}
                  {r.organization && <p className="text-xs text-muted-foreground font-body">🏢 {r.organization}</p>}
                  {r.reason && <p className="text-xs text-muted-foreground font-body mt-1">"{r.reason}"</p>}
                </div>
                <span className={r.status === "approved" ? "badge-verified" : r.status === "rejected" ? "badge-fraud" : "px-2 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary"}>
                  {r.status}
                </span>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAction(r.id, "approved")} className="flex-1 py-2 rounded-xl font-semibold text-primary-foreground gradient-primary text-sm flex items-center justify-center gap-1">
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button onClick={() => handleAction(r.id, "rejected")} className="flex-1 py-2 rounded-xl font-semibold text-destructive-foreground bg-destructive text-sm flex items-center justify-center gap-1">
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

// ============ FRAUD DETECTION TAB ============
const FraudDetectionTab = () => {
  const [flagged, setFlagged] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("food_donations").select("*").order("created_at", { ascending: false });
      setFlagged(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/food-images/${url}`;
  };

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Shield size={18} className="text-primary" /> AI Food Quality Monitor
      </h3>
      <div className="flex flex-col gap-3">
        {flagged.map((a) => (
          <div key={a.id} className="food-card flex items-center gap-3 p-3">
            {getImageUrl(a.image_url) ? (
              <img src={getImageUrl(a.image_url)!} alt={a.title} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Package size={20} className="text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm">{a.title}</h4>
              <p className="text-xs text-muted-foreground font-body">Score: {a.ai_quality_score ?? "N/A"}/100 · {a.ai_quality_label ?? "Pending"}</p>
              <p className="text-xs text-muted-foreground font-body">{a.ai_freshness ?? ""}</p>
            </div>
            <span className={a.ai_safe ? "badge-verified" : "badge-fraud"}>{a.ai_safe ? "Safe ✓" : "Unsafe ✗"}</span>
          </div>
        ))}
        {flagged.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No donations to review</p>}
      </div>
    </div>
  );
};

// ============ USER MANAGEMENT TAB ============
const UserManagementTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: profiles } = await supabase.from("profiles").select("*");
      const merged = (roles || []).map(r => {
        const profile = (profiles || []).find(p => p.id === r.user_id);
        return { ...r, full_name: profile?.full_name || "Unknown", email: profile?.email || "" };
      });
      setUsers(merged);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Users size={18} className="text-primary" /> Active Users ({users.length})
      </h3>
      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {(u.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">{u.full_name}</h4>
                <p className="text-xs text-muted-foreground font-body">{u.role} · {u.email}</p>
              </div>
            </div>
            <span className="badge-verified">{u.role}</span>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No users with roles yet</p>}
      </div>
    </div>
  );
};

export default AdminDashboard;
