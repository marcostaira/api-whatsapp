import { WhatsAppConnection, ConnectionOptions, SendMessageOptions } from "../types/interfaces";
export declare class WhatsAppService {
    private connections;
    private authService;
    private contactService;
    private messageService;
    private mediaService;
    private webhookService;
    private configService;
    constructor();
    createConnection(options: ConnectionOptions): Promise<{
        sessionId: string;
        qrCode?: string;
        pairingCode?: string;
    }>;
    private handleConnectionUpdate;
    private handleMessages;
    private handleMessageUpdates;
    private handleContacts;
    private handleGroups;
    private handlePresence;
    private saveContact;
    private saveMessage;
    private saveMediaMessage;
    sendMessage(tenantId: string, sessionId: string, options: SendMessageOptions): Promise<any>;
    getConnectionStatus(sessionId: string): Promise<{
        isConnected: boolean;
        qrCode?: string;
        pairingCode?: string;
    }>;
    disconnectSession(sessionId: string): Promise<boolean>;
    getAllConnections(tenantId: string): Promise<WhatsAppConnection[]>;
    private getMessageType;
    private getMessageContent;
    private isMediaMessage;
    private getMediaInfo;
}
