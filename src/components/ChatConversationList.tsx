import { MessageCircle, CheckCheck, Check } from "lucide-react";
import { Conversation } from "@/hooks/useDirectMessages";
import { formatDistanceToNow } from "date-fns";

type Props = {
  conversations: Conversation[];
  loading: boolean;
  onSelect: (conv: Conversation) => void;
  emptyMessage?: string;
};

const ChatConversationList = ({ conversations, loading, onSelect, emptyMessage }: Props) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircle size={28} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No conversations yet</h3>
        <p className="text-sm text-muted-foreground font-body">
          {emptyMessage || "Messages will appear here when someone contacts you about a donation."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv.user_id}
          onClick={() => onSelect(conv)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors border-b border-border/50 text-left"
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-base">
                {(conv.full_name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            {conv.unread > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full gradient-primary flex items-center justify-center border-2 border-background">
                <span className="text-primary-foreground text-[9px] font-bold">{conv.unread}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className={`font-semibold text-sm truncate ${conv.unread > 0 ? "text-foreground" : "text-foreground/90"}`}>
                {conv.full_name || "User"}
              </span>
              {conv.last_time && (
                <span className={`text-[11px] shrink-0 ml-2 ${conv.unread > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {formatDistanceToNow(new Date(conv.last_time), { addSuffix: true })}
                </span>
              )}
            </div>
            {conv.donation_title && (
              <p className="text-[11px] text-primary font-medium truncate mb-0.5">📦 {conv.donation_title}</p>
            )}
            <div className="flex items-center gap-1">
              {conv.last_message_is_mine && (
                conv.last_message_read ? (
                  <CheckCheck size={14} className="text-primary shrink-0" />
                ) : (
                  <Check size={14} className="text-muted-foreground shrink-0" />
                )
              )}
              <p className={`text-xs truncate font-body ${conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {conv.last_message}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ChatConversationList;
