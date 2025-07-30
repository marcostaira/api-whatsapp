import { Tenant } from "./Tenant";
import { Message } from "./Message";
export declare class Contact {
    id: string;
    tenantId: string;
    tenant: Tenant;
    whatsappId: string;
    name: string;
    pushName: string;
    profilePicture: string;
    status: string;
    isGroup: boolean;
    isBlocked: boolean;
    isBusiness: boolean;
    metadata: Record<string, any>;
    messages: Message[];
    lastSeenAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
