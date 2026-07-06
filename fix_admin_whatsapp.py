with open('src/pages/admin/AdminDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace('''  const handleWhatsApp = (phone: string | null, name: string = "User") => {
    if (!phone) {
      toast.error("Phone number not available");
      return;
    }
    const cleanPhone = phone.replace(/\\D/g, "");
    const message = encodeURIComponent(`Assalam o Alaikum ${name}, this is SafeBite Administration.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };''', '''  const handleWhatsApp = (phone: string | null, name: string = "User") => {
    if (!phone) {
      toast.error("Phone number not available");
      return;
    }
    const cleanPhone = phone.replace(/\\D/g, "");
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      formattedPhone = "92" + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith("92")) {
      formattedPhone = "92" + cleanPhone;
    }
    const message = encodeURIComponent(`Assalam o Alaikum ${name}, this is SafeBite Administration.`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
  };''')

with open('src/pages/admin/AdminDashboard.tsx', 'w') as f:
    f.write(content)
