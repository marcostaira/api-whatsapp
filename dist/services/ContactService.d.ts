import { Contact } from "../entities/Contact";
import { ContactFilter } from "../types/interfaces";
export declare class ContactService {
    private contactRepository;
    constructor();
    createOrUpdateContact(tenantId: string, contactData: Partial<Contact>): Promise<Contact>;
    getContact(tenantId: string, whatsappId: string): Promise<Contact | null>;
    getContactById(contactId: string): Promise<Contact | null>;
    getContacts(filter: ContactFilter): Promise<{
        contacts: Contact[];
        total: number;
    }>;
    updateContact(contactId: string, data: Partial<Contact>): Promise<Contact | null>;
    blockContact(tenantId: string, whatsappId: string): Promise<boolean>;
    unblockContact(tenantId: string, whatsappId: string): Promise<boolean>;
    deleteContact(contactId: string): Promise<boolean>;
    updateLastSeen(tenantId: string, whatsappId: string): Promise<void>;
    getGroupContacts(tenantId: string): Promise<Contact[]>;
    getBusinessContacts(tenantId: string): Promise<Contact[]>;
    searchContacts(tenantId: string, query: string, limit?: number): Promise<Contact[]>;
    updateContactMetadata(tenantId: string, whatsappId: string, metadata: Record<string, any>): Promise<void>;
}
