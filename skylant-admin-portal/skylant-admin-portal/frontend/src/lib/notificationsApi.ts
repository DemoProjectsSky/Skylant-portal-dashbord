import { apiRequest } from "./api";

export type AppNotification = { id: string; type: string; title: string; message?: string; entityType?: string; entityId?: string; sender?: { _id: string; fullName?: string }; readAt?: string | null; createdAt: string; metadata?: { conversationId?: string; messageId?: string; navigationPath?: string; fileName?: string; action?: string } };
export type NotificationsResponse = { notifications: AppNotification[]; unreadCount: number };

export const getNotifications = () => apiRequest<NotificationsResponse>("/api/notifications");
export const markNotificationRead = (id: string) => apiRequest<AppNotification>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
