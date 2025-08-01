import { AppDataSource } from "./config/database";
import { ConnectionManager } from "./services/ConnectionManager";
import { ConfigService } from "./services/ConfigService";
import { SessionStatus } from "./entities/Session";
import * as dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Script de inicialização da API WhatsApp
 * - Inicializa o banco de dados
 * - Restaura conexões ativas
 * - Inicia o gerenciador de conexões
 */
class WhatsAppStartup {
  private connectionManager: ConnectionManager;
  private configService: ConfigService;

  constructor() {
    this.connectionManager = new ConnectionManager();
    this.configService = new ConfigService();
  }

  async initialize(): Promise<void> {
    console.log("🚀 Initializing WhatsApp API...\n");

    try {
      // 1. Inicializar banco de dados
      await this.initializeDatabase();

      // 2. Validar configurações
      await this.validateConfiguration();

      // 3. Restaurar conexões ativas
      await this.restoreActiveConnections();

      // 4. Configurar handlers de shutdown
      this.setupShutdownHandlers();

      console.log("✅ WhatsApp API initialized successfully!\n");
      console.log("📊 Connection Statistics:");
      const stats = await this.connectionManager.getConnectionStats();
      console.log(`   Total Sessions: ${stats.total}`);
      console.log(`   Connected: ${stats.connected}`);
      console.log(`   Connecting: ${stats.connecting}`);
      console.log(`   Disconnected: ${stats.disconnected}\n`);
    } catch (error: any) {
      console.error("❌ Failed to initialize WhatsApp API:", error.message);
      process.exit(1);
    }
  }

  private async initializeDatabase(): Promise<void> {
    console.log("1️⃣ Initializing database connection...");

    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      // Executar migrações se necessário
      await AppDataSource.runMigrations();

      console.log("✅ Database initialized successfully");
    } catch (error: any) {
      console.error("❌ Database initialization failed:", error.message);
      throw error;
    }
  }

  private async validateConfiguration(): Promise<void> {
    console.log("2️⃣ Validating configuration...");

    const requiredEnvVars = [
      "DB_HOST",
      "DB_PORT",
      "DB_USERNAME",
      "DB_DATABASE",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    // Testar conexão com banco
    try {
      await AppDataSource.query("SELECT 1");
      console.log("✅ Database connection test passed");
    } catch (error: any) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }

    console.log("✅ Configuration validated");
  }

  private async restoreActiveConnections(): Promise<void> {
    console.log("3️⃣ Restoring active connections...");

    try {
      // Marcar todas as sessões como desconectadas na inicialização
      const sessionRepository = AppDataSource.getRepository("Session");
      await sessionRepository.update(
        { status: SessionStatus.CONNECTED },
        {
          status: SessionStatus.DISCONNECTED,
          lastDisconnectedAt: new Date(),
        }
      );

      // Buscar tenants com auto-reconnect habilitado
      const tenantsWithAutoReconnect =
        await this.configService.getTenantsWithAutoReconnect();

      if (tenantsWithAutoReconnect.length === 0) {
        console.log("ℹ️ No tenants with auto-reconnect enabled");
        return;
      }

      console.log(
        `🔄 Found ${tenantsWithAutoReconnect.length} tenant(s) with auto-reconnect enabled`
      );

      // Restaurar conexões com delay entre cada uma
      for (let i = 0; i < tenantsWithAutoReconnect.length; i++) {
        const tenant = tenantsWithAutoReconnect[i];

        try {
          console.log(
            `   🔗 Restoring connection for tenant: ${tenant.name} (${tenant.id})`
          );

          await this.connectionManager.createConnectionWithRetry(tenant.id, {
            maxRetries: 2,
          });

          // Delay entre conexões para evitar sobrecarga
          if (i < tenantsWithAutoReconnect.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error: any) {
          console.error(
            `   ❌ Failed to restore connection for tenant ${tenant.id}:`,
            error.message
          );
        }
      }

      console.log("✅ Connection restoration completed");
    } catch (error: any) {
      console.error("❌ Error restoring connections:", error.message);
      // Não falhar a inicialização por causa disso
    }
  }

  private setupShutdownHandlers(): void {
    console.log("4️⃣ Setting up shutdown handlers...");

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);

      try {
        // Parar o gerenciador de conexões
        await this.connectionManager.stop();

        // Fechar conexão com banco de dados
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
          console.log("✅ Database connection closed");
        }

        console.log("✅ Graceful shutdown completed");
        process.exit(0);
      } catch (error: any) {
        console.error("❌ Error during shutdown:", error.message);
        process.exit(1);
      }
    };

    // Handlers para diferentes sinais
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // Para nodemon

    // Handler para exceções não capturadas
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      gracefulShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("unhandledRejection");
    });

    console.log("✅ Shutdown handlers configured");
  }

  // Getter para acessar o connection manager externamente
  get manager(): ConnectionManager {
    return this.connectionManager;
  }
}

// Função auxiliar para inicializar tudo
export async function initializeWhatsAppAPI(): Promise<WhatsAppStartup> {
  const startup = new WhatsAppStartup();
  await startup.initialize();
  return startup;
}

// Se este arquivo for executado diretamente
if (require.main === module) {
  initializeWhatsAppAPI().catch((error) => {
    console.error("❌ Startup failed:", error);
    process.exit(1);
  });
}

export { WhatsAppStartup };
