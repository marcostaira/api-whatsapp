import { WASocket } from "@whiskeysockets/baileys";
export interface WhatsAppConnection {
    socket: WASocket;
    tenantId: string;
    sessionId: string;
    isConnected: boolean;
    qrCode?: string;
    pairingCode?: string;
}
export interface TenantConfig {
    id: string;
    name: string;
    apiKey: string;
    receiveGroupMessages: boolean;
    autoReconnect: boolean;
    webhookUrl?: string;
    settings?: Record<string, any>;
}
export interface SendMessageOptions {
    to?: string;
    type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "location" | "contact";
    content?: string;
    media?: {
        data: Buffer | string;
        mimetype: string;
        filename?: string;
        caption?: string;
    };
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    contact?: {
        name: string;
        phone: string;
        email?: string;
    };
    quotedMessage?: string;
}
export interface WebhookPayload {
    tenantId: string;
    sessionId: string;
    event: string;
    data: any;
    timestamp: Date;
}
export interface ConnectionOptions {
    tenantId: string;
    usePairingCode?: boolean;
    phoneNumber?: string;
}
export interface MessageFilter {
    tenantId?: string;
    contactId?: string;
    type?: string;
    direction?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
}
export interface BulkMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export interface ContactFilter {
    tenantId?: string;
    isGroup?: boolean;
    isBlocked?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}
