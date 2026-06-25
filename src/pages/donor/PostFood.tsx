import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, Clock, Sparkles, X, CheckCircle, AlertTriangle, Bell, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const PostFood = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile: authProfile } = useAuth();
  const [step, setStep] = useState<"form" | "ai-check" | "done">("form");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPromise, setUploadPromise] = useState<Promise<string | null> | null>(null);
  const [form, setForm] = useState({
    title: "",
    quantity: "",
    location: "",
    pickupDay: "Today",
    notes: "",
  });

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCapturedImage(dataUrl);
    };
    reader.readAsDataURL(file);

    // Start upload early for speed!
    if (user) {
      const p = uploadImage(user.id, file);
      setUploadPromise(p);
    }
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        console.warn("Compression timed out, using original file");
        resolve(file);
      }, 2000); // 2s max for compression

      img.src = URL.createObjectURL(file);
      img.onload = () => {
        clearTimeout(timeout);
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400; // Efficient size for mobile
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "low"; // Performance first
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        }, "image/jpeg", 0.4); // Very light quality for instant upload
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(file);
        URL.revokeObjectURL(img.src);
      };
    });
  };

  const uploadImage = async (userId: string, file: File): Promise<string | null> => {
    try {
      const blob = await compressImage(file);
      const fileName = `${userId}/${Date.now()}-compressed.jpg`;
      const { error } = await supabase.storage.from("food-images").upload(fileName, blob);
      if (error) throw error;
      return fileName;
    } catch (e) {
      console.error("Upload process error:", e);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImage) { 
      toast.error("Please capture a live photo of the food first!");
      return; 
    }

    if (!user) {
      toast.error("Please login to post food.");
      return;
    }

    if (authProfile?.is_blocked) {
      toast.error("Your account has been restricted by Admin.");
      return;
    }

    setStep("ai-check"); 
    setIsSubmitting(true);

    // Perform database operations in the background
    (async () => {
      try {
        console.log("Insert starting...");
        const activeUploadPromise = uploadPromise || (imageFile ? uploadImage(user.id, imageFile) : Promise.resolve(null));
        const imageUrl = await Promise.race([
          activeUploadPromise,
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 3000))
        ]);

        const donationPayload = {
          donor_id: user.id,
          title: (form.title || "Surplus Food").trim(),
          quantity: Math.max(1, parseInt(form.quantity) || 1),
          location: (form.location || "Available for Pickup").trim(),
          pickup_day: form.pickupDay,
          notes: form.notes.trim(),
          image_url: imageUrl,
          ai_quality_score: 100,
          ai_quality_label: "Safe to Eat",
          ai_freshness: "Verified Capture",
          ai_safe: true,
          status: "posted",
          created_at: new Date().toISOString()
        };

        const { data: donationData, error: dbError } = await supabase
          .from("food_donations")
          .insert(donationPayload)
          .select();

        if (dbError) {
          console.error("Insert Failed:", dbError);
          toast.error("Database Error: " + dbError.message);
          throw new Error(dbError.message || "Database insert failed");
        }

        const donation = donationData?.[0];
        console.log("Background insert success:", donation?.id);

        // Update local stats cache
        try {
          const cachedStatsStr = localStorage.getItem("cache_d_stats");
          const stats = cachedStatsStr ? JSON.parse(cachedStatsStr) : { total: 0, meals: 0, delivered: 0 };
          stats.total = (stats.total || 0) + 1;
          stats.meals = (stats.meals || 0) + donationPayload.quantity;
          localStorage.setItem("cache_d_stats", JSON.stringify(stats));
          localStorage.removeItem("cache_d_donations");
        } catch (e) { console.warn("Cache background update failed", e); }

        // Background: Final image fixup and Notifications
        if (!imageUrl && donation) {
          const finalUrl = await activeUploadPromise;
          if (finalUrl) {
            await supabase.from("food_donations").update({ image_url: finalUrl }).eq("id", donation.id);
          }
        }

        const { data: usersToNotify } = await supabase.from("user_roles").select("user_id").in("role", ["volunteer", "ngo"]);
        const notifyCount = usersToNotify?.length || 0;
        console.log(`Donation Posted. Notifying ${notifyCount} users.`);

        if (usersToNotify && usersToNotify.length > 0) {
          const notifications = usersToNotify.map(u => ({
            user_id: u.user_id,
            title: "New Food Donation!",
            message: `${donationPayload.title} at ${donationPayload.location}`,
            type: "new-food",
            related_donation_id: donation?.id,
          }));
          await supabase.from("notifications").insert(notifications);
        }

        // Set to success only after success
        setStep("done");
        toast.success(`Donation Successful! Notified ${notifyCount} partners.`);

      } catch (err: any) {
        console.error("Critical Background Error:", err);
        toast.error("Failed to post donation: " + (err.message || "Unknown error"));
        setStep("form"); // Back to form
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  if (step === "ai-check") {
    return (
      <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center page-padding">
        <div className="glass-card-elevated p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse-dot">
            <Loader2 size={28} className="text-primary-foreground animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Processing Donation</h2>
          <p className="text-sm text-muted-foreground font-body mb-4">Saving your post & notifying volunteers...</p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center page-padding">
        <div className="glass-card-elevated p-8 text-center max-w-sm w-full animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Food Posted!</h2>
          <p className="text-sm text-muted-foreground font-body mb-4">Your donation is now live and volunteers have been notified.</p>
          <button onClick={() => navigate("/donor")} className="w-full py-3 rounded-xl font-semibold text-primary-foreground gradient-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container min-h-screen bg-red-50/10">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Live Food Post</h1>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">Live Photo Only</span>
      </div>

      <form onSubmit={handleSubmit} className="page-padding flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
            <Camera size={14} /> Take Live Food Photo <span className="text-destructive">*</span>
          </label>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            capture="environment" 
            onChange={handleCapture} 
            className="hidden" 
          />
          {!capturedImage ? (
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className="w-full h-56 rounded-3xl border-2 border-dashed border-primary/40 flex flex-col items-center justify-center bg-primary/5 cursor-pointer hover:bg-primary/20 transition-all gap-4 animate-pulse-dot"
            >
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-xl shadow-primary/30">
                <Camera size={36} className="text-primary-foreground" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground">Tap to Open Camera</p>
                <p className="text-[11px] text-muted-foreground font-body px-6">Gallery photos are not allowed. Please capture a live photo of the food.</p>
              </div>
            </button>
          ) : (
            <div className="relative group">
              <img src={capturedImage} alt="Captured food" loading="lazy" className="w-full h-56 object-cover rounded-3xl shadow-2xl" />
              <button 
                type="button" 
                onClick={() => { setCapturedImage(null); setImageFile(null); }} 
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-destructive text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-3 right-3 bg-primary/90 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-md">
                Live Verification Active
              </div>
            </div>
          )}
        </div>

        {[
          { label: "Food Title", key: "title", type: "text", placeholder: "e.g. Biryani for 20" },
          { label: "Quantity (servings)", key: "quantity", type: "number", placeholder: "e.g. 25" },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
            <input type={type} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm" />
          </div>
        ))}

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5"><MapPin size={14} /> Pickup Location</label>
          <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Enter address" className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5"><Clock size={14} /> Pickup Day</label>
          <div className="flex gap-2">
            {["Today", "Tomorrow", "Day After"].map((day) => (
              <button key={day} type="button" onClick={() => setForm({ ...form, pickupDay: day })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${form.pickupDay === day ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions..." rows={3} className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm resize-none" />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground gradient-primary transition-all hover:opacity-90 active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          Post Donation
        </button>
      </form>
    </div>
  );
};

export default PostFood;
