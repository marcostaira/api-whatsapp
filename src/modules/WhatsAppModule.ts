import { WhatsAppService } from "../services/WhatsAppService";
import { ConfigService } from "../services/ConfigService";
import { ContactService } from "../services/ContactService";
import { MessageService } from "../services/MessageService";
import { MediaService } from "../services/MediaService";
import { WebhookService } from "../services/WebhookService";
import { AuthService } from "../services/AuthService";
import {
  ConnectionOptions,
  SendMessageOptions,
  MessageFilter,
  ContactFilter,
  TenantConfig,
  BulkMessageResult,
} from "../types/interfaces";
import { Tenant } from "../entities/Tenant";
import { Message } from "../entities/Message";
import { Contact } from "../entities/Contact";

export class WhatsAppModule {
  private whatsappService: WhatsAppService;
  private configService: ConfigService;
  private contactService: ContactService;
  private messageService: MessageService;
  private mediaService: MediaService;
  private webhookService: WebhookService;
  private authService: AuthService;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.configService = new ConfigService();
    this.contactService = new ContactService();
    this.messageService = new MessageService();
    this.mediaService = new MediaService();
    this.webhookService = new WebhookService();
    this.authService = new AuthService();
  }

  // === TENANT MANAGEMENT ===
  async createTenant(data: {
    name: string;
    receiveGroupMessages?: boolean;
    autoReconnect?: boolean;
    webhookUrl?: string;
    settings?: Record<string, any>;
  }): Promise<Tenant> {
    return await this.configService.createTenant(data);
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return await this.configService.getTenant(tenantId);
  }

  async updateTenant(
    tenantId: string,
    data: Partial<Tenant>
  ): Promise<Tenant | null> {
    return await this.configService.updateTenant(tenantId, data);
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    return await this.configService.deleteTenant(tenantId);
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await this.configService.getAllTenants();
  }

  async validateApiKey(apiKey: string): Promise<Tenant | null> {
    return await this.configService.validateApiKey(apiKey);
  }

  // === CONNECTION MANAGEMENT ===
  async createConnection(options: ConnectionOptions): Promise<{
    sessionId: string;
    qrCode?: string;
    pairingCode?: string;
  }> {
    const tenant = await this.configService.getTenant(options.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    return await this.whatsappService.createConnection(options);
  }

  async getConnectionStatus(sessionId: string): Promise<{
    isConnected: boolean;
    qrCode?: string;
    pairingCode?: string;
  }> {
    return await this.whatsappService.getConnectionStatus(sessionId);
  }

  async disconnectSession(sessionId: string): Promise<boolean> {
    return await this.whatsappService.disconnectSession(sessionId);
  }

  async getAllConnections(tenantId: string): Promise<any[]> {
    return await this.whatsappService.getAllConnections(tenantId);
  }

  async getActiveSessions(): Promise<any[]> {
    return await this.authService.getActiveSessions();
  }

  // === MESSAGE MANAGEMENT ===
  async sendMessage(
    tenantId: string,
    sessionId: string,
    options: SendMessageOptions
  ): Promise<any> {
    const tenant = await this.configService.getTenant(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    return await this.whatsappService.sendMessage(tenantId, sessionId, options);
  }

  async getMessages(filter: MessageFilter): Promise<{
    messages: Message[];
    total: number;
  }> {
    return await this.messageService.getMessages(filter);
  }

  async getMessage(messageId: string): Promise<Message | null> {
    return await this.messageService.getMessage(messageId);
  }

  async updateMessageStatus(
    messageId: string,
    status: string
  ): Promise<boolean> {
    return await this.messageService.updateMessageStatus(
      messageId,
      status as any
    );
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    return await this.messageService.deleteMessage(messageId);
  }

  async getMessagesByContact(
    tenantId: string,
    contactId: string,
    limit?: number
  ): Promise<Message[]> {
    return await this.messageService.getMessagesByContact(
      tenantId,
      contactId,
      limit
    );
  }

  async getUnreadMessages(tenantId: string): Promise<Message[]> {
    return await this.messageService.getUnreadMessages(tenantId);
  }

  async markAsRead(messageId: string): Promise<boolean> {
    return await this.messageService.markAsRead(messageId);
  }

  async searchMessages(
    tenantId: string,
    query: string,
    limit?: number
  ): Promise<Message[]> {
    return await this.messageService.searchMessages(tenantId, query, limit);
  }

  async getMessageStats(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    return await this.messageService.getMessageStats(
      tenantId,
      dateFrom,
      dateTo
    );
  }

  // === CONTACT MANAGEMENT ===
  async getContacts(filter: ContactFilter): Promise<{
    contacts: Contact[];
    total: number;
  }> {
    return await this.contactService.getContacts(filter);
  }

  async getContact(
    tenantId: string,
    whatsappId: string
  ): Promise<Contact | null> {
    return await this.contactService.getContact(tenantId, whatsappId);
  }

  async getContactById(contactId: string): Promise<Contact | null> {
    return await this.contactService.getContactById(contactId);
  }

  async updateContact(
    contactId: string,
    data: Partial<Contact>
  ): Promise<Contact | null> {
    return await this.contactService.updateContact(contactId, data);
  }

  async blockContact(tenantId: string, whatsappId: string): Promise<boolean> {
    return await this.contactService.blockContact(tenantId, whatsappId);
  }

  async unblockContact(tenantId: string, whatsappId: string): Promise<boolean> {
    return await this.contactService.unblockContact(tenantId, whatsappId);
  }

  async deleteContact(contactId: string): Promise<boolean> {
    return await this.contactService.deleteContact(contactId);
  }

  async searchContacts(
    tenantId: string,
    query: string,
    limit?: number
  ): Promise<Contact[]> {
    return await this.contactService.searchContacts(tenantId, query, limit);
  }

  async getGroupContacts(tenantId: string): Promise<Contact[]> {
    return await this.contactService.getGroupContacts(tenantId);
  }

  async getBusinessContacts(tenantId: string): Promise<Contact[]> {
    return await this.contactService.getBusinessContacts(tenantId);
  }

  // === MEDIA MANAGEMENT ===
  async saveMedia(
    buffer: Buffer,
    mimetype: string,
    originalName?: string
  ): Promise<{
    filename: string;
    filePath: string;
    size: number;
    thumbnailPath?: string;
  }> {
    return await this.mediaService.saveMedia(buffer, mimetype, originalName);
  }

  async getMedia(filePath: string): Promise<Buffer> {
    return await this.mediaService.getMedia(filePath);
  }

  async deleteMedia(filePath: string): Promise<boolean> {
    return await this.mediaService.deleteMedia(filePath);
  }

  async getMediaInfo(filePath: string, mimetype: string): Promise<any> {
    return await this.mediaService.getMediaInfo(filePath, mimetype);
  }

  async optimizeImage(filePath: string, quality?: number): Promise<Buffer> {
    return await this.mediaService.optimizeImage(filePath, quality);
  }

  async resizeImage(
    filePath: string,
    width: number,
    height: number
  ): Promise<Buffer> {
    return await this.mediaService.resizeImage(filePath, width, height);
  }

  // === WEBHOOK MANAGEMENT ===
  async testWebhook(url: string, tenantId: string): Promise<boolean> {
    return await this.webhookService.testWebhook(url, tenantId);
  }

  validateWebhookUrl(url: string): boolean {
    return this.webhookService.validateWebhookUrl(url);
  }

  // === UTILITY METHODS ===
  async getTenantProfile(tenantId: string, sessionId: string): Promise<any> {
    const session = await this.authService.getSession(tenantId, sessionId);
    return session?.profileData || null;
  }

  async updateTenantSettings(
    tenantId: string,
    settings: Record<string, any>
  ): Promise<boolean> {
    return await this.configService.updateTenantSettings(tenantId, settings);
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
    return await this.configService.getTenantConfig(tenantId);
  }

  // === BULK OPERATIONS ===
  async sendBulkMessages(
    tenantId: string,
    sessionId: string,
    messages: Array<{
      to: string;
      message: SendMessageOptions;
    }>
  ): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    const results = [];

    for (const { to, message } of messages) {
      try {
        const result = await this.sendMessage(tenantId, sessionId, {
          ...message,
          to,
        });
        results.push({ success: true, messageId: result.key.id });
      } catch (error: any) {
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }

  async exportMessages(
    tenantId: string,
    filter?: MessageFilter
  ): Promise<Message[]> {
    const { messages } = await this.getMessages({
      ...filter,
      tenantId,
      limit: 10000, // Large limit for export
    });
    return messages;
  }

  async exportContacts(
    tenantId: string,
    filter?: ContactFilter
  ): Promise<Contact[]> {
    const { contacts } = await this.getContacts({
      ...filter,
      tenantId,
      limit: 10000, // Large limit for export
    });
    return contacts;
  }
}
