"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppModule = void 0;
const WhatsAppService_1 = require("../services/WhatsAppService");
const ConfigService_1 = require("../services/ConfigService");
const ContactService_1 = require("../services/ContactService");
const MessageService_1 = require("../services/MessageService");
const MediaService_1 = require("../services/MediaService");
const WebhookService_1 = require("../services/WebhookService");
const AuthService_1 = require("../services/AuthService");
class WhatsAppModule {
    constructor() {
        this.whatsappService = new WhatsAppService_1.WhatsAppService();
        this.configService = new ConfigService_1.ConfigService();
        this.contactService = new ContactService_1.ContactService();
        this.messageService = new MessageService_1.MessageService();
        this.mediaService = new MediaService_1.MediaService();
        this.webhookService = new WebhookService_1.WebhookService();
        this.authService = new AuthService_1.AuthService();
    }
    async createTenant(data) {
        return await this.configService.createTenant(data);
    }
    async getTenant(tenantId) {
        return await this.configService.getTenant(tenantId);
    }
    async updateTenant(tenantId, data) {
        return await this.configService.updateTenant(tenantId, data);
    }
    async deleteTenant(tenantId) {
        return await this.configService.deleteTenant(tenantId);
    }
    async getAllTenants() {
        return await this.configService.getAllTenants();
    }
    async validateApiKey(apiKey) {
        return await this.configService.validateApiKey(apiKey);
    }
    async createConnection(options) {
        const tenant = await this.configService.getTenant(options.tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }
        return await this.whatsappService.createConnection(options);
    }
    async getConnectionStatus(sessionId) {
        return await this.whatsappService.getConnectionStatus(sessionId);
    }
    async disconnectSession(sessionId) {
        return await this.whatsappService.disconnectSession(sessionId);
    }
    async getAllConnections(tenantId) {
        return await this.whatsappService.getAllConnections(tenantId);
    }
    async getActiveSessions() {
        return await this.authService.getActiveSessions();
    }
    async sendMessage(tenantId, sessionId, options) {
        const tenant = await this.configService.getTenant(tenantId);
        if (!tenant) {
            throw new Error("Tenant not found");
        }
        return await this.whatsappService.sendMessage(tenantId, sessionId, options);
    }
    async getMessages(filter) {
        return await this.messageService.getMessages(filter);
    }
    async getMessage(messageId) {
        return await this.messageService.getMessage(messageId);
    }
    async updateMessageStatus(messageId, status) {
        return await this.messageService.updateMessageStatus(messageId, status);
    }
    async deleteMessage(messageId) {
        return await this.messageService.deleteMessage(messageId);
    }
    async getMessagesByContact(tenantId, contactId, limit) {
        return await this.messageService.getMessagesByContact(tenantId, contactId, limit);
    }
    async getUnreadMessages(tenantId) {
        return await this.messageService.getUnreadMessages(tenantId);
    }
    async markAsRead(messageId) {
        return await this.messageService.markAsRead(messageId);
    }
    async searchMessages(tenantId, query, limit) {
        return await this.messageService.searchMessages(tenantId, query, limit);
    }
    async getMessageStats(tenantId, dateFrom, dateTo) {
        return await this.messageService.getMessageStats(tenantId, dateFrom, dateTo);
    }
    async getContacts(filter) {
        return await this.contactService.getContacts(filter);
    }
    async getContact(tenantId, whatsappId) {
        return await this.contactService.getContact(tenantId, whatsappId);
    }
    async getContactById(contactId) {
        return await this.contactService.getContactById(contactId);
    }
    async updateContact(contactId, data) {
        return await this.contactService.updateContact(contactId, data);
    }
    async blockContact(tenantId, whatsappId) {
        return await this.contactService.blockContact(tenantId, whatsappId);
    }
    async unblockContact(tenantId, whatsappId) {
        return await this.contactService.unblockContact(tenantId, whatsappId);
    }
    async deleteContact(contactId) {
        return await this.contactService.deleteContact(contactId);
    }
    async searchContacts(tenantId, query, limit) {
        return await this.contactService.searchContacts(tenantId, query, limit);
    }
    async getGroupContacts(tenantId) {
        return await this.contactService.getGroupContacts(tenantId);
    }
    async getBusinessContacts(tenantId) {
        return await this.contactService.getBusinessContacts(tenantId);
    }
    async saveMedia(buffer, mimetype, originalName) {
        return await this.mediaService.saveMedia(buffer, mimetype, originalName);
    }
    async getMedia(filePath) {
        return await this.mediaService.getMedia(filePath);
    }
    async deleteMedia(filePath) {
        return await this.mediaService.deleteMedia(filePath);
    }
    async getMediaInfo(filePath, mimetype) {
        return await this.mediaService.getMediaInfo(filePath, mimetype);
    }
    async optimizeImage(filePath, quality) {
        return await this.mediaService.optimizeImage(filePath, quality);
    }
    async resizeImage(filePath, width, height) {
        return await this.mediaService.resizeImage(filePath, width, height);
    }
    async testWebhook(url, tenantId) {
        return await this.webhookService.testWebhook(url, tenantId);
    }
    validateWebhookUrl(url) {
        return this.webhookService.validateWebhookUrl(url);
    }
    async getTenantProfile(tenantId, sessionId) {
        const session = await this.authService.getSession(tenantId, sessionId);
        return session?.profileData || null;
    }
    async updateTenantSettings(tenantId, settings) {
        return await this.configService.updateTenantSettings(tenantId, settings);
    }
    async getTenantConfig(tenantId) {
        return await this.configService.getTenantConfig(tenantId);
    }
    async sendBulkMessages(tenantId, sessionId, messages) {
        const results = [];
        for (const { to, message } of messages) {
            try {
                const result = await this.sendMessage(tenantId, sessionId, {
                    ...message,
                    to,
                });
                results.push({ success: true, messageId: result.key.id });
            }
            catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }
    async exportMessages(tenantId, filter) {
        const { messages } = await this.getMessages({
            ...filter,
            tenantId,
            limit: 10000,
        });
        return messages;
    }
    async exportContacts(tenantId, filter) {
        const { contacts } = await this.getContacts({
            ...filter,
            tenantId,
            limit: 10000,
        });
        return contacts;
    }
}
exports.WhatsAppModule = WhatsAppModule;
//# sourceMappingURL=WhatsAppModule.js.map