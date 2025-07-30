import { Tenant } from "../entities/Tenant";
import { TenantConfig } from "../types/interfaces";
export declare class ConfigService {
    private tenantRepository;
    constructor();
    createTenant(data: Partial<Tenant>): Promise<Tenant>;
    getTenant(id: string): Promise<Tenant | null>;
    getTenantByApiKey(apiKey: string): Promise<Tenant | null>;
    updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant | null>;
    deleteTenant(id: string): Promise<boolean>;
    getAllTenants(): Promise<Tenant[]>;
    getTenantConfig(tenantId: string): Promise<TenantConfig | null>;
    updateTenantSettings(tenantId: string, settings: Record<string, any>): Promise<boolean>;
    private generateApiKey;
    validateApiKey(apiKey: string): Promise<Tenant | null>;
    getActiveTenants(): Promise<Tenant[]>;
}
