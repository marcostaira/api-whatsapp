"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const qrcode_1 = __importDefault(require("qrcode"));
const AuthService_1 = require("./AuthService");
const ContactService_1 = require("./ContactService");
const MessageService_1 = require("./MessageService");
const MediaService_1 = require("./MediaService");
const WebhookService_1 = require("./WebhookService");
const ConfigService_1 = require("./ConfigService");
const Session_1 = require("../entities/Session");
const Message_1 = require("../entities/Message");
class WhatsAppService {
    constructor() {
        this.connections = new Map();
        this.authService = new AuthService_1.AuthService();
        this.contactService = new ContactService_1.ContactService();
        this.messageService = new MessageService_1.MessageService();
        this.mediaService = new MediaService_1.MediaService();
        this.webhookService = new WebhookService_1.WebhookService();
        this.configService = new ConfigService_1.ConfigService();
    }
    async createConnection(options) {
        const { tenantId, usePairingCode = false, phoneNumber } = options;
        const sessionId = `${tenantId}_${Date.now()}`;
        const { version, isLatest } = await (0, baileys_1.fetchLatestBaileysVersion)();
        console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(`./auth_info_${sessionId}`);
        const socket = (0, baileys_1.makeWASocket)({
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
        const connection = {
            socket,
            tenantId,
            sessionId,
            isConnected: false,
        };
        this.connections.set(sessionId, connection);
        socket.ev.on("creds.update", saveCreds);
        socket.ev.on("connection.update", async (update) => {
            await this.handleConnectionUpdate(sessionId, update);
        });
        socket.ev.on("messages.upsert", async (m) => {
            await this.handleMessages(sessionId, m);
        });
        socket.ev.on("messages.update", async (updates) => {
            await this.handleMessageUpdates(sessionId, updates);
        });
        socket.ev.on("contacts.upsert", async (contacts) => {
            await this.handleContacts(sessionId, contacts);
        });
        socket.ev.on("groups.upsert", async (groups) => {
            await this.handleGroups(sessionId, groups);
        });
        socket.ev.on("presence.update", async (presence) => {
            await this.handlePresence(sessionId, presence);
        });
        if (usePairingCode && phoneNumber) {
            const pairingCode = await socket.requestPairingCode(phoneNumber);
            await this.authService.savePairingCode(tenantId, sessionId, pairingCode);
            connection.pairingCode = pairingCode;
            const tenant = await this.configService.getTenant(tenantId);
            if (tenant?.webhookUrl) {
                await this.webhookService.notifyPairingCode(tenant.webhookUrl, tenantId, sessionId, pairingCode);
            }
            return { sessionId, pairingCode };
        }
        return { sessionId };
    }
    async handleConnectionUpdate(sessionId, update) {
        const connection = this.connections.get(sessionId);
        if (!connection)
            return;
        const { connection: conn, lastDisconnect, qr } = update;
        if (qr) {
            const qrCodeData = await qrcode_1.default.toDataURL(qr);
            await this.authService.saveQRCode(connection.tenantId, sessionId, qrCodeData);
            connection.qrCode = qrCodeData;
            const tenant = await this.configService.getTenant(connection.tenantId);
            if (tenant?.webhookUrl) {
                await this.webhookService.notifyQRCode(tenant.webhookUrl, connection.tenantId, sessionId, qrCodeData);
            }
        }
        if (conn === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !==
                baileys_1.DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log("Connection closed, reconnecting...", lastDisconnect?.error);
                await this.authService.updateSessionStatus(connection.tenantId, sessionId, Session_1.SessionStatus.DISCONNECTED);
                const tenant = await this.configService.getTenant(connection.tenantId);
                if (tenant?.autoReconnect) {
                    setTimeout(() => {
                        this.createConnection({ tenantId: connection.tenantId });
                    }, 5000);
                }
            }
            else {
                console.log("Connection closed. You are logged out.");
                await this.authService.clearState(connection.tenantId, sessionId);
                this.connections.delete(sessionId);
            }
            connection.isConnected = false;
        }
        else if (conn === "open") {
            console.log("Opened connection");
            connection.isConnected = true;
            await this.authService.updateSessionStatus(connection.tenantId, sessionId, Session_1.SessionStatus.CONNECTED);
            const user = connection.socket.user;
            if (user) {
                const profileData = {
                    id: user.id,
                    name: user.name,
                    phone: user.id.split("@")[0],
                    platform: "whatsapp",
                };
                await this.authService.updateProfileData(connection.tenantId, sessionId, profileData);
            }
            const tenant = await this.configService.getTenant(connection.tenantId);
            if (tenant?.webhookUrl) {
                await this.webhookService.notifyConnection(tenant.webhookUrl, connection.tenantId, sessionId, "connected", user);
            }
        }
    }
    async handleMessages(sessionId, m) {
        const connection = this.connections.get(sessionId);
        if (!connection)
            return;
        const tenant = await this.configService.getTenant(connection.tenantId);
        if (!tenant)
            return;
        for (const message of m.messages) {
            if (!message.key.fromMe && message.message) {
                const contactId = message.key.remoteJid;
                if ((0, baileys_1.isJidGroup)(contactId) && !tenant.receiveGroupMessages) {
                    continue;
                }
                await this.saveContact(connection.tenantId, contactId, message);
                await this.saveMessage(connection.tenantId, message);
                if (tenant.webhookUrl) {
                    await this.webhookService.notifyMessage(tenant.webhookUrl, connection.tenantId, sessionId, {
                        id: message.key.id,
                        from: contactId,
                        message: message.message,
                        timestamp: message.messageTimestamp,
                    });
                }
            }
        }
    }
    async handleMessageUpdates(sessionId, updates) {
        const connection = this.connections.get(sessionId);
        if (!connection)
            return;
        for (const update of updates) {
            if (update.key && update.update) {
                const messageId = update.key.id;
                let status;
                if (update.update.status === 3)
                    status = Message_1.MessageStatus.DELIVERED;
                if (update.update.status === 4)
                    status = Message_1.MessageStatus.READ;
                if (status) {
                    await this.messageService.updateMessageStatus(messageId, status);
                    const tenant = await this.configService.getTenant(connection.tenantId);
                    if (tenant?.webhookUrl) {
                        await this.webhookService.notifyMessageStatus(tenant.webhookUrl, connection.tenantId, sessionId, messageId, status);
                    }
                }
            }
        }
    }
    async handleContacts(sessionId, contacts) {
        const connection = this.connections.get(sessionId);
        if (!connection)
            return;
        for (const contact of contacts) {
            await this.contactService.createOrUpdateContact(connection.tenantId, {
                whatsappId: contact.id,
                name: contact.name,
                pushName: contact.notify,
                isGroup: false,
            });
        }
    }
    async handleGroups(sessionId, groups) {
        const connection = this.connections.get(sessionId);
        if (!connection)
            return;
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
    async handlePresence(sessionId, presence) {
        const connection = this.connections.get(sessionId);
        if (!connection)
            return;
        await this.contactService.updateLastSeen(connection.tenantId, presence.id);
        const tenant = await this.configService.getTenant(connection.tenantId);
        if (tenant?.webhookUrl) {
            await this.webhookService.notifyPresence(tenant.webhookUrl, connection.tenantId, sessionId, presence);
        }
    }
    async saveContact(tenantId, contactId, message) {
        const pushName = message.pushName || "";
        const contact = await this.contactService.getContact(tenantId, contactId);
        if (!contact) {
            await this.contactService.createOrUpdateContact(tenantId, {
                whatsappId: contactId,
                pushName,
                isGroup: (0, baileys_1.isJidGroup)(contactId),
            });
        }
        else if (pushName && pushName !== contact.pushName) {
            await this.contactService.createOrUpdateContact(tenantId, {
                whatsappId: contactId,
                pushName,
            });
        }
    }
    async saveMessage(tenantId, message) {
        const contact = await this.contactService.getContact(tenantId, message.key.remoteJid);
        if (!contact)
            return;
        const messageType = this.getMessageType(message.message);
        const content = this.getMessageContent(message.message);
        const savedMessage = await this.messageService.createMessage({
            tenantId,
            contactId: contact.id,
            messageId: message.key.id,
            type: messageType,
            direction: Message_1.MessageDirection.INBOUND,
            status: Message_1.MessageStatus.DELIVERED,
            content,
            timestamp: new Date(Number(message.messageTimestamp) * 1000),
            contextInfo: message.message?.extendedTextMessage?.contextInfo
                ? message.message.extendedTextMessage.contextInfo
                : undefined,
            metadata: {
                pushName: message.pushName,
                participant: message.key.participant,
            },
        });
        if (this.isMediaMessage(message.message)) {
            await this.saveMediaMessage(savedMessage.id, message);
        }
    }
    async saveMediaMessage(messageId, message) {
        try {
            const buffer = await (0, baileys_1.downloadMediaMessage)(message, "buffer", {});
            if (buffer) {
                const mediaInfo = this.getMediaInfo(message.message);
                const savedMedia = await this.mediaService.saveMedia(buffer, mediaInfo.mimetype, mediaInfo.filename);
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
        }
        catch (error) {
            console.error("Error saving media message:", error);
        }
    }
    async sendMessage(tenantId, sessionId, options) {
        const connection = this.connections.get(sessionId);
        if (!connection || !connection.isConnected) {
            throw new Error("Connection not available");
        }
        const { socket } = connection;
        let result;
        switch (options.type) {
            case "text":
                result = await socket.sendMessage(options.to, {
                    text: options.content,
                });
                break;
            case "image":
                if (options.media) {
                    result = await socket.sendMessage(options.to, {
                        image: typeof options.media.data === "string"
                            ? { url: options.media.data }
                            : options.media.data,
                        caption: options.media.caption,
                        mimetype: options.media.mimetype ||
                            "application/octet-stream" ||
                            "image/jpeg",
                    });
                }
                break;
            case "video":
                if (options.media) {
                    result = await socket.sendMessage(options.to, {
                        video: typeof options.media.data === "string"
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
                        audio: typeof options.media.data === "string"
                            ? { url: options.media.data }
                            : options.media.data,
                        mimetype: options.media.mimetype || "audio/mp4",
                    });
                }
                break;
            case "document":
                if (options.media) {
                    result = await socket.sendMessage(options.to, {
                        document: typeof options.media.data === "string"
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
                        sticker: typeof options.media.data === "string"
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
        if (result) {
            const contact = await this.contactService.getContact(tenantId, options.to);
            if (contact) {
                await this.messageService.createMessage({
                    tenantId,
                    contactId: contact.id,
                    messageId: result.key.id,
                    type: options.type,
                    direction: Message_1.MessageDirection.OUTBOUND,
                    status: Message_1.MessageStatus.SENT,
                    content: options.content || options.media?.caption,
                    timestamp: new Date(),
                    quotedMessageId: options.quotedMessage,
                });
            }
        }
        return result;
    }
    async getConnectionStatus(sessionId) {
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
    async disconnectSession(sessionId) {
        const connection = this.connections.get(sessionId);
        if (!connection)
            return false;
        try {
            await connection.socket.logout();
            await this.authService.clearState(connection.tenantId, sessionId);
            this.connections.delete(sessionId);
            return true;
        }
        catch (error) {
            console.error("Error disconnecting session:", error);
            return false;
        }
    }
    async getAllConnections(tenantId) {
        const connections = [];
        for (const [sessionId, connection] of this.connections) {
            if (connection.tenantId === tenantId) {
                connections.push(connection);
            }
        }
        return connections;
    }
    getMessageType(message) {
        if (message.conversation || message.extendedTextMessage)
            return Message_1.MessageType.TEXT;
        if (message.imageMessage)
            return Message_1.MessageType.IMAGE;
        if (message.videoMessage)
            return Message_1.MessageType.VIDEO;
        if (message.audioMessage)
            return Message_1.MessageType.AUDIO;
        if (message.documentMessage)
            return Message_1.MessageType.DOCUMENT;
        if (message.stickerMessage)
            return Message_1.MessageType.STICKER;
        if (message.locationMessage)
            return Message_1.MessageType.LOCATION;
        if (message.contactMessage)
            return Message_1.MessageType.CONTACT;
        if (message.reactionMessage)
            return Message_1.MessageType.REACTION;
        if (message.pollCreationMessage)
            return Message_1.MessageType.POLL;
        return Message_1.MessageType.TEXT;
    }
    getMessageContent(message) {
        if (message.conversation)
            return message.conversation;
        if (message.extendedTextMessage)
            return message.extendedTextMessage.text;
        if (message.imageMessage)
            return message.imageMessage.caption || "";
        if (message.videoMessage)
            return message.videoMessage.caption || "";
        if (message.documentMessage)
            return message.documentMessage.caption || "";
        return "";
    }
    isMediaMessage(message) {
        return !!(message.imageMessage ||
            message.videoMessage ||
            message.audioMessage ||
            message.documentMessage ||
            message.stickerMessage);
    }
    getMediaInfo(message) {
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
                mimetype: message.documentMessage.mimetype || "application/octet-stream",
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
exports.WhatsAppService = WhatsAppService;
//# sourceMappingURL=WhatsAppService.js.map