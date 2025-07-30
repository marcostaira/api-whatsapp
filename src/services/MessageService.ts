import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import {
  Message,
  MessageType,
  MessageStatus,
  MessageDirection,
} from "../entities/Message";
import { Media } from "../entities/Media";
import { MessageFilter } from "../types/interfaces";

export class MessageService {
  private messageRepository: Repository<Message>;
  private mediaRepository: Repository<Media>;

  constructor() {
    this.messageRepository = AppDataSource.getRepository(Message);
    this.mediaRepository = AppDataSource.getRepository(Media);
  }

  async createMessage(messageData: Partial<Message>): Promise<Message> {
    const message = this.messageRepository.create(messageData);
    return await this.messageRepository.save(message);
  }

  async getMessage(messageId: string): Promise<Message | null> {
    return await this.messageRepository.findOne({
      where: { messageId },
      relations: ["contact", "media"],
    });
  }

  async getMessageById(id: string): Promise<Message | null> {
    return await this.messageRepository.findOne({
      where: { id },
      relations: ["contact", "media"],
    });
  }

  async getMessages(
    filter: MessageFilter
  ): Promise<{ messages: Message[]; total: number }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.contact", "contact")
      .leftJoinAndSelect("message.media", "media");

    if (filter.tenantId) {
      queryBuilder.andWhere("message.tenantId = :tenantId", {
        tenantId: filter.tenantId,
      });
    }

    if (filter.contactId) {
      queryBuilder.andWhere("message.contactId = :contactId", {
        contactId: filter.contactId,
      });
    }

    if (filter.type) {
      queryBuilder.andWhere("message.type = :type", { type: filter.type });
    }

    if (filter.direction) {
      queryBuilder.andWhere("message.direction = :direction", {
        direction: filter.direction,
      });
    }

    if (filter.status) {
      queryBuilder.andWhere("message.status = :status", {
        status: filter.status,
      });
    }

    if (filter.dateFrom) {
      queryBuilder.andWhere("message.timestamp >= :dateFrom", {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      queryBuilder.andWhere("message.timestamp <= :dateTo", {
        dateTo: filter.dateTo,
      });
    }

    queryBuilder.orderBy("message.timestamp", "DESC");

    const total = await queryBuilder.getCount();

    if (filter.limit) {
      queryBuilder.limit(filter.limit);
    }

    if (filter.offset) {
      queryBuilder.offset(filter.offset);
    }

    const messages = await queryBuilder.getMany();

    return { messages, total };
  }

  async updateMessageStatus(
    messageId: string,
    status: MessageStatus
  ): Promise<boolean> {
    const result = await this.messageRepository.update(
      { messageId },
      { status }
    );
    return result.affected ? result.affected > 0 : false;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const result = await this.messageRepository.delete({ messageId });
    return result.affected ? result.affected > 0 : false;
  }

  async addMedia(messageId: string, mediaData: Partial<Media>): Promise<Media> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });
    if (!message) {
      throw new Error("Message not found");
    }

    const media = this.mediaRepository.create({
      messageId,
      ...mediaData,
    });

    return await this.mediaRepository.save(media);
  }

  async getMedia(mediaId: string): Promise<Media | null> {
    return await this.mediaRepository.findOne({
      where: { id: mediaId },
      relations: ["message"],
    });
  }

  async getMessagesByContact(
    tenantId: string,
    contactId: string,
    limit: number = 50
  ): Promise<Message[]> {
    return await this.messageRepository.find({
      where: { tenantId, contactId },
      relations: ["media"],
      order: { timestamp: "DESC" },
      take: limit,
    });
  }

  async getUnreadMessages(tenantId: string): Promise<Message[]> {
    return await this.messageRepository.find({
      where: {
        tenantId,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.DELIVERED,
      },
      relations: ["contact"],
    });
  }

  async markAsRead(messageId: string): Promise<boolean> {
    return await this.updateMessageStatus(messageId, MessageStatus.READ);
  }

  async getMessageStats(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder("message")
      .where("message.tenantId = :tenantId", { tenantId });

    if (dateFrom) {
      queryBuilder.andWhere("message.timestamp >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere("message.timestamp <= :dateTo", { dateTo });
    }

    const total = await queryBuilder.getCount();

    const sent = await queryBuilder
      .clone()
      .andWhere("message.direction = :direction", {
        direction: MessageDirection.OUTBOUND,
      })
      .getCount();

    const received = await queryBuilder
      .clone()
      .andWhere("message.direction = :direction", {
        direction: MessageDirection.INBOUND,
      })
      .getCount();

    const byType = await queryBuilder
      .clone()
      .select("message.type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("message.type")
      .getRawMany();

    return {
      total,
      sent,
      received,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  async searchMessages(
    tenantId: string,
    query: string,
    limit: number = 20
  ): Promise<Message[]> {
    return await this.messageRepository
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.contact", "contact")
      .where("message.tenantId = :tenantId", { tenantId })
      .andWhere("message.content LIKE :query", { query: `%${query}%` })
      .orderBy("message.timestamp", "DESC")
      .limit(limit)
      .getMany();
  }

  async getQuotedMessage(messageId: string): Promise<Message | null> {
    const message = await this.getMessage(messageId);
    if (!message?.quotedMessageId) return null;

    return await this.getMessage(message.quotedMessageId);
  }
}
