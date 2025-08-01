import { UserFacingSocketConfig, isJidGroup } from "@whiskeysockets/baileys";

/**
 * Configuração padrão para o Baileys WhatsApp socket
 * Centraliza todas as configurações para evitar inconsistências
 */
export function getBaileysConfig(
  authState: any,
  version: any
): UserFacingSocketConfig {
  return {
    version,
    auth: authState,
    printQRInTerminal: false,
    browser: [
      process.env.WA_BROWSER_NAME || "WhatsApp-API-Module",
      "Desktop",
      "1.0.0",
    ],
    // Performance and reliability settings
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,

    // Timeout configurations for better stability
    defaultQueryTimeoutMs: 120000, // 2 minutes
    connectTimeoutMs: 60000, // 1 minute
    qrTimeout: 90000, // 1.5 minutes
    retryRequestDelayMs: 500, // 500ms between retries

    // Keep alive to maintain connection
    keepAliveIntervalMs: 30000, // 30 seconds

    // Optional configurations that exist in current Baileys version
    shouldIgnoreJid: (jid: string) => {
      // Ignore group messages by default (can be overridden by tenant settings)
      return isJidGroup(jid);
    },

    // Message handling options
    getMessage: async (key) => {
      // Return undefined to let Baileys handle message retrieval
      return undefined;
    },
  };
}

/**
 * Configurações específicas para diferentes tipos de conexão
 */
export const CONNECTION_CONFIGS = {
  // Configuração para conexões via QR Code
  QR_CODE: {
    usePairingCode: false,
    timeoutMs: 45000, // 45 segundos para gerar QR
  },

  // Configuração para conexões via código de pareamento
  PAIRING_CODE: {
    usePairingCode: true,
    timeoutMs: 30000, // 30 segundos para gerar código
  },

  // Configuração para reconexões automáticas
  RECONNECTION: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
} as const;

/**
 * Utilitários para configuração do Baileys
 */
export class BaileysConfigUtils {
  /**
   * Valida se as configurações são compatíveis com a versão atual do Baileys
   */
  static validateConfig(config: UserFacingSocketConfig): boolean {
    try {
      // Verificações básicas
      if (!config.auth) return false;
      if (!config.version) return false;
      if (!Array.isArray(config.browser) || config.browser.length !== 3)
        return false;

      return true;
    } catch (error) {
      console.error("❌ Invalid Baileys configuration:", error);
      return false;
    }
  }

  /**
   * Sanitiza as configurações removendo propriedades não suportadas
   */
  static sanitizeConfig(config: any): UserFacingSocketConfig {
    const allowedKeys = [
      "version",
      "auth",
      "printQRInTerminal",
      "browser",
      "generateHighQualityLinkPreview",
      "syncFullHistory",
      "markOnlineOnConnect",
      "defaultQueryTimeoutMs",
      "connectTimeoutMs",
      "qrTimeout",
      "retryRequestDelayMs",
      "keepAliveIntervalMs",
      "shouldIgnoreJid",
      "getMessage",
    ];

    const sanitized: any = {};

    for (const key of allowedKeys) {
      if (key in config) {
        sanitized[key] = config[key];
      }
    }

    return sanitized as UserFacingSocketConfig;
  }

  /**
   * Cria configuração customizada baseada em parâmetros
   */
  static createCustomConfig(
    authState: any,
    version: any,
    options: {
      ignoreGroups?: boolean;
      timeouts?: {
        query?: number;
        connect?: number;
        qr?: number;
      };
      keepAlive?: number;
    } = {}
  ): UserFacingSocketConfig {
    const baseConfig = getBaileysConfig(authState, version);

    // Apply custom options
    if (options.ignoreGroups !== undefined) {
      baseConfig.shouldIgnoreJid = options.ignoreGroups
        ? (jid: string) => isJidGroup(jid)
        : undefined;
    }

    if (options.timeouts) {
      if (options.timeouts.query) {
        baseConfig.defaultQueryTimeoutMs = options.timeouts.query;
      }
      if (options.timeouts.connect) {
        baseConfig.connectTimeoutMs = options.timeouts.connect;
      }
      if (options.timeouts.qr) {
        baseConfig.qrTimeout = options.timeouts.qr;
      }
    }

    if (options.keepAlive) {
      baseConfig.keepAliveIntervalMs = options.keepAlive;
    }

    return this.sanitizeConfig(baseConfig);
  }
}
