"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const database_1 = require("../config/database");
const Tenant_1 = require("../entities/Tenant");
class ConfigService {
    constructor() {
        this.tenantRepository = database_1.AppDataSource.getRepository(Tenant_1.Tenant);
    }
    async createTenant(data) {
        const tenant = this.tenantRepository.create({
            ...data,
            apiKey: this.generateApiKey(),
            status: Tenant_1.TenantStatus.ACTIVE,
        });
        return await this.tenantRepository.save(tenant);
    }
    async getTenant(id) {
        return await this.tenantRepository.findOne({
            where: { id },
            relations: ["sessions", "contacts", "messages"],
        });
    }
    async getTenantByApiKey(apiKey) {
        return await this.tenantRepository.findOne({
            where: { apiKey, status: Tenant_1.TenantStatus.ACTIVE },
        });
    }
    async updateTenant(id, data) {
        await this.tenantRepository.update(id, data);
        return await this.getTenant(id);
    }
    async deleteTenant(id) {
        const result = await this.tenantRepository.update(id, {
            status: Tenant_1.TenantStatus.SUSPENDED,
        });
        return result.affected ? result.affected > 0 : false;
    }
    async getAllTenants() {
        return await this.tenantRepository.find({
            where: { status: Tenant_1.TenantStatus.ACTIVE },
        });
    }
    async getTenantConfig(tenantId) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant)
            return null;
        return {
            id: tenant.id,
            name: tenant.name,
            apiKey: tenant.apiKey,
            receiveGroupMessages: tenant.receiveGroupMessages,
            autoReconnect: tenant.autoReconnect,
            webhookUrl: tenant.webhookUrl,
            settings: tenant.settings,
        };
    }
    async updateTenantSettings(tenantId, settings) {
        const result = await this.tenantRepository.update(tenantId, { settings });
        return result.affected ? result.affected > 0 : false;
    }
    generateApiKey() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    async validateApiKey(apiKey) {
        return await this.getTenantByApiKey(apiKey);
    }
    async getActiveTenants() {
        return await this.tenantRepository.find({
            where: { status: Tenant_1.TenantStatus.ACTIVE, autoReconnect: true },
        });
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=ConfigService.js.map