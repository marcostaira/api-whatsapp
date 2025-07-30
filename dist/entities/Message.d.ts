import { Tenant } from "./Tenant";
import { Contact } from "./Contact";
import { Media } from "./Media";
export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    VIDEO = "video",
    AUDIO = "audio",
    DOCUMENT = "document",
    STICKER = "sticker",
    LOCATION = "location",
    CONTACT = "contact",
    REACTION = "reaction",
    POLL = "poll",
    TEMPLATE = "template"
}
export declare enum MessageStatus {
    PENDING = "pending",
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read",
    FAILED = "failed"
}
export declare enum MessageDirection {
    INBOUND = "inbound",
    OUTBOUND = "outbound"
}
export declare class Message {
    id: string;
    tenantId: string;
    tenant: Tenant;
    contactId: string;
    contact: Contact;
    messageId: string;
    type: MessageType;
    direction: MessageDirection;
    status: MessageStatus;
    content: string;
    quotedMessageId: string;
    contextInfo: Record<string, any>;
    metadata: Record<string, any>;
    media: Media[];
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}
