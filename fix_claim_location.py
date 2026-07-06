with open("src/pages/ngo/NgoDashboard.tsx", "r") as f:
    content = f.read()

import re

# Add dropoff_location to update in handleAcceptDonation
handle_accept_old = """  const handleAcceptDonation = async (donationId: string) => {
    if (!user) return;
    setClaiming(true);
    try {
      const { error } = await supabase.from("food_donations").update({
        status: "accepted",
        ngo_verified_by: user.id,
        ngo_verified_at: new Date().toISOString(),
      }).eq("id", donationId);"""

handle_accept_new = """  const handleAcceptDonation = async (donationId: string) => {
    if (!user) return;
    
    if (!dropoffLocation.trim()) {
      toast.error("Please specify a drop-off location for the rider.");
      return;
    }
    
    setClaiming(true);
    try {
      const { error } = await supabase.from("food_donations").update({
        status: "accepted",
        ngo_verified_by: user.id,
        ngo_verified_at: new Date().toISOString(),
        dropoff_location: dropoffLocation.trim(),
      }).eq("id", donationId);"""

content = content.replace(handle_accept_old, handle_accept_new)

# Find where the user opens the dialog to reset dropoffLocation
handle_open_claim_old = """setClaimDialog(d)"""
handle_open_claim_new = """setClaimDialog(d); setDropoffLocation(userProfile?.address || "");"""
# Wait, userProfile is not readily available, let's just reset to "" or find a place to reset it.
# Actually, I can just find `setClaimDialog` in the file.

# Find the UI for claimDialog and add the input field
ui_old = """              {/* Informational Warning (Now in Clean English) */}
              <div className="flex items-start gap-3 bg-primary/5 p-3.5 rounded-2xl border border-primary/10">
                <CheckCircle size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  Confirming this claim will instantly reserve the food donation for your NGO. You will need to assign a volunteer rider to coordinate and handle the pickup.
                </p>
              </div>"""

ui_new = """              {/* Drop-off Location Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Drop-off Location *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin size={14} className="text-muted-foreground/60" />
                  </div>
                  <input
                    type="text"
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    placeholder="Enter full address for the rider..."
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                    required
                  />
                </div>
              </div>

              {/* Informational Warning (Now in Clean English) */}
              <div className="flex items-start gap-3 bg-primary/5 p-3.5 rounded-2xl border border-primary/10">
                <CheckCircle size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                  Confirming this claim will instantly reserve the food donation for your NGO. You will need to assign a volunteer rider to coordinate and handle the pickup.
                </p>
              </div>"""

content = content.replace(ui_old, ui_new)

# Make sure we reset dropoffLocation when dialog opens
reset_old = """onClick={() => setClaimDialog(d)}"""
reset_new = """onClick={() => { setClaimDialog(d); setDropoffLocation(""); }}"""
content = content.replace(reset_old, reset_new)

with open("src/pages/ngo/NgoDashboard.tsx", "w") as f:
    f.write(content)
