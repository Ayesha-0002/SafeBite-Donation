import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { RotateCcw, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void;
  onClear?: () => void;
}

const SignaturePad = ({ onSave, onClear }: SignaturePadProps) => {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleSave = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const base64 = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      onSave(base64);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-primary/30 rounded-xl overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="#1a1a2e"
          canvasProps={{
            className: "w-full h-40",
            style: { width: "100%", height: "160px" },
          }}
          onBegin={() => setIsEmpty(false)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 py-2.5 rounded-xl font-medium text-foreground bg-muted flex items-center justify-center gap-2 text-sm"
        >
          <RotateCcw size={14} /> Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1 py-2.5 rounded-xl font-semibold text-primary-foreground gradient-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <Check size={14} /> Confirm Signature
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
