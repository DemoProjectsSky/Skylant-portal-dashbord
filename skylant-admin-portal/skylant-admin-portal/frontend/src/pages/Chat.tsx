import { useEffect, useState, type FormEvent } from "react";
import { MessageCircle, RefreshCw, Search, Send } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { getChatConversations, getChatMessages, getChatPeople, markChatRead, sendChatMessage, type ChatConversation, type ChatMessage, type ChatPerson } from "../lib/chatApi";
import "./chat.css";

const relativeTime = (value: string) => { const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return `${seconds}s ago`; if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`; return `${Math.round(seconds / 3600)}h ago`; };

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedConversation = searchParams.get("conversation");
  const [people, setPeople] = useState<ChatPerson[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatPerson | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refresh = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [availablePeople, availableConversations] = await Promise.all([getChatPeople(), getChatConversations()]);
      setPeople(availablePeople); setConversations(availableConversations);
      const conversation = availableConversations.find((item) => item.conversationId === requestedConversation);
      const person = conversation?.person || (selected ? availablePeople.find((item) => item._id === selected._id) : null) || availablePeople[0];
      if (person) { setSelected(person); const detail = await getChatMessages(person._id); setMessages(detail.messages); await markChatRead(person._id); }
    } catch { setError("Unable to load chat. Please try again."); }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(true), 5000); return () => window.clearInterval(timer); }, [requestedConversation]);
  const choose = async (person: ChatPerson) => {
    setSelected(person); const id = conversations.find((item) => item.person._id === person._id)?.conversationId; if (id) setSearchParams({ conversation: id });
    try { const detail = await getChatMessages(person._id); setMessages(detail.messages); await markChatRead(person._id); setConversations((current) => current.map((item) => item.person._id === person._id ? { ...item, unreadCount: 0 } : item)); } catch { setError("Unable to open this conversation."); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || !content.trim()) return; setSending(true);
    try { const message = await sendChatMessage(selected._id, content.trim()); setMessages((current) => [...current, message]); setContent(""); void refresh(true); } catch { setError("Unable to send message."); } finally { setSending(false); }
  };
  const visiblePeople = people.filter((person) => person.fullName.toLowerCase().includes(query.toLowerCase()) || person.email?.toLowerCase().includes(query.toLowerCase()));

  return <div className="module-page chat-page"><div className="page-heading-row"><div><span className="page-kicker">ACTIVITY</span><h2>Team chat</h2><p>Private messages for managers and sales executives.</p></div><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} /> Refresh</button></div>{error ? <div className="daily-report-error">{error}<button onClick={() => void refresh()}>Retry</button></div> : null}<section className="chat-layout panel"><aside className="chat-people"><label className="table-search"><Search size={16} /><input placeholder="Search people..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>{loading ? <div className="empty-state-panel"><strong>Loading conversations...</strong></div> : visiblePeople.length ? visiblePeople.map((person) => { const conversation = conversations.find((item) => item.person._id === person._id); return <button className={`chat-person ${selected?._id === person._id ? "active" : ""}`} key={person._id} onClick={() => void choose(person)}><span className="avatar avatar-blue">{person.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><span><strong>{person.fullName}</strong><small>{conversation?.lastMessage?.content || person.role.replace("_", " ")}</small></span>{conversation?.unreadCount ? <b>{conversation.unreadCount}</b> : null}</button>; }) : <div className="empty-state-panel"><MessageCircle size={25} /><strong>No chat participants</strong><span>Active managers and sales executives appear here.</span></div>}</aside><div className="chat-window">{selected ? <><div className="chat-window-head"><div className="avatar avatar-blue">{selected.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><strong>{selected.fullName}</strong><span>{selected.role.replace("_", " ")}</span></div></div><div className="messages">{messages.length ? messages.map((message) => <div className={`chat-message ${message.senderId === selected._id ? "incoming" : "outgoing"}`} key={message.id}><p>{message.content}</p><small>{relativeTime(message.createdAt)}</small></div>) : <div className="empty-state-panel"><MessageCircle size={25} /><strong>No messages yet</strong><span>Send the first message to start this conversation.</span></div>}</div><form className="chat-composer" onSubmit={submit}><input placeholder={`Message ${selected.fullName}...`} value={content} onChange={(event) => setContent(event.target.value)} /><button className="primary-button" disabled={sending || !content.trim()}><Send size={16} /> Send</button></form></> : <div className="empty-state-panel"><MessageCircle size={28} /><strong>Select a conversation</strong><span>Choose a manager or sales executive to start chatting.</span></div>}</div></section></div>;
}
