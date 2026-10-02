import { apiRequest } from "./api";

export type ChatPerson = { _id: string; fullName: string; email?: string; role: string };
export type ChatMessage = { id: string; conversationId: string; senderId: string; senderName?: string; receiverId: string; content: string; isRead: boolean; createdAt: string };
export type ChatConversation = { conversationId: string; person: ChatPerson; lastMessage: ChatMessage; unreadCount: number };

export const getChatPeople = () => apiRequest<ChatPerson[]>("/api/chat/people");
export const getChatConversations = () => apiRequest<ChatConversation[]>("/api/chat/conversations");
export const getChatMessages = (userId: string) => apiRequest<{ conversationId: string; person: ChatPerson; messages: ChatMessage[] }>(`/api/chat/conversations/${encodeURIComponent(userId)}/messages`);
export const sendChatMessage = (userId: string, content: string) => apiRequest<ChatMessage>(`/api/chat/conversations/${encodeURIComponent(userId)}/messages`, { method: "POST", body: JSON.stringify({ content }) });
export const markChatRead = (userId: string) => apiRequest<unknown>(`/api/chat/conversations/${encodeURIComponent(userId)}/read`, { method: "PATCH" });
