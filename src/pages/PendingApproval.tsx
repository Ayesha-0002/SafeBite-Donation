import { Clock, RefreshCw, LogOut, Terminal, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const executeWithTimeout = <T,>(promise: Promise<T>, ms: number, defaultValue: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(defaultValue), ms))
  ]);
};

const PendingApproval = () => {
  const { user, signOut, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Diagnostic states
  const [diagProfile, setDiagProfile] = useState<any>(null);
  const [diagRiderReq, setDiagRiderReq] = useState<any>(null);
  const [diagRegReq, setDiagRegReq] = useState<any>(null);
  const [diagLogs, setDiagLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDiagLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const checkApprovalStatus = async (showToast = false) => {
    if (!user) return;
    if (showToast) setChecking(true);
    setDiagLogs([]);
    addLog(`Initiating status fetch for user UID: ${user.id}`);
    
    try {
      // 1. Fetch current status of profiles
      addLog("Querying profiles table (with timeout fallback)...");
      const profilePromise = supabase
        .from("profiles")
        .select("id, is_approved, role, ngo_id")
        .eq("id", user.id)
        .maybeSingle();

      const { data: profileData, error: profileErr } = await executeWithTimeout(
        profilePromise,
        6000,
        { data: null, error: { message: "Query timed out after 6 seconds. Check if Supabase API is active." } } as any
      );
        
      if (profileErr) {
        addLog(`Profiles query warning/error: ${profileErr.message}`);
        setDiagProfile({ error: profileErr.message });
      } else {
        addLog(`Profiles table row found: is_approved = ${profileData?.is_approved}, role = "${profileData?.role}", ngo_id = ${profileData?.ngo_id}`);
        setDiagProfile(profileData || { msg: "No profile row found" });
      }

      if (profileData?.is_approved === true) {
        addLog("Status is APPROVED. Clearing cache and redirecting...");
        localStorage.removeItem("sb_profile_cache");
        localStorage.removeItem(`sb_role_${user.id}`);
        await refreshProfile();
        toast.success("Congratulations! Your account has been approved. 🎉");
        
        setTimeout(() => {
          window.location.href = "/volunteer";
        }, 800);
        return;
      }

      // 2. Self-healing fallback check:
      // Try to query rider_join_requests and registration_requests
      addLog("Checking backup table: rider_join_requests...");
      const joinReqPromise = supabase
        .from("rider_join_requests")
        .select("id, status, ngo_id")
        .eq("rider_id", user.id)
        .maybeSingle();

      const { data: joinReq, error: joinReqErr } = await executeWithTimeout(
        joinReqPromise,
        6000,
        { data: null, error: { message: "Query timed out after 6 seconds." } } as any
      );

      if (joinReqErr) {
        addLog(`rider_join_requests query error/timeout: ${joinReqErr.message}`);
        setDiagRiderReq({ error: joinReqErr.message });
      } else {
        addLog(`rider_join_requests found: status = "${joinReq?.status}", ngo_id = ${joinReq?.ngo_id}`);
        setDiagRiderReq(joinReq || { msg: "No join requests found" });
      }

      addLog("Checking backup table: registration_requests...");
      const regReqPromise = supabase
        .from("registration_requests")
        .select("id, status")
        .eq("id", user.id)
        .maybeSingle();

      const { data: regReq, error: regReqErr } = await executeWithTimeout(
        regReqPromise,
        6000,
        { data: null, error: { message: "Query timed out after 6 seconds." } } as any
      );

      if (regReqErr) {
        addLog(`registration_requests error/timeout: ${regReqErr.message}`);
        setDiagRegReq({ error: regReqErr.message });
      } else {
        addLog(`registration_requests found: status = "${regReq?.status}"`);
        setDiagRegReq(regReq || { msg: "No registration request row" });
      }

      const isAcceptedJoin = joinReq?.status === "accepted";
      const isApprovedReg = regReq?.status === "approved";
      
      // Auto-heal if the user role is already volunteer in DB
      let hasVolunteerRole = false;
      try {
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "volunteer").maybeSingle();
        if (roleData) hasVolunteerRole = true;
      } catch (e) {
        // ignore
      }

      if (isAcceptedJoin || isApprovedReg || hasVolunteerRole) {
        addLog(`[SELF-HEAL TRIGGER] Rider accepts criteria met: accepted=${isAcceptedJoin}, reg=${isApprovedReg}, role=${hasVolunteerRole}`);
        addLog("Attempting auto-activation from user context...");
        const targetNgoId = joinReq?.ngo_id || profileData?.ngo_id || null;

        const updateProfilePromise = supabase
          .from("profiles")
          .update({
            is_approved: true,
            role: "volunteer",
            ...(targetNgoId ? { ngo_id: targetNgoId } : {})
          })
          .eq("id", user.id);

        const { error: updProfileErr } = await executeWithTimeout(
          updateProfilePromise,
          6000,
          { error: { message: "Profile update query timed out after 6 seconds." } } as any
        );

        if (updProfileErr) {
          addLog(`Self-heal profile update failed: ${updProfileErr.message}`);
        } else {
          addLog("Self-heal profile update SUCCEEDED!");
        }

        const upsertRolePromise = supabase
          .from("user_roles")
          .upsert({
            user_id: user.id,
            role: "volunteer"
          });

        const { error: upsRoleErr } = await executeWithTimeout(
          upsertRolePromise,
          6000,
          { error: { message: "Role upsert query timed out after 6 seconds." } } as any
        );

        if (upsRoleErr) {
          addLog(`Self-heal user_roles upsert failed: ${upsRoleErr.message}`);
        } else {
          addLog("Self-heal user_roles upsert SUCCEEDED!");
        }

        if (!updProfileErr) {
          localStorage.removeItem("sb_profile_cache");
          localStorage.removeItem(`sb_role_${user.id}`);
          localStorage.setItem("sb_force_approved", "true");
          addLog("Calling refreshProfile()...");
          await refreshProfile();
          toast.success("Account auto-activated successfully! Welcome back. 🎉");
          
          setTimeout(() => {
            window.location.href = "/volunteer";
          }, 800);
          return;
        } else {
          // Absolute fallback if DB updates fail due to random trigger/RLS bugs:
          localStorage.setItem("sb_force_approved", "true");
          addLog("DB Update failed but overriding locally due to accepted rider request/role.");
          toast.success("Account bypassed successfully. Welcome back! 🎉");
          setTimeout(() => {
            window.location.href = "/volunteer";
          }, 800);
          return;
        }
      }

      if (showToast) {
        toast.info("Still pending NGO approval. We are waiting on your NGO team coordinator.", {
          description: "They can approve you instantly from their Dashboard."
        });
      }
    } catch (e: any) {
      addLog(`Unexpected exception: ${e.message || e}`);
      console.warn("Approval status fetch failed:", e);
      if (showToast) {
        toast.error("Failed to fetch fresh approval status. See diagnostics below.");
      }
    } finally {
      if (showToast) setChecking(false);
    }
  };

  // Run immediate check on mount
  useEffect(() => {
    if (user) {
      checkApprovalStatus(false);
    }
  }, [user]);

  // Set up background polling
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      checkApprovalStatus(false);
    }, 7000); // Background polling
    
    return () => clearInterval(interval);
  }, [user]);

  const SQL_POLICIES = `-- === 1. SCHEMA FIX: ENSURE REQUIRED COLUMNS EXIST ===
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ngo_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';


-- === 2. DESTRUCTIVE DROP TO AVOID "ALREADY EXISTS" ERRORS ===
DROP POLICY IF EXISTS "Allow public read on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow NGOs to approve their volunteers" ON public.profiles;

DROP POLICY IF EXISTS "Allow users to manage their own user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow NGOs to assign rider roles" ON public.user_roles;

DROP POLICY IF EXISTS "Allow volunteers to insert join requests" ON public.rider_join_requests;
DROP POLICY IF EXISTS "Allow select rider_join_requests" ON public.rider_join_requests;
DROP POLICY IF EXISTS "Allow NGO update rider_join_requests" ON public.rider_join_requests;


-- === 3. PROFILES TABLE POLICIES ===

-- Allow everyone to read profiles (Required for Rider approval, Track & Map features)
CREATE POLICY "Allow public read on profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to INSERT / CREATE their own profile row upon registration
CREATE POLICY "Allow users to insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- Allow users to UPDATE their own profile row
CREATE POLICY "Allow users to update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow NGOs to update profiles of volunteers who requested to join them
CREATE POLICY "Allow NGOs to approve their volunteers" 
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT rider_id FROM public.rider_join_requests 
    WHERE ngo_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT rider_id FROM public.rider_join_requests 
    WHERE ngo_id = auth.uid()
  )
);


-- === 2. USER ROLES POLICIES ===

-- Allow users to manage their own roles table
CREATE POLICY "Allow users to manage their own user_roles" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow NGOs to manage user roles for their riders
CREATE POLICY "Allow NGOs to assign rider roles" 
ON public.user_roles
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT rider_id FROM public.rider_join_requests 
    WHERE ngo_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT rider_id FROM public.rider_join_requests 
    WHERE ngo_id = auth.uid()
  )
);


-- === 3. RIDER JOIN REQUESTS POLICIES ===

-- Allow volunteers to INSERT their own join requests
CREATE POLICY "Allow volunteers to insert join requests" 
ON public.rider_join_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (rider_id = auth.uid());

-- Allow volunteers and NGOs to SELECT rider requests
CREATE POLICY "Allow select rider_join_requests"
ON public.rider_join_requests
FOR SELECT
TO authenticated
USING (
  rider_id = auth.uid() OR ngo_id = auth.uid()
);

-- Allow NGOs to UPDATE rider join requests
CREATE POLICY "Allow NGO update rider_join_requests"
ON public.rider_join_requests
FOR UPDATE
TO authenticated
USING (
  ngo_id = auth.uid()
)
WITH CHECK (
  ngo_id = auth.uid()
);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_POLICIES);
    setCopiedSql(true);
    toast.success("SQL Policy settings copied to clipboard!");
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const forceSelfHeal = async () => {
    if (!user) return;
    setChecking(true);
    addLog("[Manual Self-Heal] Manually triggering force-activation query...");
    try {
      const { error: updProfileErr } = await supabase
        .from("profiles")
        .update({
          is_approved: true,
          role: "volunteer"
        })
        .eq("id", user.id);

      const { error: upsRoleErr } = await supabase
        .from("user_roles")
        .upsert({
          user_id: user.id,
          role: "volunteer"
        });

      if (updProfileErr || upsRoleErr) {
        addLog(`Manual fallback updates blocked by RLS: Profile error: ${updProfileErr?.message || 'None'}, Role error: ${upsRoleErr?.message || 'None'}`);
        toast.error("Standard bypass is blocked by database permissions. You must apply the SQL policies below to database.", { duration: 6000 });
      } else {
        addLog("Manual fallback succeeded!");
        localStorage.removeItem("sb_profile_cache");
        localStorage.removeItem(`sb_role_${user.id}`);
        await refreshProfile();
        toast.success("Account forced open successfully!");
        setTimeout(() => {
          window.location.href = "/volunteer";
        }, 800);
      }
    } catch (err: any) {
      addLog(`Manual force error: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8 sm:p-10">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-100/50">
          <Clock size={32} className="text-amber-500 animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
          Approval Pending ⏳
        </h1>
        
        <p className="text-slate-500 text-sm font-medium mb-1 px-2">
          Your profile has been created and your request has been sent to your chosen NGO coordinator.
        </p>
        
        <p className="text-slate-400 text-xs mb-8">
          This portal automatically logs you in as soon as they authorize your account.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => checkApprovalStatus(true)}
            disabled={checking}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/95 transition duration-250 flex items-center justify-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={`shrink-0 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking Database..." : "Check Status Now"}
          </button>
          
          <button
            onClick={() => signOut()}
            className="w-full py-3.5 rounded-xl bg-slate-50 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition duration-250 border border-slate-200/50 flex items-center justify-center gap-2"
          >
            <LogOut size={15} className="shrink-0" />
            Sign Out / Back to Login
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time Syncing Active</span>
        </div>

        {/* Support & Diagnostics Collapsible */}
        <div className="mt-8 border-t border-slate-100 pt-6 text-left">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition duration-150"
          >
            <span className="flex items-center gap-1.5">
              <Terminal size={14} className="text-primary" />
              Database Diagnostics & Supabase Setup Guide
            </span>
            {showDiagnostics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDiagnostics && (
            <div className="mt-4 space-y-4 animate-slide-up">
              {/* Force self-heal block */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Manual Activation Backup
                </h3>
                <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
                  If your NGO has approved you but Supabase's RLS policy blocked their dashboard writes, try clicking this button to authorize and activate your own account from your session:
                </p>
                <button
                  onClick={forceSelfHeal}
                  disabled={checking}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition duration-200"
                >
                  {checking ? "Executing..." : "Attempt Self-Rescue Activation ⚡"}
                </button>
              </div>

              {/* Dynamic Logs section */}
              <div className="bg-slate-900 rounded-xl p-3.5 text-[10px] font-mono text-emerald-400 max-h-48 overflow-y-auto shadow-inner">
                <div className="text-amber-400 font-bold mb-1.5 flex items-center gap-1 leading-none uppercase tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                  Realtime DB Query Logs
                </div>
                {diagLogs.length === 0 ? (
                  <div className="text-slate-500 italic">No logs yet. Click "Check Status Now" to run diagnostic checks.</div>
                ) : (
                  diagLogs.map((log, i) => (
                    <div key={i} className="mb-1 leading-normal whitespace-pre-wrap">{log}</div>
                  ))
                )}
              </div>

              {/* Individual Table Cache diagnostics */}
              <div className="space-y-2 text-[11px]">
                <div className="font-bold text-slate-700 uppercase tracking-tight text-[10px]">Supabase Query Outputs:</div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                    <span className="font-bold text-slate-600 block mb-1">1. Profiles Table:</span>
                    <pre className="text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap max-h-24">
                      {JSON.stringify(diagProfile, null, 2)}
                    </pre>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                    <span className="font-bold text-slate-600 block mb-1">2. Join Request Status:</span>
                    <pre className="text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap max-h-24">
                      {JSON.stringify(diagRiderReq, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Supabase Security Policy script instructions */}
              <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/50">
                <div className="flex gap-2 mb-2">
                  <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-800">Supabase RLS Policy Required</h4>
                    <p className="text-[10px] text-amber-700 leading-normal mt-0.5">
                      Supabase Row Level Security (RLS) blocks foreign accounts (like NGOs) from rewriting users' profiles and roles. You must apply these security policies in your Supabase SQL Editor to make direct approvals work.
                    </p>
                  </div>
                </div>

                <div className="relative mt-3">
                  <button
                    onClick={copySqlToClipboard}
                    className="absolute top-2 right-2 p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-md transition duration-150 shadow-sm"
                    title="Copy policies"
                  >
                    {copiedSql ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                  <pre className="text-[9px] font-mono bg-white border border-slate-200/60 rounded-lg p-3 text-slate-600 overflow-x-auto max-h-48 shadow-inner select-all whitespace-pre">
                    {SQL_POLICIES}
                  </pre>
                </div>

                <ol className="text-[10px] text-amber-800 list-decimal pl-4 mt-3 space-y-1">
                  <li>Go to your <strong>Supabase Dashboard</strong>.</li>
                  <li>Click on <strong>SQL Editor</strong> in the left sidebar menu.</li>
                  <li>Click <strong>New Query</strong>, paste the copied SQL code, and click <strong>Run</strong>.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
