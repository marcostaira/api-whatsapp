import axios from "axios";
import { WebhookPayload } from "../types/interfaces";

export class WebhookService {
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  async sendWebhook(url: string, payload: WebhookPayload): Promise<boolean> {
    if (!url) return false;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(url, payload, {
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
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.warn(
            `Webhook rate limited (429) - attempt ${attempt}/${this.maxRetries}`
          );
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelay * attempt * 2); // Longer delay for rate limits
            continue;
          }
        } else {
          console.error(`Webhook attempt ${attempt} failed:`, error.message);
        }

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    console.error(
      `Failed to send webhook to ${url} after ${this.maxRetries} attempts`
    );
    return false;
  }

  async notifyConnection(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    status: string,
    data?: any
  ): Promise<void> {
    const payload: WebhookPayload = {
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

  async notifyMessage(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    message: any
  ): Promise<void> {
    const payload: WebhookPayload = {
      tenantId,
      sessionId,
      event: "message",
      data: message,
      timestamp: new Date(),
    };

    await this.sendWebhook(webhookUrl, payload);
  }

  async notifyMessageStatus(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    messageId: string,
    status: string
  ): Promise<void> {
    const payload: WebhookPayload = {
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

  async notifyContact(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    contact: any,
    action: string
  ): Promise<void> {
    const payload: WebhookPayload = {
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

  async notifyGroup(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    group: any,
    action: string
  ): Promise<void> {
    const payload: WebhookPayload = {
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

  async notifyPresence(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    presence: any
  ): Promise<void> {
    const payload: WebhookPayload = {
      tenantId,
      sessionId,
      event: "presence",
      data: presence,
      timestamp: new Date(),
    };

    await this.sendWebhook(webhookUrl, payload);
  }

  async notifyQRCode(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    qrCode: string
  ): Promise<void> {
    const payload: WebhookPayload = {
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

  async notifyPairingCode(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    pairingCode: string
  ): Promise<void> {
    const payload: WebhookPayload = {
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

  async notifyError(
    webhookUrl: string,
    tenantId: string,
    sessionId: string,
    error: any
  ): Promise<void> {
    const payload: WebhookPayload = {
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  validateWebhookUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ["http:", "https:"].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  async testWebhook(url: string, tenantId: string): Promise<boolean> {
    const testPayload: WebhookPayload = {
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
