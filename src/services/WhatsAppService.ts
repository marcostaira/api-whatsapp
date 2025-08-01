import {
  makeWASocket,
  DisconnectReason,
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
  ConnectionOptions,
  SendMessageOptions,
  WhatsAppConnection,
} from "../types/interfaces";
import { getBaileysConfig, BaileysConfigUtils } from "../config/baileys";

export class WhatsAppService {
  private connections: Map<string, WhatsAppConnection> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
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

    console.log(
      `🔗 Creating connection for tenant: ${tenantId}, session: ${sessionId}`
    );

    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Using WA v${version.join(".")}, isLatest: ${isLatest}`);

      // Load auth state from database using Baileys-compatible method
      const { state: authState, saveCreds } =
        await this.authService.useMultiDBAuthState(tenantId, sessionId);

      // Create Baileys socket with validated configuration
      const socketConfig = getBaileysConfig(authState, version);

      // Validate configuration before creating socket
      if (!BaileysConfigUtils.validateConfig(socketConfig)) {
        throw new Error("Invalid Baileys configuration");
      }

      const socket = makeWASocket(socketConfig);

      const connection: WhatsAppConnection = {
        socket,
        tenantId,
        sessionId,
        isConnected: false,
      };

      this.connections.set(sessionId, connection);
      this.reconnectAttempts.set(sessionId, 0);

      // Setup event handlers
      this.setupEventHandlers(socket, sessionId, saveCreds);

      // Handle pairing code request
      if (usePairingCode && phoneNumber) {
        try {
          const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
          console.log(`📞 Requesting pairing code for: ${cleanPhoneNumber}`);

          const pairingCode = await socket.requestPairingCode(cleanPhoneNumber);
          await this.authService.savePairingCode(
            tenantId,
            sessionId,
            pairingCode
          );
          connection.pairingCode = pairingCode;

          console.log(`✅ Pairing code generated: ${pairingCode}`);

          // Notify via webhook
          const tenant = await this.configService.getTenant(tenantId);
          if (tenant?.webhookUrl) {
            try {
              await this.webhookService.notifyPairingCode(
                tenant.webhookUrl,
                tenantId,
                sessionId,
                pairingCode
              );
            } catch (webhookError: any) {
              console.error(
                "⚠️ Webhook notification failed:",
                webhookError.message
              );
            }
          }

          return { sessionId, pairingCode };
        } catch (error: any) {
          console.error("❌ Error generating pairing code:", error.message);
          throw new Error(`Failed to generate pairing code: ${error.message}`);
        }
      }

      console.log(`✅ Connection created successfully: ${sessionId}`);
      return { sessionId };
    } catch (error: any) {
      console.error("❌ Error creating connection:", error.message);
      this.connections.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);
      throw error;
    }
  }

  private setupEventHandlers(
    socket: WASocket,
    sessionId: string,
    saveCreds: () => Promise<void>
  ): void {
    // Save authentication state when updated
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
  }

  private async handleConnectionUpdate(
    sessionId: string,
    update: Partial<ConnectionState>
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const { connection: conn, lastDisconnect, qr } = update;

    console.log(`📡 Connection update for ${sessionId}:`, {
      connection: conn,
      lastDisconnect: lastDisconnect
        ? {
            error: lastDisconnect.error?.message,
            date: lastDisconnect.date,
          }
        : null,
      hasQR: !!qr,
    });

    // Handle QR code generation
    if (qr) {
      try {
        const qrCodeData = await QRCode.toDataURL(qr);
        await this.authService.saveQRCode(
          connection.tenantId,
          sessionId,
          qrCodeData
        );
        connection.qrCode = qrCodeData;

        console.log(`📱 QR Code generated for session: ${sessionId}`);

        // Notify webhook
        const tenant = await this.configService.getTenant(connection.tenantId);
        if (tenant?.webhookUrl) {
          try {
            await this.webhookService.notifyQRCode(
              tenant.webhookUrl,
              connection.tenantId,
              sessionId,
              qrCodeData
            );
          } catch (webhookError: any) {
            console.error(
              "⚠️ Webhook QR notification failed:",
              webhookError.message
            );
          }
        }
      } catch (error: any) {
        console.error("❌ Error generating QR code:", error.message);
      }
    }

    // Handle connection opening
    if (conn === "open") {
      console.log(`✅ Connection opened for session: ${sessionId}`);

      connection.isConnected = true;
      this.reconnectAttempts.set(sessionId, 0); // Reset reconnect attempts

      await this.authService.updateSessionStatus(
        connection.tenantId,
        sessionId,
        SessionStatus.CONNECTED
      );

      // Get and save profile data
      try {
        const profile = {
          id: connection.socket.user?.id,
          name: connection.socket.user?.name,
          number: connection.socket.user?.id?.split("@")[0],
        };

        await this.authService.updateProfileData(
          connection.tenantId,
          sessionId,
          profile
        );

        console.log(`👤 Profile saved:`, profile);
      } catch (profileError: any) {
        console.error("⚠️ Error saving profile:", profileError.message);
      }

      // Notify webhook
      const tenant = await this.configService.getTenant(connection.tenantId);
      if (tenant?.webhookUrl) {
        try {
          await this.webhookService.notifyConnection(
            tenant.webhookUrl,
            connection.tenantId,
            sessionId,
            "connected"
          );
        } catch (webhookError: any) {
          console.error(
            "⚠️ Webhook connection notification failed:",
            webhookError.message
          );
        }
      }
    }

    // Handle connection closing
    if (conn === "close") {
      const disconnectReason = this.getDisconnectReason(lastDisconnect?.error);

      // CORREÇÃO: Tratar código 515 (restartRequired) de forma especial
      const isRestartRequired = disconnectReason === 515;
      const shouldReconnect = disconnectReason !== DisconnectReason.loggedOut;

      console.log(`🔌 Connection closed for session: ${sessionId}`, {
        reason: disconnectReason,
        reasonName: disconnectReason
          ? DisconnectReason[disconnectReason]
          : "unknown",
        isRestartRequired,
        shouldReconnect,
        error: lastDisconnect?.error?.message,
      });

      connection.isConnected = false;
      await this.authService.updateSessionStatus(
        connection.tenantId,
        sessionId,
        SessionStatus.DISCONNECTED
      );

      if (shouldReconnect) {
        if (isRestartRequired) {
          console.log(
            `🔄 Restart required for session: ${sessionId} - reconnecting with existing auth state`
          );
          // Para código 515, reconectar imediatamente com estado existente
          setTimeout(async () => {
            await this.handleReconnection(sessionId);
          }, 2000); // Aguardar 2 segundos
        } else {
          // Para outros erros, usar delay normal
          await this.handleReconnection(sessionId);
        }
      } else {
        console.log(
          `🚪 Logged out - clearing auth state for session: ${sessionId}`
        );
        await this.authService.clearState(connection.tenantId, sessionId);
        this.connections.delete(sessionId);
        this.reconnectAttempts.delete(sessionId);
      }

      // Notify webhook
      const tenant = await this.configService.getTenant(connection.tenantId);
      if (tenant?.webhookUrl) {
        try {
          await this.webhookService.notifyConnection(
            tenant.webhookUrl,
            connection.tenantId,
            sessionId,
            "disconnected",
            {
              reason: disconnectReason
                ? DisconnectReason[disconnectReason]
                : "unknown",
              isRestartRequired,
              shouldReconnect,
            }
          );
        } catch (webhookError: any) {
          console.error(
            "⚠️ Webhook disconnection notification failed:",
            webhookError.message
          );
        }
      }
    }

    // Handle connecting state
    if (conn === "connecting") {
      console.log(`🔄 Connecting session: ${sessionId}`);
      await this.authService.updateSessionStatus(
        connection.tenantId,
        sessionId,
        SessionStatus.CONNECTING
      );
    }
  }

  private async handleReconnection(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    const maxAttempts = 5;
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);

    if (attempts >= maxAttempts) {
      console.log(
        `❌ Max reconnection attempts reached for session: ${sessionId}`
      );
      this.connections.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);
      return;
    }

    console.log(
      `🔄 Attempting reconnection ${
        attempts + 1
      }/${maxAttempts} in ${delay}ms for session: ${sessionId}`
    );
    this.reconnectAttempts.set(sessionId, attempts + 1);

    setTimeout(async () => {
      try {
        const tenant = await this.configService.getTenant(connection.tenantId);
        if (tenant?.autoReconnect && this.connections.has(sessionId)) {
          console.log(`🔄 Auto-reconnecting session: ${sessionId}`);

          // CORREÇÃO: Usar o mesmo sessionId para manter o estado de auth
          await this.reconnectExistingSession(connection.tenantId, sessionId);
        }
      } catch (error: any) {
        console.error(
          `❌ Reconnection failed for session ${sessionId}:`,
          error.message
        );
        // Try again with next attempt
        await this.handleReconnection(sessionId);
      }
    }, delay);
  }

  // Utility method to safely close socket
  private safelyCloseSocket(socket: WASocket, sessionId?: string): void {
    try {
      // Try to end the socket gracefully
      if (socket && typeof socket.end === "function") {
        socket.end(undefined);
      }

      // Also try to close websocket if available
      if (socket.ws && typeof socket.ws.close === "function") {
        socket.ws.close();
      }

      if (sessionId) {
        console.log(`✅ Socket closed safely for session: ${sessionId}`);
      }
    } catch (error: any) {
      if (sessionId) {
        console.error(
          `⚠️ Error closing socket for session ${sessionId}:`,
          error.message
        );
      } else {
        console.error(`⚠️ Error closing socket:`, error.message);
      }
    }
  }

  // Novo método para reconectar sessão existente
  private async reconnectExistingSession(
    tenantId: string,
    existingSessionId: string
  ): Promise<void> {
    try {
      console.log(`🔄 Reconnecting existing session: ${existingSessionId}`);

      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Using WA v${version.join(".")}, isLatest: ${isLatest}`);

      // IMPORTANTE: Carregar estado da sessão EXISTENTE usando método compatível
      const { state: authState, saveCreds } =
        await this.authService.useMultiDBAuthState(tenantId, existingSessionId);
      console.log(
        `📝 Loading existing auth state for session: ${existingSessionId}`
      );

      // Create Baileys socket with validated configuration
      const socketConfig = getBaileysConfig(authState, version);

      if (!BaileysConfigUtils.validateConfig(socketConfig)) {
        throw new Error("Invalid Baileys configuration");
      }

      const socket = makeWASocket(socketConfig);

      // Atualizar conexão existente em vez de criar nova
      const existingConnection = this.connections.get(existingSessionId);
      if (existingConnection) {
        // Fechar socket anterior se existir
        this.safelyCloseSocket(existingConnection.socket, existingSessionId);

        // Atualizar com novo socket
        existingConnection.socket = socket;
        existingConnection.isConnected = false;

        console.log(
          `✅ Socket updated for existing session: ${existingSessionId}`
        );
      } else {
        // Se não existe mais, criar nova conexão
        const connection: WhatsAppConnection = {
          socket,
          tenantId,
          sessionId: existingSessionId,
          isConnected: false,
        };

        this.connections.set(existingSessionId, connection);
      }

      // Setup event handlers para a sessão reconectada
      this.setupEventHandlers(socket, existingSessionId, saveCreds);

      console.log(`✅ Session reconnected successfully: ${existingSessionId}`);
    } catch (error: any) {
      console.error(
        `❌ Error reconnecting existing session ${existingSessionId}:`,
        error.message
      );
      throw error;
    }
  }

  private getDisconnectReason(error: any): number | undefined {
    if (error instanceof Boom) {
      return error.output?.statusCode;
    }
    if (error?.output?.statusCode) return error.output.statusCode;
    if (error?.status) return error.status;
    if (error?.code) return error.code;
    return undefined;
  }

  // Rest of the methods remain the same...
  private async handleMessages(sessionId: string, m: any): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection || !m.messages) return;

    const tenant = await this.configService.getTenant(connection.tenantId);
    if (!tenant) return;

    for (const message of m.messages) {
      if (message.key && message.key.fromMe) continue; // Skip sent messages

      const contactId = message.key.remoteJid;
      if (!contactId) continue;

      // Skip group messages if configured
      if (isJidGroup(contactId) && !tenant.receiveGroupMessages) {
        continue;
      }

      try {
        await this.saveContact(connection.tenantId, contactId, message);
        await this.saveMessage(connection.tenantId, message);

        // Notify webhook
        if (tenant.webhookUrl) {
          try {
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
          } catch (webhookError: any) {
            console.error(
              "⚠️ Webhook message notification failed:",
              webhookError.message
            );
          }
        }
      } catch (error: any) {
        console.error("❌ Error processing message:", error.message);
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
          try {
            await this.messageService.updateMessageStatus(messageId, status);

            // Notify webhook
            const tenant = await this.configService.getTenant(
              connection.tenantId
            );
            if (tenant?.webhookUrl) {
              try {
                await this.webhookService.notifyMessageStatus(
                  tenant.webhookUrl,
                  connection.tenantId,
                  sessionId,
                  messageId,
                  status
                );
              } catch (webhookError: any) {
                console.error(
                  "⚠️ Webhook status notification failed:",
                  webhookError.message
                );
              }
            }
          } catch (error: any) {
            console.error("❌ Error updating message status:", error.message);
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
      try {
        await this.contactService.createOrUpdateContact(connection.tenantId, {
          whatsappId: contact.id,
          pushName: contact.name || contact.notify || "",
          isGroup: false,
        });
      } catch (error: any) {
        console.error("❌ Error saving contact:", error.message);
      }
    }
  }

  private async handleGroups(
    sessionId: string,
    groups: GroupMetadata[]
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    for (const group of groups) {
      try {
        await this.contactService.createOrUpdateContact(connection.tenantId, {
          whatsappId: group.id,
          pushName: group.subject || "",
          isGroup: true,
        });
      } catch (error: any) {
        console.error("❌ Error saving group:", error.message);
      }
    }
  }

  private async handlePresence(
    sessionId: string,
    presence: any
  ): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    // Notify webhook of presence updates
    const tenant = await this.configService.getTenant(connection.tenantId);
    if (tenant?.webhookUrl) {
      try {
        await this.webhookService.notifyPresence(
          tenant.webhookUrl,
          connection.tenantId,
          sessionId,
          presence
        );
      } catch (webhookError: any) {
        console.error(
          "⚠️ Webhook presence notification failed:",
          webhookError.message
        );
      }
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

    const messageType = this.getMessageType(message.message);
    const content = this.getMessageContent(message.message);

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
        ? message.message.extendedTextMessage.contextInfo
        : undefined,
    });

    // Handle media messages
    if (this.isMediaMessage(message.message)) {
      await this.saveMediaMessage(tenantId, savedMessage.id, message);
    }
  }

  private async saveMediaMessage(
    tenantId: string,
    messageId: string,
    message: WAMessage
  ): Promise<void> {
    try {
      // Create a simple logger for downloadMediaMessage
      const logger = {
        level: "warn" as const,
        child: () => logger,
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: console.warn,
        error: console.error,
        fatal: console.error,
      };

      const buffer = await downloadMediaMessage(
        message,
        "buffer",
        {},
        {
          logger,
          reuploadRequest: this.connections.get(`${tenantId}_*`)?.socket
            .updateMediaMessage,
        }
      );

      if (buffer) {
        const mediaInfo = this.getMediaInfo(message.message);

        // Save media with correct parameters
        const savedMedia = await this.mediaService.saveMedia(
          buffer,
          mediaInfo.mimetype || "application/octet-stream",
          mediaInfo.filename || `media_${Date.now()}`
        );

        console.log(`✅ Media saved: ${savedMedia.filename}`);
      }
    } catch (error: any) {
      console.error("❌ Error saving media:", error.message);
    }
  }

  async sendMessage(
    tenantId: string,
    sessionId: string,
    options: SendMessageOptions
  ): Promise<any> {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      throw new Error("WhatsApp not connected");
    }

    const { to, type, content, media, location, contact } = options;

    try {
      let result;

      switch (type) {
        case "text":
          result = await connection.socket.sendMessage(to!, { text: content! });
          break;

        case "image":
          if (!media?.data) throw new Error("Image data required");

          const imageBuffer =
            typeof media.data === "string"
              ? Buffer.from(media.data, "base64")
              : media.data;

          result = await connection.socket.sendMessage(to!, {
            image: imageBuffer,
            caption: media.caption,
            mimetype: media.mimetype || "image/jpeg",
          });
          break;

        case "video":
          if (!media?.data) throw new Error("Video data required");

          const videoBuffer =
            typeof media.data === "string"
              ? Buffer.from(media.data, "base64")
              : media.data;

          result = await connection.socket.sendMessage(to!, {
            video: videoBuffer,
            caption: media.caption,
            mimetype: media.mimetype || "video/mp4",
          });
          break;

        case "audio":
          if (!media?.data) throw new Error("Audio data required");

          const audioBuffer =
            typeof media.data === "string"
              ? Buffer.from(media.data, "base64")
              : media.data;

          result = await connection.socket.sendMessage(to!, {
            audio: audioBuffer,
            mimetype: media.mimetype || "audio/mp4",
            ptt: true, // Push to talk
          });
          break;

        case "document":
          if (!media?.data) throw new Error("Document data required");

          const docBuffer =
            typeof media.data === "string"
              ? Buffer.from(media.data, "base64")
              : media.data;

          result = await connection.socket.sendMessage(to!, {
            document: docBuffer,
            fileName: media.filename || "document",
            mimetype: media.mimetype || "application/pdf",
            caption: media.caption,
          });
          break;

        case "sticker":
          if (!media?.data) throw new Error("Sticker data required");

          const stickerBuffer =
            typeof media.data === "string"
              ? Buffer.from(media.data, "base64")
              : media.data;

          result = await connection.socket.sendMessage(to!, {
            sticker: stickerBuffer,
          });
          break;

        case "location":
          if (!location) throw new Error("Location data required");

          result = await connection.socket.sendMessage(to!, {
            location: {
              degreesLatitude: location.latitude,
              degreesLongitude: location.longitude,
              name: location.name,
              address: location.address,
            },
          });
          break;

        case "contact":
          if (!contact) throw new Error("Contact data required");

          result = await connection.socket.sendMessage(to!, {
            contacts: {
              displayName: contact.name,
              contacts: [
                {
                  displayName: contact.name,
                  vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\nTEL:${contact.phone}\nEND:VCARD`,
                },
              ],
            },
          });
          break;

        default:
          throw new Error(`Unsupported message type: ${type}`);
      }

      // Save sent message to database
      if (result) {
        const contactRecord = await this.contactService.getContact(
          tenantId,
          to!
        );
        if (contactRecord) {
          await this.messageService.createMessage({
            tenantId,
            contactId: contactRecord.id,
            messageId: result.key.id!,
            type: type as MessageType,
            direction: MessageDirection.OUTBOUND,
            status: MessageStatus.SENT,
            content:
              content ||
              media?.caption ||
              location?.name ||
              contact?.name ||
              "",
            timestamp: new Date(),
          });
        }
      }

      console.log(`✅ Message sent successfully:`, { sessionId, to, type });
      return result;
    } catch (error: any) {
      console.error("❌ Error sending message:", error.message);
      throw error;
    }
  }

  async getConnectionStatus(sessionId: string): Promise<{
    isConnected: boolean;
    qrCode?: string;
    pairingCode?: string;
    profile?: any;
  }> {
    const connection = this.connections.get(sessionId);

    if (!connection) {
      // Try to get from database
      const parts = sessionId.split("_");
      if (parts.length >= 2) {
        const tenantId = parts[0];
        const session = await this.authService.getSession(tenantId, sessionId);
        return {
          isConnected: false,
          qrCode: session?.qrCode || undefined,
          pairingCode: session?.pairingCode || undefined,
        };
      }
      throw new Error("Session not found");
    }

    return {
      isConnected: connection.isConnected,
      qrCode: connection.qrCode,
      pairingCode: connection.pairingCode,
      profile: connection.socket.user
        ? {
            id: connection.socket.user.id,
            name: connection.socket.user.name,
            number: connection.socket.user.id?.split("@")[0],
          }
        : undefined,
    };
  }

  async disconnectSession(sessionId: string): Promise<boolean> {
    const connection = this.connections.get(sessionId);
    if (!connection) return false;

    try {
      console.log(`🔌 Disconnecting session: ${sessionId}`);

      // Try to logout first
      try {
        await connection.socket.logout();
        console.log(`✅ Logout successful for session: ${sessionId}`);
      } catch (logoutError: any) {
        console.log(
          `⚠️ Logout failed, forcing disconnect: ${logoutError.message}`
        );
      }

      // Close socket safely
      this.safelyCloseSocket(connection.socket, sessionId);

      // Clear auth state
      await this.authService.clearState(connection.tenantId, sessionId);

      // Remove from memory
      this.connections.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);

      console.log(`✅ Session disconnected: ${sessionId}`);
      return true;
    } catch (error: any) {
      console.error("❌ Error disconnecting session:", error.message);

      // Force cleanup even if error occurred
      this.safelyCloseSocket(connection.socket, sessionId);
      this.connections.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);

      return false;
    }
  }

  async getAllConnections(tenantId: string): Promise<WhatsAppConnection[]> {
    const connections: WhatsAppConnection[] = [];

    for (const [sessionId, connection] of this.connections) {
      if (connection.tenantId === tenantId) {
        connections.push({
          ...connection,
          // Don't expose the actual socket object
          socket: undefined as any,
        });
      }
    }

    return connections;
  }

  // Utility methods for message processing
  private getMessageType(message: any): MessageType {
    if (message?.conversation || message?.extendedTextMessage)
      return MessageType.TEXT;
    if (message?.imageMessage) return MessageType.IMAGE;
    if (message?.videoMessage) return MessageType.VIDEO;
    if (message?.audioMessage) return MessageType.AUDIO;
    if (message?.documentMessage) return MessageType.DOCUMENT;
    if (message?.stickerMessage) return MessageType.STICKER;
    if (message?.locationMessage) return MessageType.LOCATION;
    if (message?.contactMessage || message?.contactsArrayMessage)
      return MessageType.CONTACT;
    return MessageType.TEXT;
  }

  private getMessageContent(message: any): string {
    if (message?.conversation) return message.conversation;
    if (message?.extendedTextMessage?.text)
      return message.extendedTextMessage.text;
    if (message?.imageMessage?.caption) return message.imageMessage.caption;
    if (message?.videoMessage?.caption) return message.videoMessage.caption;
    if (message?.documentMessage?.caption)
      return message.documentMessage.caption;
    if (message?.locationMessage) {
      const loc = message.locationMessage;
      return `Location: ${loc.name || ""} (${loc.degreesLatitude}, ${
        loc.degreesLongitude
      })`;
    }
    if (message?.contactMessage) {
      return `Contact: ${message.contactMessage.displayName}`;
    }
    return "";
  }

  private isMediaMessage(message: any): boolean {
    return !!(
      message?.imageMessage ||
      message?.videoMessage ||
      message?.audioMessage ||
      message?.documentMessage ||
      message?.stickerMessage
    );
  }

  private getMediaInfo(message: any): { mimetype?: string; filename?: string } {
    if (message?.imageMessage) {
      return {
        mimetype: message.imageMessage.mimetype,
        filename: "image",
      };
    }
    if (message?.videoMessage) {
      return {
        mimetype: message.videoMessage.mimetype,
        filename: "video",
      };
    }
    if (message?.audioMessage) {
      return {
        mimetype: message.audioMessage.mimetype,
        filename: "audio",
      };
    }
    if (message?.documentMessage) {
      return {
        mimetype: message.documentMessage.mimetype,
        filename: message.documentMessage.fileName,
      };
    }
    if (message?.stickerMessage) {
      return {
        mimetype: message.stickerMessage.mimetype,
        filename: "sticker",
      };
    }
    return {};
  }

  // Bulk message sending
  async sendBulkMessages(
    tenantId: string,
    sessionId: string,
    messages: Array<{
      to: string;
      message: SendMessageOptions;
    }>
  ): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    const results = [];
    const connection = this.connections.get(sessionId);

    if (!connection || !connection.isConnected) {
      throw new Error("WhatsApp not connected");
    }

    console.log(`📨 Sending bulk messages: ${messages.length} messages`);

    for (let i = 0; i < messages.length; i++) {
      const { to, message } = messages[i];

      try {
        const result = await this.sendMessage(tenantId, sessionId, {
          ...message,
          to,
        });

        results.push({
          success: true,
          messageId: result.key.id,
        });

        console.log(
          `✅ Bulk message ${i + 1}/${messages.length} sent to ${to}`
        );

        // Add delay between messages to avoid rate limiting
        if (i < messages.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        console.error(
          `❌ Bulk message ${i + 1}/${messages.length} failed for ${to}:`,
          error.message
        );
        results.push({
          success: false,
          error: error.message,
        });
      }
    }

    console.log(
      `📊 Bulk send completed: ${results.filter((r) => r.success).length}/${
        messages.length
      } successful`
    );
    return results;
  }

  // Get detailed connection information
  async getDetailedConnectionStatus(sessionId: string): Promise<{
    sessionId: string;
    tenantId: string;
    isConnected: boolean;
    status: string;
    qrCode?: string;
    pairingCode?: string;
    profile?: any;
    connectionTime?: Date;
    lastActivity?: Date;
    reconnectionCount: number;
  }> {
    const connection = this.connections.get(sessionId);

    if (!connection) {
      throw new Error("Session not found");
    }

    const session = await this.authService.getSession(
      connection.tenantId,
      sessionId
    );
    const reconnectionCount = this.reconnectAttempts.get(sessionId) || 0;

    return {
      sessionId,
      tenantId: connection.tenantId,
      isConnected: connection.isConnected,
      status: session?.status || "unknown",
      qrCode: connection.qrCode || session?.qrCode,
      pairingCode: connection.pairingCode || session?.pairingCode,
      profile: connection.socket.user
        ? {
            id: connection.socket.user.id,
            name: connection.socket.user.name,
            number: connection.socket.user.id?.split("@")[0],
          }
        : undefined,
      connectionTime: session?.lastConnectedAt,
      lastActivity: session?.updatedAt,
      reconnectionCount,
    };
  }

  // Force reconnection
  async forceReconnection(sessionId: string): Promise<boolean> {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      throw new Error("Session not found");
    }

    try {
      console.log(`🔄 Forcing reconnection for session: ${sessionId}`);

      // Close current connection safely
      this.safelyCloseSocket(connection.socket, sessionId);

      // Reset reconnection attempts
      this.reconnectAttempts.set(sessionId, 0);

      // Trigger reconnection
      await this.reconnectExistingSession(connection.tenantId, sessionId);

      return true;
    } catch (error: any) {
      console.error(
        `❌ Force reconnection failed for session ${sessionId}:`,
        error.message
      );
      return false;
    }
  }

  // Get connection statistics
  getConnectionStatistics(): {
    totalConnections: number;
    connectedSessions: number;
    disconnectedSessions: number;
    sessionsWithReconnections: number;
    totalReconnectionAttempts: number;
  } {
    let connectedSessions = 0;
    let disconnectedSessions = 0;
    let totalReconnectionAttempts = 0;

    for (const [sessionId, connection] of this.connections) {
      if (connection.isConnected) {
        connectedSessions++;
      } else {
        disconnectedSessions++;
      }

      const attempts = this.reconnectAttempts.get(sessionId) || 0;
      totalReconnectionAttempts += attempts;
    }

    return {
      totalConnections: this.connections.size,
      connectedSessions,
      disconnectedSessions,
      sessionsWithReconnections: this.reconnectAttempts.size,
      totalReconnectionAttempts,
    };
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up WhatsApp service...");

    // Disconnect all connections
    for (const [sessionId, connection] of this.connections) {
      this.safelyCloseSocket(connection.socket, sessionId);
    }

    this.connections.clear();
    this.reconnectAttempts.clear();
    this.authService.cleanup();

    console.log("✅ WhatsApp service cleanup completed");
  }

  // Health check method
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    totalConnections: number;
    healthyConnections: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let healthyConnections = 0;

    // Check each connection
    for (const [sessionId, connection] of this.connections) {
      try {
        if (connection.isConnected && connection.socket.user) {
          healthyConnections++;
        } else {
          const reconnectAttempts = this.reconnectAttempts.get(sessionId) || 0;
          if (reconnectAttempts > 3) {
            issues.push(
              `Session ${sessionId.substring(
                0,
                8
              )}... has ${reconnectAttempts} reconnection attempts`
            );
          }
        }
      } catch (error: any) {
        issues.push(
          `Error checking session ${sessionId.substring(0, 8)}...: ${
            error.message
          }`
        );
      }
    }

    // Determine overall health
    const totalConnections = this.connections.size;
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (totalConnections === 0) {
      status = "healthy"; // No connections is not necessarily unhealthy
    } else if (healthyConnections === 0) {
      status = "unhealthy";
    } else if (healthyConnections < totalConnections * 0.8) {
      status = "degraded";
    }

    return {
      status,
      totalConnections,
      healthyConnections,
      issues,
    };
  }
}
