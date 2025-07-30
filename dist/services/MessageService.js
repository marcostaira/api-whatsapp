"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const database_1 = require("../config/database");
const Message_1 = require("../entities/Message");
const Media_1 = require("../entities/Media");
class MessageService {
    constructor() {
        this.messageRepository = database_1.AppDataSource.getRepository(Message_1.Message);
        this.mediaRepository = database_1.AppDataSource.getRepository(Media_1.Media);
    }
    async createMessage(messageData) {
        const message = this.messageRepository.create(messageData);
        return await this.messageRepository.save(message);
    }
    async getMessage(messageId) {
        return await this.messageRepository.findOne({
            where: { messageId },
            relations: ["contact", "media"],
        });
    }
    async getMessageById(id) {
        return await this.messageRepository.findOne({
            where: { id },
            relations: ["contact", "media"],
        });
    }
    async getMessages(filter) {
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
    async updateMessageStatus(messageId, status) {
        const result = await this.messageRepository.update({ messageId }, { status });
        return result.affected ? result.affected > 0 : false;
    }
    async deleteMessage(messageId) {
        const result = await this.messageRepository.delete({ messageId });
        return result.affected ? result.affected > 0 : false;
    }
    async addMedia(messageId, mediaData) {
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
    async getMedia(mediaId) {
        return await this.mediaRepository.findOne({
            where: { id: mediaId },
            relations: ["message"],
        });
    }
    async getMessagesByContact(tenantId, contactId, limit = 50) {
        return await this.messageRepository.find({
            where: { tenantId, contactId },
            relations: ["media"],
            order: { timestamp: "DESC" },
            take: limit,
        });
    }
    async getUnreadMessages(tenantId) {
        return await this.messageRepository.find({
            where: {
                tenantId,
                direction: Message_1.MessageDirection.INBOUND,
                status: Message_1.MessageStatus.DELIVERED,
            },
            relations: ["contact"],
        });
    }
    async markAsRead(messageId) {
        return await this.updateMessageStatus(messageId, Message_1.MessageStatus.READ);
    }
    async getMessageStats(tenantId, dateFrom, dateTo) {
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
            direction: Message_1.MessageDirection.OUTBOUND,
        })
            .getCount();
        const received = await queryBuilder
            .clone()
            .andWhere("message.direction = :direction", {
            direction: Message_1.MessageDirection.INBOUND,
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
    async searchMessages(tenantId, query, limit = 20) {
        return await this.messageRepository
            .createQueryBuilder("message")
            .leftJoinAndSelect("message.contact", "contact")
            .where("message.tenantId = :tenantId", { tenantId })
            .andWhere("message.content LIKE :query", { query: `%${query}%` })
            .orderBy("message.timestamp", "DESC")
            .limit(limit)
            .getMany();
    }
    async getQuotedMessage(messageId) {
        const message = await this.getMessage(messageId);
        if (!message?.quotedMessageId)
            return null;
        return await this.getMessage(message.quotedMessageId);
    }
}
exports.MessageService = MessageService;
//# sourceMappingURL=MessageService.js.map