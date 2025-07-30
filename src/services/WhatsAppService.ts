import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WAMessageKey,
  proto,
  WASocket,
  ConnectionState,
  WAMessage,
  Contact as WAContact,
  GroupMetadata,
  PresenceData,
  Chat,
  isJidGroup,
  jidNormalizedUser,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { Boom } from "@hapi/boom";
import { AuthService } from "./AuthService";
import { ContactService } from "./ContactService";
import { MessageService } from "./MessageService";
import { MediaService } from "./MediaService";
import { WebhookService } from "./WebhookService";
import { ConfigService } from "./ConfigService";
import { SessionStatus } from "../entities/Session";
import {
  MessageType,
  MessageDirection,
  MessageStatus,
} from "../entities/Message";
import {
  WhatsAppConnection,
  ConnectionOptions,
  SendMessageOptions,
} from "../types/interfaces";

export class WhatsAppService {
  private connections: Map<string, WhatsAppConnection> = new Map();
  private authService: AuthService;
  private contactService: ContactService;
  private messageService: MessageService;
  private mediaService: MediaService;
  private webhookService: WebhookService;
  private configService: ConfigService;

  constructor() {
    this.authService = new AuthService();
    this.contactService = new ContactService();
    this.messageService = new MessageService();
    this.mediaService = new MediaService();
    this.webhookService = new WebhookService();
    this.configService = new ConfigService();
  }

  async createConnection(
    options: ConnectionOptions
  ): Promise<{ sessionId: string; qrCode?: string; pairingCode?: string }> {
    const { tenantId, usePairingCode = false, phoneNumber } = options;
    const sessionId = `${tenantId}_${Date.now()}`;

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

    const { state, saveCreds } = await useMultiFileAuthState(
      `./auth_info_${sessionId}`
    );

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: [
        process.env.WA_BROWSER_NAME || "WhatsApp-API",
        "Desktop",
        "1.0.0",
      ],
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    const connection: WhatsAppConnection = {
      socket,
      tenantId,
      sessionId,
      isConnected: false,
    };

    this.connections.set(sessionId, connection);

    // Save authentication state
    socket.ev.on("creds.update", saveCreds);

    // Handle connection updates
    socket.ev.on("connection.update", async (update) => {
      await this.handleConnectionUpdate(sessionId, update);
    });

    // Handle messages
    socket.ev.on("messages.upsert", async (m) => {
      await this.handleMessages(sessionId, m);
    });

    // Handle message status updates
    socket.ev.on("messages.update", async (updates) => {
      await this.handleMessageUpdates(sessionId, updates);
    });

    // Handle contacts
    socket.ev.on("contacts.upsert", async (contacts) => {
      await this.handleContacts(sessionId, contacts);
    });

    // Handle groups
    socket.ev.on("groups.upsert", async (groups) => {
      await this.handleGroups(sessionId, groups);
    });

    // Handle presence updates
    socket.ev.on("presence.update", async (presence) => {
      await this.handlePresence(sessionId, presence);
    });

    if (usePairingCode && phoneNumber) {
      const pairingCode = await socket.requestPairingCode(phoneNumber);
      await this.authService.savePairingCode(tenantId, sessionId, pairingCode);
      connection.pairingCode = pairingCode;

      const tenant = await this.configService.getTenant(tenantId);
      if (tenant?.webhookUrl) {
        await this.webhookService.notifyPairingCode(
          tenant.webhookUrl,
          tenantId,
          sessionId,
          pairingCode
        );
      }

      return { sessionId, pairingCode };
    }

    return { sessionId };
  }

  private async handleConnectionUpdate(
    sessionId: string,
    update: Partial<ConnectionState>
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const { connection: conn, lastDisconnect, qr } = update;

    if (qr) {
      const qrCodeData = await QRCode.toDataURL(qr);
      await this.authService.saveQRCode(
        connection.tenantId,
        sessionId,
        qrCodeData
      );
      connection.qrCode = qrCodeData;

      const tenant = await this.configService.getTenant(connection.tenantId);
      if (tenant?.webhookUrl) {
        await this.webhookService.notifyQRCode(
          tenant.webhookUrl,
          connection.tenantId,
          sessionId,
          qrCodeData
        );
      }
    }

    if (conn === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log(
          "Connection closed, reconnecting...",
          lastDisconnect?.error
        );
        await this.authService.updateSessionStatus(
          connection.tenantId,
          sessionId,
          SessionStatus.DISCONNECTED
        );

        const tenant = await this.configService.getTenant(connection.tenantId);
        if (tenant?.autoReconnect) {
          setTimeout(() => {
            this.createConnection({ tenantId: connection.tenantId });
          }, 5000);
        }
      } else {
        console.log("Connection closed. You are logged out.");
        await this.authService.clearState(connection.tenantId, sessionId);
        this.connections.delete(sessionId);
      }

      connection.isConnected = false;
    } else if (conn === "open") {
      console.log("Opened connection");
      connection.isConnected = true;

      await this.authService.updateSessionStatus(
        connection.tenantId,
        sessionId,
        SessionStatus.CONNECTED
      );

      // Get user profile
      const user = connection.socket.user;
      if (user) {
        const profileData = {
          id: user.id,
          name: user.name,
          phone: user.id.split("@")[0],
          platform: "whatsapp",
        };

        await this.authService.updateProfileData(
          connection.tenantId,
          sessionId,
          profileData
        );
      }

      const tenant = await this.configService.getTenant(connection.tenantId);
      if (tenant?.webhookUrl) {
        await this.webhookService.notifyConnection(
          tenant.webhookUrl,
          connection.tenantId,
          sessionId,
          "connected",
          user
        );
      }
    }
  }

  private async handleMessages(
    sessionId: string,
    m: { messages: WAMessage[]; type: string }
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const tenant = await this.configService.getTenant(connection.tenantId);
    if (!tenant) return;

    for (const message of m.messages) {
      if (!message.key.fromMe && message.message) {
        const contactId = message.key.remoteJid!;

        // Skip group messages if not configured to receive them
        if (isJidGroup(contactId) && !tenant.receiveGroupMessages) {
          continue;
        }

        // Save/update contact
        await this.saveContact(connection.tenantId, contactId, message);

        // Save message
        await this.saveMessage(connection.tenantId, message);

        // Send webhook notification
        if (tenant.webhookUrl) {
          await this.webhookService.notifyMessage(
            tenant.webhookUrl,
            connection.tenantId,
            sessionId,
            {
              id: message.key.id,
              from: contactId,
              message: message.message,
              timestamp: message.messageTimestamp,
            }
          );
        }
      }
    }
  }

  private async handleMessageUpdates(
    sessionId: string,
    updates: any[]
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    for (const update of updates) {
      if (update.key && update.update) {
        const messageId = update.key.id;
        let status: MessageStatus | undefined;

        if (update.update.status === 3) status = MessageStatus.DELIVERED;
        if (update.update.status === 4) status = MessageStatus.READ;

        if (status) {
          await this.messageService.updateMessageStatus(messageId, status);

          const tenant = await this.configService.getTenant(
            connection.tenantId
          );
          if (tenant?.webhookUrl) {
            await this.webhookService.notifyMessageStatus(
              tenant.webhookUrl,
              connection.tenantId,
              sessionId,
              messageId,
              status
            );
          }
        }
      }
    }
  }

  private async handleContacts(
    sessionId: string,
    contacts: WAContact[]
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    for (const contact of contacts) {
      await this.contactService.createOrUpdateContact(connection.tenantId, {
        whatsappId: contact.id,
        name: contact.name,
        pushName: contact.notify,
        isGroup: false,
      });
    }
  }

  private async handleGroups(
    sessionId: string,
    groups: GroupMetadata[]
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    for (const group of groups) {
      await this.contactService.createOrUpdateContact(connection.tenantId, {
        whatsappId: group.id,
        name: group.subject,
        isGroup: true,
        metadata: {
          description: group.desc,
          participantsCount: group.participants?.length || 0,
          owner: group.owner,
          creation: group.creation,
        },
      });
    }
  }

  private async handlePresence(
    sessionId: string,
    presence: { id: string; presences: { [key: string]: PresenceData } }
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    await this.contactService.updateLastSeen(connection.tenantId, presence.id);

    const tenant = await this.configService.getTenant(connection.tenantId);
    if (tenant?.webhookUrl) {
      await this.webhookService.notifyPresence(
        tenant.webhookUrl,
        connection.tenantId,
        sessionId,
        presence
      );
    }
  }

  private async saveContact(
    tenantId: string,
    contactId: string,
    message: WAMessage
  ): Promise<void> {
    const pushName = message.pushName || "";
    const contact = await this.contactService.getContact(tenantId, contactId);

    if (!contact) {
      await this.contactService.createOrUpdateContact(tenantId, {
        whatsappId: contactId,
        pushName,
        isGroup: isJidGroup(contactId),
      });
    } else if (pushName && pushName !== contact.pushName) {
      await this.contactService.createOrUpdateContact(tenantId, {
        whatsappId: contactId,
        pushName,
      });
    }
  }

  private async saveMessage(
    tenantId: string,
    message: WAMessage
  ): Promise<void> {
    const contact = await this.contactService.getContact(
      tenantId,
      message.key.remoteJid!
    );
    if (!contact) return;

    const messageType = this.getMessageType(message.message!);
    const content = this.getMessageContent(message.message!);

    const savedMessage = await this.messageService.createMessage({
      tenantId,
      contactId: contact.id,
      messageId: message.key.id!,
      type: messageType,
      direction: MessageDirection.INBOUND,
      status: MessageStatus.DELIVERED,
      content,
      timestamp: new Date(Number(message.messageTimestamp) * 1000),
      contextInfo: message.message?.extendedTextMessage?.contextInfo
        ? (message.message.extendedTextMessage.contextInfo as Record<
            string,
            any
          >)
        : undefined,
      metadata: {
        pushName: message.pushName,
        participant: message.key.participant,
      },
    });

    // Handle media messages
    if (this.isMediaMessage(message.message!)) {
      await this.saveMediaMessage(savedMessage.id, message);
    }
  }

  private async saveMediaMessage(
    messageId: string,
    message: WAMessage
  ): Promise<void> {
    try {
      const buffer = await downloadMediaMessage(message, "buffer", {});
      if (buffer) {
        const mediaInfo = this.getMediaInfo(message.message!);
        const savedMedia = await this.mediaService.saveMedia(
          buffer,
          mediaInfo.mimetype,
          mediaInfo.filename
        );

        await this.messageService.addMedia(messageId, {
          filename: savedMedia.filename,
          originalName: mediaInfo.filename,
          mimeType: mediaInfo.mimetype,
          size: savedMedia.size,
          filePath: savedMedia.filePath,
          thumbnailPath: savedMedia.thumbnailPath,
          caption: mediaInfo.caption,
        });
      }
    } catch (error) {
      console.error("Error saving media message:", error);
    }
  }

  async sendMessage(
    tenantId: string,
    sessionId: string,
    options: SendMessageOptions
  ): Promise<any> {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      throw new Error("Connection not available");
    }

    const { socket } = connection;
    let result;

    switch (options.type) {
      case "text":
        result = await socket.sendMessage(options.to, {
          text: options.content!,
        });
        break;

      case "image":
        if (options.media) {
          result = await socket.sendMessage(options.to, {
            image:
              typeof options.media.data === "string"
                ? { url: options.media.data }
                : options.media.data,
            caption: options.media.caption,
            mimetype:
              options.media.mimetype ||
              "application/octet-stream" ||
              "image/jpeg",
          });
        }
        break;

      case "video":
        if (options.media) {
          result = await socket.sendMessage(options.to, {
            video:
              typeof options.media.data === "string"
                ? { url: options.media.data }
                : options.media.data,
            caption: options.media.caption,
            mimetype: options.media.mimetype || "video/mp4",
          });
        }
        break;

      case "audio":
        if (options.media) {
          result = await socket.sendMessage(options.to, {
            audio:
              typeof options.media.data === "string"
                ? { url: options.media.data }
                : options.media.data,
            mimetype: options.media.mimetype || "audio/mp4",
          });
        }
        break;

      case "document":
        if (options.media) {
          result = await socket.sendMessage(options.to, {
            document:
              typeof options.media.data === "string"
                ? { url: options.media.data }
                : options.media.data,
            fileName: options.media.filename,
            mimetype: options.media.mimetype,
          });
        }
        break;

      case "sticker":
        if (options.media) {
          result = await socket.sendMessage(options.to, {
            sticker:
              typeof options.media.data === "string"
                ? { url: options.media.data }
                : options.media.data,
          });
        }
        break;

      case "location":
        if (options.location) {
          result = await socket.sendMessage(options.to, {
            location: {
              degreesLatitude: options.location.latitude,
              degreesLongitude: options.location.longitude,
              name: options.location.name,
              address: options.location.address,
            },
          });
        }
        break;

      case "contact":
        if (options.contact) {
          result = await socket.sendMessage(options.to, {
            contacts: {
              displayName: options.contact.name,
              contacts: [
                {
                  vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${options.contact.name}\nTEL:${options.contact.phone}\nEND:VCARD`,
                },
              ],
            },
          });
        }
        break;

      default:
        throw new Error(`Message type ${options.type} not supported`);
    }

    // Save sent message to database
    if (result) {
      const contact = await this.contactService.getContact(
        tenantId,
        options.to
      );
      if (contact) {
        await this.messageService.createMessage({
          tenantId,
          contactId: contact.id,
          messageId: result.key.id!,
          type: options.type as MessageType,
          direction: MessageDirection.OUTBOUND,
          status: MessageStatus.SENT,
          content: options.content || options.media?.caption,
          timestamp: new Date(),
          quotedMessageId: options.quotedMessage,
        });
      }
    }

    return result;
  }

  async getConnectionStatus(
    sessionId: string
  ): Promise<{ isConnected: boolean; qrCode?: string; pairingCode?: string }> {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      return { isConnected: false };
    }

    return {
      isConnected: connection.isConnected,
      qrCode: connection.qrCode,
      pairingCode: connection.pairingCode,
    };
  }

  async disconnectSession(sessionId: string): Promise<boolean> {
    const connection = this.connections.get(sessionId);
    if (!connection) return false;

    try {
      await connection.socket.logout();
      await this.authService.clearState(connection.tenantId, sessionId);
      this.connections.delete(sessionId);
      return true;
    } catch (error) {
      console.error("Error disconnecting session:", error);
      return false;
    }
  }

  async getAllConnections(tenantId: string): Promise<WhatsAppConnection[]> {
    const connections: WhatsAppConnection[] = [];

    for (const [sessionId, connection] of this.connections) {
      if (connection.tenantId === tenantId) {
        connections.push(connection);
      }
    }

    return connections;
  }

  private getMessageType(message: any): MessageType {
    if (message.conversation || message.extendedTextMessage)
      return MessageType.TEXT;
    if (message.imageMessage) return MessageType.IMAGE;
    if (message.videoMessage) return MessageType.VIDEO;
    if (message.audioMessage) return MessageType.AUDIO;
    if (message.documentMessage) return MessageType.DOCUMENT;
    if (message.stickerMessage) return MessageType.STICKER;
    if (message.locationMessage) return MessageType.LOCATION;
    if (message.contactMessage) return MessageType.CONTACT;
    if (message.reactionMessage) return MessageType.REACTION;
    if (message.pollCreationMessage) return MessageType.POLL;
    return MessageType.TEXT;
  }

  private getMessageContent(message: any): string {
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage) return message.extendedTextMessage.text;
    if (message.imageMessage) return message.imageMessage.caption || "";
    if (message.videoMessage) return message.videoMessage.caption || "";
    if (message.documentMessage) return message.documentMessage.caption || "";
    return "";
  }

  private isMediaMessage(message: any): boolean {
    return !!(
      message.imageMessage ||
      message.videoMessage ||
      message.audioMessage ||
      message.documentMessage ||
      message.stickerMessage
    );
  }

  private getMediaInfo(message: any): {
    mimetype: string;
    filename: string;
    caption?: string;
  } {
    if (message.imageMessage) {
      return {
        mimetype: message.imageMessage.mimetype || "image/jpeg",
        filename: "image.jpg",
        caption: message.imageMessage.caption,
      };
    }
    if (message.videoMessage) {
      return {
        mimetype: message.videoMessage.mimetype || "video/mp4",
        filename: "video.mp4",
        caption: message.videoMessage.caption,
      };
    }
    if (message.audioMessage) {
      return {
        mimetype: message.audioMessage.mimetype || "audio/mp4",
        filename: "audio.m4a",
      };
    }
    if (message.documentMessage) {
      return {
        mimetype:
          message.documentMessage.mimetype || "application/octet-stream",
        filename: message.documentMessage.fileName || "document",
        caption: message.documentMessage.caption,
      };
    }
    if (message.stickerMessage) {
      return {
        mimetype: message.stickerMessage.mimetype || "image/webp",
        filename: "sticker.webp",
      };
    }
    return { mimetype: "application/octet-stream", filename: "file" };
  }
}
