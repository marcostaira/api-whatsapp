"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const axios_1 = __importDefault(require("axios"));
class WebhookService {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }
    async sendWebhook(url, payload) {
        if (!url)
            return false;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await axios_1.default.post(url, payload, {
                    timeout: 10000,
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "WhatsApp-API-Webhook/1.0",
                    },
                });
                if (response.status >= 200 && response.status < 300) {
                    console.log(`Webhook sent successfully to ${url}`);
                    return true;
                }
            }
            catch (error) {
                console.error(`Webhook attempt ${attempt} failed:`, error.message);
                if (attempt < this.maxRetries) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        console.error(`Failed to send webhook to ${url} after ${this.maxRetries} attempts`);
        return false;
    }
    async notifyConnection(webhookUrl, tenantId, sessionId, status, data) {
        const payload = {
            tenantId,
            sessionId,
            event: "connection",
            data: {
                status,
                ...data,
            },
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    async notifyMessage(webhookUrl, tenantId, sessionId, message) {
        const payload = {
            tenantId,
            sessionId,
            event: "message",
            data: message,
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    async notifyMessageStatus(webhookUrl, tenantId, sessionId, messageId, status) {
        const payload = {
            tenantId,
            sessionId,
            event: "message_status",
            data: {
                messageId,
                status,
            },
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    async notifyContact(webhookUrl, tenantId, sessionId, contact, action) {
        const payload = {
            tenantId,
            sessionId,
            event: "contact",
            data: {
                action,
                contact,
            },
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    async notifyGroup(webhookUrl, tenantId, sessionId, group, action) {
        const payload = {
            tenantId,
            sessionId,
            event: "group",
            data: {
                action,
                group,
            },
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    async notifyPresence(webhookUrl, tenantId, sessionId, presence) {
        const payload = {
            tenantId,
            sessionId,
            event: "presence",
            data: presence,
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    async notifyQRCode(webhookUrl, tenantId, sessionId, qrCode) {
        const payload = {
            tenantId,
            sessionId,
            event: "qr_code",
            data: {
                qrCode,
            },
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    async notifyPairingCode(webhookUrl, tenantId, sessionId, pairingCode) {
        const payload = {
            tenantId,
            sessionId,
            event: "pairing_code",
            data: {
                pairingCode,
            },
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    async notifyError(webhookUrl, tenantId, sessionId, error) {
        const payload = {
            tenantId,
            sessionId,
            event: "error",
            data: {
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack,
                },
            },
            timestamp: new Date(),
        };
        await this.sendWebhook(webhookUrl, payload);
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    validateWebhookUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return ["http:", "https:"].includes(parsedUrl.protocol);
        }
        catch {
            return false;
        }
    }
    async testWebhook(url, tenantId) {
        const testPayload = {
            tenantId,
            sessionId: "test",
            event: "test",
            data: {
                message: "This is a test webhook",
            },
            timestamp: new Date(),
        };
        return await this.sendWebhook(url, testPayload);
    }
}
exports.WebhookService = WebhookService;
//# sourceMappingURL=WebhookService.js.map