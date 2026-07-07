import re

with open("src/pages/volunteer/LiveTracking.tsx", "r") as f:
    content = f.read()

# Update state definition
old_state = "const [ngo, setNgo] = useState<{ full_name: string; address: string | null } | null>(null);"
new_state = "const [ngo, setNgo] = useState<{ full_name: string; address: string | null; phone: string | null } | null>(null);"
content = content.replace(old_state, new_state)

# Update fetch query
old_fetch = 'const { data: ngoProfile } = await supabase.from("profiles").select("full_name, address").eq("id", targetNgoId).single();'
new_fetch = 'const { data: ngoProfile } = await supabase.from("profiles").select("full_name, address, phone").eq("id", targetNgoId).single();'
content = content.replace(old_fetch, new_fetch)

# Update setNgo
old_set = 'setNgo({ full_name: ngoProfile.full_name, address: ngoProfile.address });'
new_set = 'setNgo({ full_name: ngoProfile.full_name, address: ngoProfile.address, phone: ngoProfile.phone });'
content = content.replace(old_set, new_set)

# Update the rendering logic for Donor Contact Card
# We need to find the section rendering the Donor Contact Card and replace it with a dynamic block
old_card = """      {/* Donor Contact Card */}
      {donor && (
        <div className="mx-4 mt-4 glass-card-elevated p-4 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Food Donor</p>
              <h4 className="text-sm font-bold text-foreground">{donor.full_name || "SafeBite Donor"}</h4>
              <p className="text-xs text-muted-foreground font-medium">{donor.phone || "Number stored"}</p>
            </div>
          </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCallDonor}
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 animate-bounce-subtle"
                title="Call Donor"
              >
                <Phone size={18} />
              </button>
              <button 
                onClick={handleWhatsAppDonor}
                className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/20"
                title="WhatsApp Message"
              >
                <MessageCircle size={18} />
              </button>
            </div>
        </div>
      )}"""

new_card = """      {/* Contact Card */}
      {(() => {
        const isHeadingToDropoff = ["in-transit", "arrived-dropoff", "photo-proof", "signature", "delivered"].includes(status);
        const contactTarget = isHeadingToDropoff ? ngo : donor;
        const targetType = isHeadingToDropoff ? "NGO Drop-off" : "Food Donor";
        const targetName = isHeadingToDropoff ? ngo?.full_name || "NGO Location" : donor?.full_name || "SafeBite Donor";
        
        if (!contactTarget) return null;
        
        const handleCall = () => {
          if (contactTarget.phone) window.open(`tel:${contactTarget.phone}`, "_system");
          else toast.error("Phone number not available");
        };

        const handleWhatsApp = () => {
          if (contactTarget.phone) window.open(`https://wa.me/${contactTarget.phone.replace(/[^0-9]/g, '')}`, "_blank");
          else toast.error("WhatsApp not available");
        };

        return (
          <div className="mx-4 mt-4 glass-card-elevated p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{targetType}</p>
                <h4 className="text-sm font-bold text-foreground">{targetName}</h4>
                <p className="text-xs text-muted-foreground font-medium">{contactTarget.phone || "Number stored"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCall}
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 animate-bounce-subtle"
                title={`Call ${targetType}`}
              >
                <Phone size={18} />
              </button>
              <button 
                onClick={handleWhatsApp}
                className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/20"
                title={`WhatsApp ${targetType}`}
              >
                <MessageCircle size={18} />
              </button>
            </div>
          </div>
        );
      })()}"""

content = content.replace(old_card, new_card)

with open("src/pages/volunteer/LiveTracking.tsx", "w") as f:
    f.write(content)
