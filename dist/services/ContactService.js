"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const database_1 = require("../config/database");
const Contact_1 = require("../entities/Contact");
class ContactService {
    constructor() {
        this.contactRepository = database_1.AppDataSource.getRepository(Contact_1.Contact);
    }
    async createOrUpdateContact(tenantId, contactData) {
        const existingContact = await this.contactRepository.findOne({
            where: { tenantId, whatsappId: contactData.whatsappId },
        });
        if (existingContact) {
            await this.contactRepository.update(existingContact.id, contactData);
            return (await this.contactRepository.findOne({
                where: { id: existingContact.id },
            }));
        }
        const contact = this.contactRepository.create({
            tenantId,
            ...contactData,
        });
        return await this.contactRepository.save(contact);
    }
    async getContact(tenantId, whatsappId) {
        return await this.contactRepository.findOne({
            where: { tenantId, whatsappId },
        });
    }
    async getContactById(contactId) {
        return await this.contactRepository.findOne({
            where: { id: contactId },
            relations: ["messages"],
        });
    }
    async getContacts(filter) {
        const queryBuilder = this.contactRepository.createQueryBuilder("contact");
        if (filter.tenantId) {
            queryBuilder.andWhere("contact.tenantId = :tenantId", {
                tenantId: filter.tenantId,
            });
        }
        if (filter.isGroup !== undefined) {
            queryBuilder.andWhere("contact.isGroup = :isGroup", {
                isGroup: filter.isGroup,
            });
        }
        if (filter.isBlocked !== undefined) {
            queryBuilder.andWhere("contact.isBlocked = :isBlocked", {
                isBlocked: filter.isBlocked,
            });
        }
        if (filter.search) {
            queryBuilder.andWhere("(contact.name LIKE :search OR contact.pushName LIKE :search OR contact.whatsappId LIKE :search)", { search: `%${filter.search}%` });
        }
        queryBuilder.orderBy("contact.updatedAt", "DESC");
        const total = await queryBuilder.getCount();
        if (filter.limit) {
            queryBuilder.limit(filter.limit);
        }
        if (filter.offset) {
            queryBuilder.offset(filter.offset);
        }
        const contacts = await queryBuilder.getMany();
        return { contacts, total };
    }
    async updateContact(contactId, data) {
        await this.contactRepository.update(contactId, data);
        return await this.getContactById(contactId);
    }
    async blockContact(tenantId, whatsappId) {
        const result = await this.contactRepository.update({ tenantId, whatsappId }, { isBlocked: true });
        return result.affected ? result.affected > 0 : false;
    }
    async unblockContact(tenantId, whatsappId) {
        const result = await this.contactRepository.update({ tenantId, whatsappId }, { isBlocked: false });
        return result.affected ? result.affected > 0 : false;
    }
    async deleteContact(contactId) {
        const result = await this.contactRepository.delete(contactId);
        return result.affected ? result.affected > 0 : false;
    }
    async updateLastSeen(tenantId, whatsappId) {
        await this.contactRepository.update({ tenantId, whatsappId }, { lastSeenAt: new Date() });
    }
    async getGroupContacts(tenantId) {
        return await this.contactRepository.find({
            where: { tenantId, isGroup: true },
        });
    }
    async getBusinessContacts(tenantId) {
        return await this.contactRepository.find({
            where: { tenantId, isBusiness: true },
        });
    }
    async searchContacts(tenantId, query, limit = 20) {
        return await this.contactRepository
            .createQueryBuilder("contact")
            .where("contact.tenantId = :tenantId", { tenantId })
            .andWhere("(contact.name LIKE :query OR contact.pushName LIKE :query OR contact.whatsappId LIKE :query)", { query: `%${query}%` })
            .limit(limit)
            .getMany();
    }
    async updateContactMetadata(tenantId, whatsappId, metadata) {
        await this.contactRepository.update({ tenantId, whatsappId }, { metadata });
    }
}
exports.ContactService = ContactService;
//# sourceMappingURL=ContactService.js.map