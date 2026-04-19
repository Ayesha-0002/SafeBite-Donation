import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, Clock, Sparkles, X, CheckCircle, AlertTriangle, Bell, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const PostFood = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"form" | "ai-check" | "done">("form");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [aiResult, setAiResult] = useState<{ quality: string; freshness: string; score: number; safe: boolean } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    quantity: "",
    location: "",
    pickupDay: "today",
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
      runAiAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runAiAnalysis = async (imageData: string) => {
    setIsAnalyzing(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-food-check", {
        body: { image: imageData },
      });
      if (error) throw error;
      setAiResult({
        quality: data.quality_label || "Unknown",
        freshness: data.freshness || "Unknown",
        score: data.quality_score || 0,
        safe: data.safe ?? false,
      });
    } catch {
      // AI check failed — do not allow fallback; block submission
      toast.error("AI food quality check failed. Please try again.");
      setAiResult(null);
    }
    setIsAnalyzing(false);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const fileName = `${user.id}/${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage.from("food-images").upload(fileName, imageFile);
    if (error) { console.error("Upload error:", error); return null; }
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImage) { fileInputRef.current?.click(); return; }
    if (!aiResult?.safe) return;

    setStep("ai-check");
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const imageUrl = await uploadImage();

      const { error } = await supabase.from("food_donations").insert({
        donor_id: user.id,
        title: form.title,
        quantity: parseInt(form.quantity) || 1,
        location: form.location,
        pickup_day: form.pickupDay,
        notes: form.notes,
        image_url: imageUrl,
        ai_quality_score: aiResult.score,
        ai_quality_label: aiResult.quality,
        ai_freshness: aiResult.freshness,
        ai_safe: aiResult.safe,
        status: "posted",
      });

      if (error) throw error;
      setStep("done");
    } catch (err: any) {
      toast.error(err.message || "Failed to post donation");
      setStep("form");
    }
    setIsSubmitting(false);
  };

  if (step === "ai-check") {
    return (
      <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center page-padding">
        <div className="glass-card-elevated p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse-dot">
            <Sparkles size={28} className="text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Uploading & Verifying</h2>
          <p className="text-sm text-muted-foreground font-body mb-4">Saving donation & notifying volunteers...</p>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-full gradient-primary rounded-full animate-[slide-up_2s_ease-in-out]" style={{ width: "90%" }} />
          </div>
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
          <h2 className="text-xl font-bold text-foreground mb-2">Food Verified & Posted!</h2>
          <p className="text-sm text-muted-foreground font-body mb-4">AI has verified the quality. Your donation is now live.</p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Notifications Sent!</span>
            </div>
            <div className="text-xs text-muted-foreground font-body space-y-1">
              <p>✅ Nearby volunteers notified</p>
              <p>✅ Registered NGOs alerted</p>
              <p>✅ Admin dashboard updated</p>
            </div>
          </div>
          <button onClick={() => navigate("/donor")} className="w-full py-3 rounded-xl font-semibold text-primary-foreground gradient-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Post Donation</h1>
      </div>

      <form onSubmit={handleSubmit} className="page-padding flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
            <Camera size={14} /> Capture Food Photo <span className="text-destructive">*</span>
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
          {!capturedImage ? (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-44 rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors gap-2">
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
                <Camera size={24} className="text-primary-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Tap to Open Camera</p>
              <p className="text-xs text-muted-foreground font-body">AI will analyze food quality instantly</p>
            </button>
          ) : (
            <div className="relative">
              <img src={capturedImage} alt="Captured food" className="w-full h-44 object-cover rounded-2xl" />
              <button type="button" onClick={() => { setCapturedImage(null); setAiResult(null); setImageFile(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                <X size={16} className="text-foreground" />
              </button>
              {isAnalyzing && (
                <div className="absolute inset-0 rounded-2xl bg-background/80 backdrop-blur flex flex-col items-center justify-center gap-2">
                  <Loader2 size={28} className="text-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">AI Analyzing Food Quality...</p>
                  <p className="text-xs text-muted-foreground font-body">Checking freshness, packaging, safety</p>
                </div>
              )}
            </div>
          )}
          {aiResult && !isAnalyzing && (
            <div className={`mt-3 rounded-xl p-4 border ${aiResult.safe ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                {aiResult.safe ? <CheckCircle size={18} className="text-primary" /> : <AlertTriangle size={18} className="text-destructive" />}
                <span className="text-sm font-bold text-foreground">AI Quality Score: {aiResult.score}/100</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-body">
                <div><span className="text-muted-foreground">Quality:</span><span className="ml-1 font-medium text-foreground">{aiResult.quality}</span></div>
                <div><span className="text-muted-foreground">Status:</span><span className={`ml-1 font-medium ${aiResult.safe ? "text-primary" : "text-destructive"}`}>{aiResult.safe ? "Safe to Donate" : "Unsafe"}</span></div>
              </div>
              <p className="text-xs text-muted-foreground font-body mt-2">🕐 {aiResult.freshness}</p>
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
            {["today", "tomorrow", "day after"].map((day) => (
              <button key={day} type="button" onClick={() => setForm({ ...form, pickupDay: day })} className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${form.pickupDay === day ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions..." rows={3} className="w-full px-4 py-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm resize-none" />
        </div>

        <button type="submit" disabled={!aiResult?.safe || isSubmitting} className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground gradient-primary transition-all hover:opacity-90 active:scale-[0.98] mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <Sparkles size={18} />
          {!capturedImage ? "Capture Photo First" : !aiResult?.safe ? "AI Verification Required" : "Post & Notify Volunteers"}
        </button>
      </form>
    </div>
  );
};

export default PostFood;
