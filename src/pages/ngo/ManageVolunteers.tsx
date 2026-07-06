import { useState, useEffect, useCallback } from "react";
import { Users, CheckCircle, XCircle, ArrowLeft, Loader2, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import { Home, Package, User } from "lucide-react";

const ngoNav = [
  { icon: Home, label: "Home", path: "/ngo" },
  { icon: Package, label: "Requests", path: "/ngo/requests" },
  { icon: Users, label: "Team", path: "/ngo/volunteers" },
  { icon: User, label: "Profile", path: "/ngo/profile" },
];

const ManageVolunteers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch pending requests for this NGO
      const { data: joinData, error: joinError } = await supabase
        .from("rider_join_requests")
        .select("*, profiles:rider_id(*)")
        .eq("ngo_id", user?.id)
        .eq("status", "pending");

      if (joinError) throw joinError;
      
      setRequests(joinData || []);
    } catch (err: any) {
      console.error("Error fetching volunteer requests:", err);
      toast.error("Failed to load volunteer requests");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const handleAction = async (requestId: string, riderId: string, status: "accepted" | "rejected") => {
    setProcessingId(requestId);
    try {
      await supabase
        .from("rider_join_requests")
        .update({ status })
        .eq("id", requestId)
        .throwOnError();

      if (status === "accepted") {
        await Promise.all([
          supabase
            .from("profiles")
            .update({ 
              is_approved: true, 
              ngo_id: user?.id,
              role: "volunteer"
            })
            .eq("id", riderId)
            .throwOnError(),
          supabase
            .from("user_roles")
            .upsert({ 
              user_id: riderId, 
              role: "volunteer" 
            })
            .throwOnError()
        ]);

        await supabase.from("notifications").insert({
          user_id: riderId,
          title: "Application Approved! 🎉",
          message: "You have been approved and added to the NGO's team.",
          type: "success"
        });
      } else {
        await supabase.from("notifications").insert({
          user_id: riderId,
          title: "Application Rejected",
          message: "Your application to join the NGO was not approved.",
          type: "error"
        });
      }

      toast.success(status === "accepted" ? "Volunteer approved!" : "Volunteer rejected.");
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err: any) {
      console.error(`Error ${status} volunteer:`, err);
      toast.error(`Failed to ${status} volunteer.`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mobile-container pb-24 bg-slate-50 min-h-screen">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 pt-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/ngo')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={18} className="text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Manage Team</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : requests.length > 0 ? (
          requests.map(req => (
            <div key={req.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                  {req.profiles?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{req.profiles?.full_name || "Unknown Rider"}</h3>
                  <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
                    <Phone size={12} />
                    <span>{req.profiles?.phone || "No phone"}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Applied {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleAction(req.id, req.rider_id, "rejected")}
                  disabled={processingId === req.id}
                  className="flex-1 h-10 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Reject
                </button>
                <button
                  onClick={() => handleAction(req.id, req.rider_id, "accepted")}
                  disabled={processingId === req.id}
                  className="flex-1 h-10 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  {processingId === req.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  Approve
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Pending Requests</h3>
            <p className="text-sm text-slate-500">You don't have any pending rider join requests at the moment.</p>
          </div>
        )}
      </div>

      <BottomNav items={ngoNav} />
    </div>
  );
};

export default ManageVolunteers;
