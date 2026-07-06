with open('src/pages/donor/DonorDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace('''  const handleWhatsApp = (phone: string | null) => {
    if (!phone) {
      toast.error("Rider WhatsApp unavailable");
      return;
    }
    const cleanPhone = phone.replace(/\\D/g, "");
    const message = encodeURIComponent(`Assalam o Alaikum, this is regarding the SafeBite food donation. I am the ${profile?.full_name || 'assigned person'}.`);
    window.open(`https://wa.me/${formattedPhone}/?text=${message}`, "_blank");
  };''', '''  const handleWhatsApp = (phone: string | null) => {
    if (!phone) {
      toast.error("Rider WhatsApp unavailable");
      return;
    }
    const cleanPhone = phone.replace(/\\D/g, "");
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      formattedPhone = "92" + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith("92")) {
      formattedPhone = "92" + cleanPhone;
    }
    const message = encodeURIComponent(`Assalam o Alaikum, this is regarding the SafeBite food donation. I am the ${profile?.full_name || 'assigned person'}.`);
    window.open(`https://wa.me/${formattedPhone}/?text=${message}`, "_blank");
  };''')

with open('src/pages/donor/DonorDashboard.tsx', 'w') as f:
    f.write(content)
