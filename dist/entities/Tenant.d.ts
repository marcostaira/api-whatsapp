import { Session } from "./Session";
import { Contact } from "./Contact";
import { Message } from "./Message";
export declare enum TenantStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
export declare class Tenant {
    id: string;
    name: string;
    apiKey: string;
    status: TenantStatus;
    receiveGroupMessages: boolean;
    autoReconnect: boolean;
    webhookUrl: string;
    settings: Record<string, any>;
    sessions: Session[];
    contacts: Contact[];
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}
