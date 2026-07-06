with open('src/pages/ngo/NgoDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace('''  const handleAcceptDonation = async (donationId: string) => {
    if (!user) return;
    setClaiming(true);
    try {
      const { error } = await supabase.from("food_donations").update({
        status: "accepted",
        ngo_verified_by: user.id,
        ngo_verified_at: new Date().toISOString(),
      }).eq("id", donationId);''', '''  const handleAcceptDonation = async (donationId: string) => {
    if (!dropoffLocation.trim()) {
      toast.error("Please enter a drop-off location");
      return;
    }
    if (!user) return;
    setClaiming(true);
    try {
      const { error } = await supabase.from("food_donations").update({
        status: "accepted",
        ngo_verified_by: user.id,
        ngo_verified_at: new Date().toISOString(),
        dropoff_location: dropoffLocation.trim(),
      }).eq("id", donationId);''')

content = content.replace('''              {/* Informational Warning (Now in Clean English) */}''', '''              {/* Dropoff Location Input */}
              <div className="text-left mt-3">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 block">Drop-off Location *</label>
                <input
                  type="text"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  placeholder="Enter drop-off address"
                  className="w-full px-3 py-2 rounded-xl bg-muted/20 border border-border/40 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Informational Warning (Now in Clean English) */}''')

content = content.replace('''onClick={() => setClaimDialog(d)}''', '''onClick={() => {
                            setClaimDialog(d);
                            setDropoffLocation("");
                          }}''')

with open('src/pages/ngo/NgoDashboard.tsx', 'w') as f:
    f.write(content)
