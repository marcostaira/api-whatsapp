import { ConnectionOptions, SendMessageOptions, MessageFilter, ContactFilter, TenantConfig } from "../types/interfaces";
import { Tenant } from "../entities/Tenant";
import { Message } from "../entities/Message";
import { Contact } from "../entities/Contact";
export declare class WhatsAppModule {
    private whatsappService;
    private configService;
    private contactService;
    private messageService;
    private mediaService;
    private webhookService;
    private authService;
    constructor();
    createTenant(data: {
        name: string;
        receiveGroupMessages?: boolean;
        autoReconnect?: boolean;
        webhookUrl?: string;
        settings?: Record<string, any>;
    }): Promise<Tenant>;
    getTenant(tenantId: string): Promise<Tenant | null>;
    updateTenant(tenantId: string, data: Partial<Tenant>): Promise<Tenant | null>;
    deleteTenant(tenantId: string): Promise<boolean>;
    getAllTenants(): Promise<Tenant[]>;
    validateApiKey(apiKey: string): Promise<Tenant | null>;
    createConnection(options: ConnectionOptions): Promise<{
        sessionId: string;
        qrCode?: string;
        pairingCode?: string;
    }>;
    getConnectionStatus(sessionId: string): Promise<{
        isConnected: boolean;
        qrCode?: string;
        pairingCode?: string;
    }>;
    disconnectSession(sessionId: string): Promise<boolean>;
    getAllConnections(tenantId: string): Promise<any[]>;
    getActiveSessions(): Promise<any[]>;
    sendMessage(tenantId: string, sessionId: string, options: SendMessageOptions): Promise<any>;
    getMessages(filter: MessageFilter): Promise<{
        messages: Message[];
        total: number;
    }>;
    getMessage(messageId: string): Promise<Message | null>;
    updateMessageStatus(messageId: string, status: string): Promise<boolean>;
    deleteMessage(messageId: string): Promise<boolean>;
    getMessagesByContact(tenantId: string, contactId: string, limit?: number): Promise<Message[]>;
    getUnreadMessages(tenantId: string): Promise<Message[]>;
    markAsRead(messageId: string): Promise<boolean>;
    searchMessages(tenantId: string, query: string, limit?: number): Promise<Message[]>;
    getMessageStats(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<any>;
    getContacts(filter: ContactFilter): Promise<{
        contacts: Contact[];
        total: number;
    }>;
    getContact(tenantId: string, whatsappId: string): Promise<Contact | null>;
    getContactById(contactId: string): Promise<Contact | null>;
    updateContact(contactId: string, data: Partial<Contact>): Promise<Contact | null>;
    blockContact(tenantId: string, whatsappId: string): Promise<boolean>;
    unblockContact(tenantId: string, whatsappId: string): Promise<boolean>;
    deleteContact(contactId: string): Promise<boolean>;
    searchContacts(tenantId: string, query: string, limit?: number): Promise<Contact[]>;
    getGroupContacts(tenantId: string): Promise<Contact[]>;
    getBusinessContacts(tenantId: string): Promise<Contact[]>;
    saveMedia(buffer: Buffer, mimetype: string, originalName?: string): Promise<{
        filename: string;
        filePath: string;
        size: number;
        thumbnailPath?: string;
    }>;
    getMedia(filePath: string): Promise<Buffer>;
    deleteMedia(filePath: string): Promise<boolean>;
    getMediaInfo(filePath: string, mimetype: string): Promise<any>;
    optimizeImage(filePath: string, quality?: number): Promise<Buffer>;
    resizeImage(filePath: string, width: number, height: number): Promise<Buffer>;
    testWebhook(url: string, tenantId: string): Promise<boolean>;
    validateWebhookUrl(url: string): boolean;
    getTenantProfile(tenantId: string, sessionId: string): Promise<any>;
    updateTenantSettings(tenantId: string, settings: Record<string, any>): Promise<boolean>;
    getTenantConfig(tenantId: string): Promise<TenantConfig | null>;
    sendBulkMessages(tenantId: string, sessionId: string, messages: Array<{
        to: string;
        message: SendMessageOptions;
    }>): Promise<Array<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>>;
    exportMessages(tenantId: string, filter?: MessageFilter): Promise<Message[]>;
    exportContacts(tenantId: string, filter?: ContactFilter): Promise<Contact[]>;
}
