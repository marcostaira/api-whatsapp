import { WhatsAppService } from "./WhatsAppService";
import { ConfigService } from "./ConfigService";
import { AuthService } from "./AuthService";
import { SessionStatus } from "../entities/Session";
import { AppDataSource } from "../config/database";
import { Session } from "../entities/Session";
import * as cron from "node-cron";

/**
 * Connection Manager para gerenciar conexões WhatsApp de forma robusta
 * - Auto-reconexão
 * - Health checks
 * - Cleanup de sessões antigas
 * - Monitoramento de performance
 */
export class ConnectionManager {
  private whatsappService: WhatsAppService;
  private configService: ConfigService;
  private authService: AuthService;
  private healthCheckInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.configService = new ConfigService();
    this.authService = new AuthService();
    this.startMonitoring();
  }

  /**
   * Inicia o monitoramento automático
   */
  private startMonitoring(): void {
    console.log("🚀 Starting Connection Manager monitoring...");

    // Health check a cada 30 segundos
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);

    // Cleanup de sessões antigas a cada hora
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupOldSessions();
    }, 3600000);

    // Cron job para reconectar sessões perdidas (a cada 5 minutos)
    cron.schedule("*/5 * * * *", async () => {
      await this.reconnectLostSessions();
    });

    console.log("✅ Connection Manager monitoring started");
  }

  /**
   * Verifica a saúde das conexões ativas
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const activeSessions = await this.authService.getActiveSessions();

      for (const session of activeSessions) {
        try {
          const status = await this.whatsappService.getConnectionStatus(
            session.sessionId
          );

          // Se a sessão está marcada como conectada no DB mas não está realmente conectada
          if (
            !status.isConnected &&
            session.status === SessionStatus.CONNECTED
          ) {
            console.log(
              `⚠️ Health check failed for session: ${session.sessionId}`
            );

            await this.authService.updateSessionStatus(
              session.tenantId,
              session.sessionId,
              SessionStatus.DISCONNECTED
            );

            // Tentar reconectar se auto-reconnect está habilitado
            const tenant = await this.configService.getTenant(session.tenantId);
            if (tenant?.autoReconnect) {
              console.log(
                `🔄 Auto-reconnecting unhealthy session: ${session.sessionId}`
              );
              setTimeout(async () => {
                try {
                  await this.whatsappService.createConnection({
                    tenantId: session.tenantId,
                  });
                } catch (error: any) {
                  console.error(
                    `❌ Failed to reconnect session ${session.sessionId}:`,
                    error.message
                  );
                }
              }, 5000);
            }
          }
        } catch (error: any) {
          console.error(
            `❌ Health check error for session ${session.sessionId}:`,
            error.message
          );
        }
      }
    } catch (error: any) {
      console.error("❌ Health check error:", error.message);
    }
  }

  /**
   * Remove sessões antigas que não foram utilizadas
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      console.log("🧹 Starting cleanup of old sessions...");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 dias atrás

      // Buscar sessões desconectadas há mais de 7 dias
      const sessionRepository = AppDataSource.getRepository(Session);
      const oldSessions = await sessionRepository
        .createQueryBuilder("session")
        .where("session.status = :status", {
          status: SessionStatus.DISCONNECTED,
        })
        .andWhere("session.lastDisconnectedAt < :cutoffDate", { cutoffDate })
        .getMany();

      for (const session of oldSessions) {
        try {
          console.log(`🗑️ Removing old session: ${session.sessionId}`);
          await this.authService.removeSession(
            session.tenantId,
            session.sessionId
          );
        } catch (error: any) {
          console.error(
            `❌ Error removing session ${session.sessionId}:`,
            error.message
          );
        }
      }

      console.log(
        `✅ Cleanup completed. Removed ${oldSessions.length} old sessions`
      );
    } catch (error: any) {
      console.error("❌ Cleanup error:", error.message);
    }
  }

  /**
   * Reconecta sessões que perderam conexão inesperadamente
   */
  private async reconnectLostSessions(): Promise<void> {
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const lostSessions = await sessionRepository
        .createQueryBuilder("session")
        .leftJoin("session.tenant", "tenant")
        .where("session.status = :status", {
          status: SessionStatus.DISCONNECTED,
        })
        .andWhere("tenant.autoReconnect = :autoReconnect", {
          autoReconnect: true,
        })
        .andWhere("session.lastDisconnectedAt > :recentDate", {
          recentDate: new Date(Date.now() - 1800000), // Últimos 30 minutos
        })
        .select(["session", "tenant.id", "tenant.autoReconnect"])
        .getMany();

      for (const session of lostSessions) {
        try {
          console.log(
            `🔄 Attempting to reconnect lost session: ${session.sessionId}`
          );

          await this.whatsappService.createConnection({
            tenantId: session.tenantId,
          });
        } catch (error: any) {
          console.error(
            `❌ Failed to reconnect lost session ${session.sessionId}:`,
            error.message
          );
        }
      }
    } catch (error: any) {
      console.error("❌ Reconnect lost sessions error:", error.message);
    }
  }

  /**
   * Cria uma nova conexão com retry automático
   */
  async createConnectionWithRetry(
    tenantId: string,
    options: {
      usePairingCode?: boolean;
      phoneNumber?: string;
      maxRetries?: number;
    } = {}
  ): Promise<{ sessionId: string; qrCode?: string; pairingCode?: string }> {
    const { maxRetries = 3, ...connectionOptions } = options;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Connection attempt ${attempt}/${maxRetries} for tenant: ${tenantId}`
        );

        const result = await this.whatsappService.createConnection({
          tenantId,
          ...connectionOptions,
        });

        console.log(
          `✅ Connection successful on attempt ${attempt} for tenant: ${tenantId}`
        );
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(
          `❌ Connection attempt ${attempt} failed for tenant ${tenantId}:`,
          error.message
        );

        if (attempt < maxRetries) {
          const delay = 1000 * attempt; // Increasing delay
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to create connection after ${maxRetries} attempts: ${
        lastError!.message
      }`
    );
  }

  /**
   * Obtém estatísticas das conexões
   */
  async getConnectionStats(): Promise<{
    total: number;
    connected: number;
    connecting: number;
    disconnected: number;
    byTenant: { [tenantId: string]: { connected: number; total: number } };
  }> {
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const sessions = await sessionRepository.find({
        relations: ["tenant"],
      });

      const stats = {
        total: sessions.length,
        connected: 0,
        connecting: 0,
        disconnected: 0,
        byTenant: {} as {
          [tenantId: string]: { connected: number; total: number };
        },
      };

      for (const session of sessions) {
        // Count by status
        switch (session.status) {
          case SessionStatus.CONNECTED:
            stats.connected++;
            break;
          case SessionStatus.CONNECTING:
            stats.connecting++;
            break;
          case SessionStatus.DISCONNECTED:
            stats.disconnected++;
            break;
        }

        // Count by tenant
        if (!stats.byTenant[session.tenantId]) {
          stats.byTenant[session.tenantId] = { connected: 0, total: 0 };
        }
        stats.byTenant[session.tenantId].total++;
        if (session.status === SessionStatus.CONNECTED) {
          stats.byTenant[session.tenantId].connected++;
        }
      }

      return stats;
    } catch (error: any) {
      console.error("❌ Error getting connection stats:", error.message);
      return {
        total: 0,
        connected: 0,
        connecting: 0,
        disconnected: 0,
        byTenant: {},
      };
    }
  }

  /**
   * Força a reconexão de todas as sessões de um tenant
   */
  async reconnectTenant(tenantId: string): Promise<void> {
    try {
      console.log(`🔄 Reconnecting all sessions for tenant: ${tenantId}`);

      const sessions = await this.authService.getAllSessions(tenantId);

      for (const session of sessions) {
        try {
          // Desconectar sessão atual se existir
          await this.whatsappService.disconnectSession(session.sessionId);

          // Aguardar um pouco antes de reconectar
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Criar nova conexão
          await this.whatsappService.createConnection({
            tenantId: session.tenantId,
          });
        } catch (error: any) {
          console.error(
            `❌ Error reconnecting session ${session.sessionId}:`,
            error.message
          );
        }
      }

      console.log(`✅ Reconnection completed for tenant: ${tenantId}`);
    } catch (error: any) {
      console.error(`❌ Error reconnecting tenant ${tenantId}:`, error.message);
    }
  }

  /**
   * Para o monitoramento e limpa recursos
   */
  async stop(): Promise<void> {
    console.log("🛑 Stopping Connection Manager...");

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await this.whatsappService.cleanup();

    console.log("✅ Connection Manager stopped");
  }

  // Getter para acessar o WhatsAppService
  get service(): WhatsAppService {
    return this.whatsappService;
  }
}
