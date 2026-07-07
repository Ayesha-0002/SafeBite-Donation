import re

with open("src/pages/volunteer/LiveTracking.tsx", "r") as f:
    content = f.read()

# Remove handleCallDonor and handleWhatsAppDonor
old_handlers = """  const handleCallDonor = () => {
    if (donor?.phone) {
      window.open(`tel:${donor.phone}`, "_system");
    } else {
      toast.error("Phone number not available");
    }
  };

  const handleWhatsAppDonor = () => {
    if (donor?.phone) {
      window.open(`https://wa.me/${donor.phone.replace(/[^0-9]/g, '')}`, "_blank");
    } else {
      toast.error("WhatsApp not available");
    }
  };"""

content = content.replace(old_handlers, "")

with open("src/pages/volunteer/LiveTracking.tsx", "w") as f:
    f.write(content)
