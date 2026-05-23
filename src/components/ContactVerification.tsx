import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface ContactVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  phoneNumber: string;
}

export const ContactVerification: React.FC<ContactVerificationProps> = ({ 
  isOpen, 
  onClose, 
  onVerified, 
  phoneNumber 
}) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");

  const handleRequestOTP = (method: "sms" | "whatsapp") => {
    setIsVerifying(true);
    // Simulate sending OTP
    setTimeout(() => {
      setIsVerifying(false);
      setStep("verify");
      toast.success(method === "whatsapp" ? "Security OTP sent to your WhatsApp." : "Security OTP sent to your registered number.");
    }, 1500);
  };

  const handleVerify = () => {
    if (otp === "1234") { // Demo OTP
      setIsVerifying(true);
      setTimeout(() => {
        setIsVerifying(false);
        toast.success("Identity Verified!");
        onVerified();
        onClose();
        setStep("request");
        setOtp("");
      }, 1000);
    } else {
      toast.error("Invalid OTP. Try '1234' for demo.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="text-primary" size={24} />
          </div>
          <DialogTitle className="text-center font-black">Security Verification</DialogTitle>
          <DialogDescription className="text-center">
            {step === "request" 
              ? "To prevent unauthorized calls, identity verification is required."
              : `Enter the code sent to your device via WhatsApp/SMS.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "verify" && (
            <Input
              type="text"
              placeholder="1234"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center text-2xl tracking-[0.5em] font-black h-14 rounded-2xl border-2 border-primary/20 focus:border-primary"
            />
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          {step === "request" ? (
            <div className="flex flex-col w-full gap-3">
              <Button 
                onClick={() => handleRequestOTP("whatsapp")} 
                disabled={isVerifying}
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold h-12 rounded-xl border-none shadow-lg shadow-[#25D366]/20"
              >
                {isVerifying ? <Loader2 className="animate-spin mr-2" size={18} /> : <span className="mr-2">💬</span>}
                Send OTP via WhatsApp
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleRequestOTP("sms")} 
                disabled={isVerifying}
                className="w-full font-bold h-12 rounded-xl border-2"
              >
                Send via Standard SMS
              </Button>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-3">
              <Button 
                onClick={handleVerify} 
                disabled={isVerifying || otp.length < 4}
                className="w-full gradient-primary font-black h-12 rounded-xl"
              >
                {isVerifying && <Loader2 className="animate-spin mr-2" size={18} />}
                Verify & Proceed
              </Button>
              <button onClick={() => setStep("request")} className="text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary transition-colors">
                Resend Verification Code
              </button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
