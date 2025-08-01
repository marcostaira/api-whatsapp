import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Tenant, TenantStatus } from "../entities/Tenant";
import { randomBytes } from "crypto";

export interface CreateTenantOptions {
  name: string;
  receiveGroupMessages?: boolean;
  autoReconnect?: boolean;
  webhookUrl?: string;
  maxConnections?: number;
}

export interface UpdateTenantOptions {
  name?: string;
  receiveGroupMessages?: boolean;
  autoReconnect?: boolean;
  webhookUrl?: string;
  maxConnections?: number;
  status?: TenantStatus;
}

export class ConfigService {
  private tenantRepository: Repository<Tenant>;

  constructor() {
    this.tenantRepository = AppDataSource.getRepository(Tenant);
  }

  /**
   * Criar um novo tenant
   */
  async createTenant(options: CreateTenantOptions): Promise<Tenant> {
    try {
      const apiKey = this.generateApiKey();

      const tenant = this.tenantRepository.create({
        name: options.name,
        apiKey,
        receiveGroupMessages: options.receiveGroupMessages ?? true,
        autoReconnect: options.autoReconnect ?? true,
        webhookUrl: options.webhookUrl,
        maxConnections: options.maxConnections ?? 5,
        status: TenantStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedTenant = await this.tenantRepository.save(tenant);

      console.log(`✅ Tenant created: ${savedTenant.name} (${savedTenant.id})`);
      return savedTenant;
    } catch (error: any) {
      console.error("❌ Error creating tenant:", error.message);
      throw error;
    }
  }

  /**
   * Obter tenant por ID
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
        relations: ["sessions"],
      });

      return tenant;
    } catch (error: any) {
      console.error("❌ Error getting tenant:", error.message);
      return null;
    }
  }

  /**
   * Obter tenant por API Key
   */
  async getTenantByApiKey(apiKey: string): Promise<Tenant | null> {
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { apiKey, status: TenantStatus.ACTIVE },
        relations: ["sessions"],
      });

      return tenant;
    } catch (error: any) {
      console.error("❌ Error getting tenant by API key:", error.message);
      return null;
    }
  }

  /**
   * Validar API Key
   */
  async validateApiKey(apiKey: string): Promise<Tenant | null> {
    if (!apiKey) return null;

    // Remove 'Bearer ' prefix if present
    const cleanApiKey = apiKey.replace(/^Bearer\s+/i, "");

    const tenant = await this.getTenantByApiKey(cleanApiKey);

    if (!tenant) {
      console.log(
        `⚠️ Invalid API key attempt: ${cleanApiKey.substring(0, 8)}...`
      );
      return null;
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      console.log(`⚠️ Inactive tenant access attempt: ${tenant.name}`);
      return null;
    }

    return tenant;
  }

  /**
   * Listar todos os tenants
   */
  async getAllTenants(): Promise<Tenant[]> {
    try {
      return await this.tenantRepository.find({
        relations: ["sessions"],
        order: { createdAt: "DESC" },
      });
    } catch (error: any) {
      console.error("❌ Error getting all tenants:", error.message);
      return [];
    }
  }

  /**
   * Atualizar tenant
   */
  async updateTenant(
    tenantId: string,
    options: UpdateTenantOptions
  ): Promise<Tenant | null> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error("Tenant not found");
      }

      const updateData = {
        ...options,
        updatedAt: new Date(),
      };

      await this.tenantRepository.update(tenantId, updateData);

      const updatedTenant = await this.getTenant(tenantId);

      console.log(`✅ Tenant updated: ${tenant.name} (${tenantId})`);
      return updatedTenant;
    } catch (error: any) {
      console.error("❌ Error updating tenant:", error.message);
      throw error;
    }
  }

  /**
   * Deletar tenant
   */
  async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error("Tenant not found");
      }

      // Soft delete - apenas marcar como inativo
      await this.tenantRepository.update(tenantId, {
        status: TenantStatus.INACTIVE,
        updatedAt: new Date(),
      });

      console.log(`✅ Tenant deleted: ${tenant.name} (${tenantId})`);
      return true;
    } catch (error: any) {
      console.error("❌ Error deleting tenant:", error.message);
      return false;
    }
  }

  /**
   * Regenerar API Key de um tenant
   */
  async regenerateApiKey(tenantId: string): Promise<string | null> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error("Tenant not found");
      }

      const newApiKey = this.generateApiKey();

      await this.tenantRepository.update(tenantId, {
        apiKey: newApiKey,
        updatedAt: new Date(),
      });

      console.log(
        `✅ API Key regenerated for tenant: ${tenant.name} (${tenantId})`
      );
      return newApiKey;
    } catch (error: any) {
      console.error("❌ Error regenerating API key:", error.message);
      return null;
    }
  }

  /**
   * Obter tenants com auto-reconnect habilitado
   */
  async getTenantsWithAutoReconnect(): Promise<Tenant[]> {
    try {
      return await this.tenantRepository.find({
        where: {
          autoReconnect: true,
          status: TenantStatus.ACTIVE,
        },
        relations: ["sessions"],
        order: { createdAt: "ASC" },
      });
    } catch (error: any) {
      console.error(
        "❌ Error getting tenants with auto-reconnect:",
        error.message
      );
      return [];
    }
  }

  /**
   * Obter estatísticas dos tenants
   */
  async getTenantStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    withAutoReconnect: number;
    totalSessions: number;
  }> {
    try {
      const [tenants, totalCount] = await this.tenantRepository.findAndCount({
        relations: ["sessions"],
      });

      const stats = {
        total: totalCount,
        active: 0,
        inactive: 0,
        withAutoReconnect: 0,
        totalSessions: 0,
      };

      for (const tenant of tenants) {
        switch (tenant.status) {
          case TenantStatus.ACTIVE:
            stats.active++;
            break;
          case TenantStatus.INACTIVE:
            stats.inactive++;
            break;
        }

        if (tenant.autoReconnect) {
          stats.withAutoReconnect++;
        }

        stats.totalSessions += tenant.sessions?.length || 0;
      }

      return stats;
    } catch (error: any) {
      console.error("❌ Error getting tenant stats:", error.message);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        withAutoReconnect: 0,
        totalSessions: 0,
      };
    }
  }

  /**
   * Verificar se o tenant pode criar mais conexões
   */
  async canCreateConnection(tenantId: string): Promise<boolean> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) return false;

      if (tenant.status !== TenantStatus.ACTIVE) return false;

      const currentConnections = tenant.sessions?.length || 0;
      return currentConnections < tenant.maxConnections;
    } catch (error: any) {
      console.error("❌ Error checking connection limit:", error.message);
      return false;
    }
  }

  /**
   * Obter uso atual de conexões do tenant
   */
  async getConnectionUsage(tenantId: string): Promise<{
    current: number;
    max: number;
    available: number;
    percentage: number;
  }> {
    try {
      const tenant = await this.getTenant(tenantId);

      if (!tenant) {
        return { current: 0, max: 0, available: 0, percentage: 0 };
      }

      const current = tenant.sessions?.length || 0;
      const max = tenant.maxConnections;
      const available = Math.max(0, max - current);
      const percentage = max > 0 ? Math.round((current / max) * 100) : 0;

      return { current, max, available, percentage };
    } catch (error: any) {
      console.error("❌ Error getting connection usage:", error.message);
      return { current: 0, max: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Buscar tenants por nome
   */
  async searchTenants(query: string): Promise<Tenant[]> {
    try {
      return await this.tenantRepository
        .createQueryBuilder("tenant")
        .where("tenant.name LIKE :query", { query: `%${query}%` })
        .orderBy("tenant.createdAt", "DESC")
        .getMany();
    } catch (error: any) {
      console.error("❌ Error searching tenants:", error.message);
      return [];
    }
  }

  /**
   * Gerar API Key segura
   */
  private generateApiKey(): string {
    const prefix = "wa_";
    const randomPart = randomBytes(32).toString("hex");
    return `${prefix}${randomPart}`;
  }

  /**
   * Validar configurações do tenant
   */
  validateTenantConfig(options: CreateTenantOptions | UpdateTenantOptions): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validar nome (apenas para criação)
    if ("name" in options && options.name) {
      if (options.name.length < 2) {
        errors.push("Name must be at least 2 characters long");
      }
      if (options.name.length > 100) {
        errors.push("Name must be less than 100 characters");
      }
    }

    // Validar webhook URL
    if (options.webhookUrl) {
      try {
        new URL(options.webhookUrl);
        if (!options.webhookUrl.startsWith("https://")) {
          errors.push("Webhook URL must use HTTPS");
        }
      } catch {
        errors.push("Invalid webhook URL format");
      }
    }

    // Validar maxConnections
    if (options.maxConnections !== undefined) {
      if (options.maxConnections < 1 || options.maxConnections > 50) {
        errors.push("Max connections must be between 1 and 50");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Cleanup - remover tenants inativos antigos
   */
  async cleanupInactiveTenants(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.tenantRepository
        .createQueryBuilder()
        .delete()
        .where("status = :status", { status: TenantStatus.INACTIVE })
        .andWhere("updatedAt < :cutoffDate", { cutoffDate })
        .execute();

      const deletedCount = result.affected || 0;

      if (deletedCount > 0) {
        console.log(`✅ Cleaned up ${deletedCount} inactive tenant(s)`);
      }

      return deletedCount;
    } catch (error: any) {
      console.error("❌ Error cleaning up inactive tenants:", error.message);
      return 0;
    }
  }
}
