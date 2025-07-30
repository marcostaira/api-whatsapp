import { WebhookPayload } from "../types/interfaces";
export declare class WebhookService {
    private maxRetries;
    private retryDelay;
    sendWebhook(url: string, payload: WebhookPayload): Promise<boolean>;
    notifyConnection(webhookUrl: string, tenantId: string, sessionId: string, status: string, data?: any): Promise<void>;
    notifyMessage(webhookUrl: string, tenantId: string, sessionId: string, message: any): Promise<void>;
    notifyMessageStatus(webhookUrl: string, tenantId: string, sessionId: string, messageId: string, status: string): Promise<void>;
    notifyContact(webhookUrl: string, tenantId: string, sessionId: string, contact: any, action: string): Promise<void>;
    notifyGroup(webhookUrl: string, tenantId: string, sessionId: string, group: any, action: string): Promise<void>;
    notifyPresence(webhookUrl: string, tenantId: string, sessionId: string, presence: any): Promise<void>;
    notifyQRCode(webhookUrl: string, tenantId: string, sessionId: string, qrCode: string): Promise<void>;
    notifyPairingCode(webhookUrl: string, tenantId: string, sessionId: string, pairingCode: string): Promise<void>;
    notifyError(webhookUrl: string, tenantId: string, sessionId: string, error: any): Promise<void>;
    private delay;
    validateWebhookUrl(url: string): boolean;
    testWebhook(url: string, tenantId: string): Promise<boolean>;
}
