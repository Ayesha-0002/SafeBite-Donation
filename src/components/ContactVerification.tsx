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

  const handleRequestOTP = () => {
    setIsVerifying(true);
    // Simulate sending OTP
    setTimeout(() => {
      setIsVerifying(false);
      setStep("verify");
      toast.success("Security OTP sent to your registered number.");
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
          <DialogTitle className="text-center">Security Verification</DialogTitle>
          <DialogDescription className="text-center">
            {step === "request" 
              ? "To prevent unauthorized calls, a quick OTP verification is required."
              : `Enter the 4-digit code sent to your device.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "verify" && (
            <Input
              type="text"
              placeholder="Enter 4-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="text-center text-2xl tracking-[1em] font-bold"
            />
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          {step === "request" ? (
            <Button 
              onClick={handleRequestOTP} 
              disabled={isVerifying}
              className="w-full gradient-primary"
            >
              {isVerifying && <Loader2 className="animate-spin mr-2" size={18} />}
              Send Security OTP
            </Button>
          ) : (
            <div className="flex flex-col w-full gap-2">
              <Button 
                onClick={handleVerify} 
                disabled={isVerifying || otp.length < 4}
                className="w-full gradient-primary"
              >
                {isVerifying && <Loader2 className="animate-spin mr-2" size={18} />}
                Verify & Proceed
              </Button>
              <Button variant="ghost" onClick={() => setStep("request")} className="text-xs">
                Resend Code
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
