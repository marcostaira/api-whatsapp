import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Tenant, TenantStatus } from "../entities/Tenant";
import { TenantConfig } from "../types/interfaces";

export class ConfigService {
  private tenantRepository: Repository<Tenant>;

  constructor() {
    this.tenantRepository = AppDataSource.getRepository(Tenant);
  }

  async createTenant(data: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.tenantRepository.create({
      ...data,
      apiKey: this.generateApiKey(),
      status: TenantStatus.ACTIVE,
    });

    return await this.tenantRepository.save(tenant);
  }

  async getTenant(id: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { id },
      relations: ["sessions", "contacts", "messages"],
    });
  }

  async getTenantByApiKey(apiKey: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { apiKey, status: TenantStatus.ACTIVE },
    });
  }

  async updateTenant(
    id: string,
    data: Partial<Tenant>
  ): Promise<Tenant | null> {
    await this.tenantRepository.update(id, data);
    return await this.getTenant(id);
  }

  async deleteTenant(id: string): Promise<boolean> {
    const result = await this.tenantRepository.update(id, {
      status: TenantStatus.SUSPENDED,
    });
    return result.affected ? result.affected > 0 : false;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await this.tenantRepository.find({
      where: { status: TenantStatus.ACTIVE },
    });
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return null;

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

  async updateTenantSettings(
    tenantId: string,
    settings: Record<string, any>
  ): Promise<boolean> {
    const result = await this.tenantRepository.update(tenantId, { settings });
    return result.affected ? result.affected > 0 : false;
  }

  private generateApiKey(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async validateApiKey(apiKey: string): Promise<Tenant | null> {
    return await this.getTenantByApiKey(apiKey);
  }

  async getActiveTenants(): Promise<Tenant[]> {
    return await this.tenantRepository.find({
      where: { status: TenantStatus.ACTIVE, autoReconnect: true },
    });
  }
}
