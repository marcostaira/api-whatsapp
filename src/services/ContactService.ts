import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Contact } from "../entities/Contact";
import { ContactFilter } from "../types/interfaces";

export class ContactService {
  private contactRepository: Repository<Contact>;

  constructor() {
    this.contactRepository = AppDataSource.getRepository(Contact);
  }

  async createOrUpdateContact(
    tenantId: string,
    contactData: Partial<Contact>
  ): Promise<Contact> {
    const existingContact = await this.contactRepository.findOne({
      where: { tenantId, whatsappId: contactData.whatsappId },
    });

    if (existingContact) {
      await this.contactRepository.update(existingContact.id, contactData);
      return (await this.contactRepository.findOne({
        where: { id: existingContact.id },
      })) as Contact;
    }

    const contact = this.contactRepository.create({
      tenantId,
      ...contactData,
    });

    return await this.contactRepository.save(contact);
  }

  async getContact(
    tenantId: string,
    whatsappId: string
  ): Promise<Contact | null> {
    return await this.contactRepository.findOne({
      where: { tenantId, whatsappId },
    });
  }

  async getContactById(contactId: string): Promise<Contact | null> {
    return await this.contactRepository.findOne({
      where: { id: contactId },
      relations: ["messages"],
    });
  }

  async getContacts(
    filter: ContactFilter
  ): Promise<{ contacts: Contact[]; total: number }> {
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
      queryBuilder.andWhere(
        "(contact.name LIKE :search OR contact.pushName LIKE :search OR contact.whatsappId LIKE :search)",
        { search: `%${filter.search}%` }
      );
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

  async updateContact(
    contactId: string,
    data: Partial<Contact>
  ): Promise<Contact | null> {
    await this.contactRepository.update(contactId, data);
    return await this.getContactById(contactId);
  }

  async blockContact(tenantId: string, whatsappId: string): Promise<boolean> {
    const result = await this.contactRepository.update(
      { tenantId, whatsappId },
      { isBlocked: true }
    );
    return result.affected ? result.affected > 0 : false;
  }

  async unblockContact(tenantId: string, whatsappId: string): Promise<boolean> {
    const result = await this.contactRepository.update(
      { tenantId, whatsappId },
      { isBlocked: false }
    );
    return result.affected ? result.affected > 0 : false;
  }

  async deleteContact(contactId: string): Promise<boolean> {
    const result = await this.contactRepository.delete(contactId);
    return result.affected ? result.affected > 0 : false;
  }

  async updateLastSeen(tenantId: string, whatsappId: string): Promise<void> {
    await this.contactRepository.update(
      { tenantId, whatsappId },
      { lastSeenAt: new Date() }
    );
  }

  async getGroupContacts(tenantId: string): Promise<Contact[]> {
    return await this.contactRepository.find({
      where: { tenantId, isGroup: true },
    });
  }

  async getBusinessContacts(tenantId: string): Promise<Contact[]> {
    return await this.contactRepository.find({
      where: { tenantId, isBusiness: true },
    });
  }

  async searchContacts(
    tenantId: string,
    query: string,
    limit: number = 20
  ): Promise<Contact[]> {
    return await this.contactRepository
      .createQueryBuilder("contact")
      .where("contact.tenantId = :tenantId", { tenantId })
      .andWhere(
        "(contact.name LIKE :query OR contact.pushName LIKE :query OR contact.whatsappId LIKE :query)",
        { query: `%${query}%` }
      )
      .limit(limit)
      .getMany();
  }

  async updateContactMetadata(
    tenantId: string,
    whatsappId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await this.contactRepository.update({ tenantId, whatsappId }, { metadata });
  }
}
