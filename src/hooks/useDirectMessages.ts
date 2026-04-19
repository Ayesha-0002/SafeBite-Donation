import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Conversation = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_message: string;
  last_time: string;
  unread: number;
  donation_id: string | null;
  donation_title: string | null;
  last_message_is_mine: boolean;
  last_message_read: boolean;
};

export type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string | null;
  read: boolean | null;
  donation_id: string | null;
};

export function useConversations(currentUserId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data: msgs } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (!msgs || msgs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convMap = new Map<string, { msgs: typeof msgs; donationId: string | null }>();
    for (const m of msgs) {
      const otherId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, { msgs: [m], donationId: m.donation_id });
      } else {
        convMap.get(otherId)!.msgs.push(m);
      }
    }

    const otherIds = Array.from(convMap.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", otherIds);

    const donationIds = Array.from(new Set(
      Array.from(convMap.values()).map(v => v.donationId).filter(Boolean)
    )) as string[];

    let donationMap: Record<string, string> = {};
    if (donationIds.length > 0) {
      const { data: donations } = await supabase
        .from("food_donations")
        .select("id, title")
        .in("id", donationIds);
      if (donations) {
        donationMap = Object.fromEntries(donations.map(d => [d.id, d.title]));
      }
    }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const convList: Conversation[] = otherIds.map(uid => {
      const { msgs: userMsgs, donationId } = convMap.get(uid)!;
      const latest = userMsgs[0];
      const profile = profileMap.get(uid);
      const unread = userMsgs.filter(m => m.receiver_id === currentUserId && !m.read).length;
      return {
        user_id: uid,
        full_name: profile?.full_name || "User",
        avatar_url: profile?.avatar_url || null,
        last_message: latest.content,
        last_time: latest.created_at || "",
        unread,
        donation_id: donationId,
        donation_title: donationId ? (donationMap[donationId] || null) : null,
        last_message_is_mine: latest.sender_id === currentUserId,
        last_message_read: !!latest.read,
      };
    });

    convList.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
    setConversations(convList);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel("dm-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useChatMessages(currentUserId: string | null, otherUserId: string | null) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!currentUserId || !otherUserId) return;
    setLoading(true);

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    setMessages(data || []);
    setLoading(false);

    // Mark unread as read
    await supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", otherUserId)
      .eq("read", false);
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;
    const channel = supabase
      .channel(`dm-${currentUserId}-${otherUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, otherUserId, fetchMessages]);

  const sendMessage = async (content: string, donationId?: string) => {
    if (!currentUserId || !otherUserId || !content.trim()) return;
    await supabase.from("direct_messages").insert({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: content.trim(),
      donation_id: donationId || null,
    });
  };

  return { messages, loading, sendMessage };
}
