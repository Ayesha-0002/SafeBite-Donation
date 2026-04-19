import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import { useChatMessages } from "@/hooks/useDirectMessages";
import { format, isToday, isYesterday } from "date-fns";

type Props = {
  currentUserId: string;
  otherUserId: string;
  otherName: string;
  donationId?: string | null;
  donationTitle?: string | null;
  onBack: () => void;
};

const formatMessageTime = (dateStr: string | null) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return format(date, "h:mm a");
};

const formatDateSeparator = (dateStr: string | null) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
};

const shouldShowDateSeparator = (current: string | null, previous: string | null) => {
  if (!current) return false;
  if (!previous) return true;
  const currentDate = new Date(current).toDateString();
  const previousDate = new Date(previous).toDateString();
  return currentDate !== previousDate;
};

const ChatThread = ({ currentUserId, otherUserId, otherName, donationId, donationTitle, onBack }: Props) => {
  const { messages, loading, sendMessage } = useChatMessages(currentUserId, otherUserId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input, donationId || undefined);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - WhatsApp style */}
      <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">{(otherName || "U").charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground truncate">{otherName}</h2>
          {donationTitle && <p className="text-xs text-primary font-body truncate">📦 {donationTitle}</p>}
        </div>
      </div>

      {/* Messages area - WhatsApp style background */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1 bg-muted/30">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center mt-8">
            <div className="inline-block bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm">
              <p className="text-muted-foreground text-sm font-body">Start a conversation! 👋</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === currentUserId;
            const showDate = shouldShowDateSeparator(
              msg.created_at,
              idx > 0 ? messages[idx - 1].created_at : null
            );

            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="bg-card/90 backdrop-blur-sm text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Message bubble */}
                <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                  <div
                    className={`max-w-[78%] px-3 py-2 text-sm font-body shadow-sm ${
                      isMine
                        ? "gradient-primary text-primary-foreground rounded-2xl rounded-br-md"
                        : "bg-card text-foreground rounded-2xl rounded-bl-md border border-border/50"
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                      <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {isMine && (
                        msg.read ? (
                          <CheckCheck size={14} className="text-primary-foreground/80" />
                        ) : (
                          <Check size={14} className="text-primary-foreground/60" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div className="px-3 py-2.5 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatThread;
