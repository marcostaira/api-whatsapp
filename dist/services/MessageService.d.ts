import { Message, MessageStatus } from "../entities/Message";
import { Media } from "../entities/Media";
import { MessageFilter } from "../types/interfaces";
export declare class MessageService {
    private messageRepository;
    private mediaRepository;
    constructor();
    createMessage(messageData: Partial<Message>): Promise<Message>;
    getMessage(messageId: string): Promise<Message | null>;
    getMessageById(id: string): Promise<Message | null>;
    getMessages(filter: MessageFilter): Promise<{
        messages: Message[];
        total: number;
    }>;
    updateMessageStatus(messageId: string, status: MessageStatus): Promise<boolean>;
    deleteMessage(messageId: string): Promise<boolean>;
    addMedia(messageId: string, mediaData: Partial<Media>): Promise<Media>;
    getMedia(mediaId: string): Promise<Media | null>;
    getMessagesByContact(tenantId: string, contactId: string, limit?: number): Promise<Message[]>;
    getUnreadMessages(tenantId: string): Promise<Message[]>;
    markAsRead(messageId: string): Promise<boolean>;
    getMessageStats(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<any>;
    searchMessages(tenantId: string, query: string, limit?: number): Promise<Message[]>;
    getQuotedMessage(messageId: string): Promise<Message | null>;
}
