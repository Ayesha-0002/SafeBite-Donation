import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Shield, Users, AlertTriangle, CheckCircle, XCircle, Bell, LayoutDashboard, Sparkles, UserCog, LogOut, Loader2, Package, Search, Star, FileText, TrendingUp, MapPin, Calendar, Utensils } from "lucide-react";
import logo from "@/assets/rizq-logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const tabs = ["Statistics", "Donor Analytics", "NGO Logs", "Registration Requests", "User Management"] as const;

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
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white border border-white/30 shadow-lg">
              <Utensils size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-primary-foreground">SafeBite Admin</span>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {[
              { icon: LayoutDashboard, label: "Statistics", tab: "Statistics" as const },
              { icon: TrendingUp, label: "Donor Analytics", tab: "Donor Analytics" as const },
              { icon: FileText, label: "NGO Logs", tab: "NGO Logs" as const },
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
  if (activeTab === "Statistics") return <StatisticsTab />;
  if (activeTab === "Donor Analytics") return <DonorAnalyticsTab />;
  if (activeTab === "NGO Logs") return <NgoLogsTab />;
  if (activeTab === "Registration Requests") return <RegistrationRequestsTab />;
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
        rejected: d.filter(x => x.status === "rejected").length,
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
          { value: stats.rejected, label: "Rejected / Unsafe", icon: AlertTriangle, color: "text-destructive" },
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
  const [detailsDialog, setDetailsDialog] = useState<any | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const [donationsRes, profilesRes, ratingsRes] = await Promise.all([
        supabase.from("food_donations").select("*").order("created_at", { ascending: false }),
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
            pending: 0,
            donations: []
          };
        }
        const donor = donorMap[d.donor_id];
        donor.totalPosts++;
        donor.donations.push(d);
        if (d.status === "delivered") donor.delivered++;
        else if (d.status === "rejected") donor.rejected++;
        else donor.pending++;
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
              <TableHead className="text-center">Pending</TableHead>
              <TableHead className="text-center">Rejected</TableHead>
              <TableHead className="text-center">Avg Rating</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => setDetailsDialog(d)}>
                  {d.name}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.email}</TableCell>
                <TableCell className="text-center font-bold">{d.totalPosts}</TableCell>
                <TableCell className="text-center"><Badge variant="secondary" className="bg-primary/10 text-primary">{d.delivered}</Badge></TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5">{d.pending}</Badge></TableCell>
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
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No donors found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
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
                    <span>Avg Rating: <b>{getAvgRating(detailsDialog.id) || "N/A"}</b></span>
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
                          const dateStr = format(new Date(r.created_at || new Date()), "dd MMM");
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
                            <span className="flex items-center gap-1"><MapPin size={10} /> {dn.location}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Calendar size={10} /> {format(new Date(dn.created_at), "dd MMM yyyy")}</span>
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

// ============ USER MANAGEMENT TAB ============
const UserManagementTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterToday, setFilterToday] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = async () => {
    const { data: authData } = await supabase.auth.getUser();
    setCurrentUser(authData.user);
    
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: profiles } = await supabase.from("profiles").select("*");
    const merged = (profiles || []).map(p => {
      const role = (roles || []).find(r => r.user_id === p.id);
      return { ...p, role: role?.role || "user" };
    });
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: !currentStatus })
      .eq("id", userId);
    
    if (error) {
      toast.error("Failed to update status. Please ensure 'is_blocked' column exists in profiles table.");
      return;
    }
    
    toast.success(currentStatus ? "User unblocked successfully" : "User blocked from platform");
    fetchUsers();
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
        u.email?.toLowerCase().includes(search.toLowerCase());
      
      const isToday = u.created_at && new Date(u.created_at).toDateString() === new Date().toDateString();
      const matchesDate = filterToday ? isToday : true;
      const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;

      return matchesSearch && matchesDate && matchesRole;
    });
  }, [users, search, filterToday, roleFilter]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center mb-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Users size={18} className="text-primary" /> User Management ({filteredUsers.length})
        </h3>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px] h-10">
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
              className="pl-9 h-10"
            />
          </div>
          <button 
            onClick={() => setFilterToday(!filterToday)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              filterToday ? "gradient-primary text-primary-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
            }`}
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredUsers.map((u) => {
          const isSelf = currentUser?.id === u.id;
          return (
            <div key={u.id} className={`glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in ${u.is_blocked ? "opacity-75 bg-destructive/5" : ""}`}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.is_blocked ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"}`}>
                  {(u.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground text-sm truncate">{u.full_name}</h4>
                    {u.is_blocked && <Badge variant="destructive" className="h-5 text-[9px] px-1.5 font-bold">BLOCKED</Badge>}
                    {isSelf && <Badge variant="outline" className="h-5 text-[9px] px-1.5 font-bold border-primary text-primary">YOU</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-body truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] py-0 h-4 uppercase font-bold">{u.role}</Badge>
                    <span className="text-[10px] text-muted-foreground font-body font-medium flex items-center gap-1">
                      <Calendar size={10} /> {u.created_at ? format(new Date(u.created_at), "dd MMM yyyy") : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {!isSelf && (
                  <button 
                    onClick={() => handleToggleBlock(u.id, !!u.is_blocked)}
                    className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-sm ${
                      u.is_blocked 
                        ? "bg-primary text-primary-foreground border-transparent hover:ring-2 hover:ring-primary/20" 
                        : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                    }`}
                  >
                    {u.is_blocked ? "Unblock Account" : "Block Account"}
                  </button>
                )}
                {isSelf && (
                  <p className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-3 py-1 rounded-lg italic">
                    Administrative Access
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {filteredUsers.length === 0 && (
          <div className="text-center py-16 glass-card">
            <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No users found matching filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
