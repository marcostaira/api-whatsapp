// Main entry point that exports all modules for external use
export { WhatsAppModule } from "./modules/WhatsAppModule";

// Export services
export { WhatsAppService } from "./services/WhatsAppService";
export { ConfigService } from "./services/ConfigService";
export { ContactService } from "./services/ContactService";
export { MessageService } from "./services/MessageService";
export { MediaService } from "./services/MediaService";
export { WebhookService } from "./services/WebhookService";
export { AuthService } from "./services/AuthService";

// Export entities
export { Tenant, TenantStatus } from "./entities/Tenant";
export { Session, SessionStatus } from "./entities/Session";
export { Contact } from "./entities/Contact";
export {
  Message,
  MessageType,
  MessageStatus,
  MessageDirection,
} from "./entities/Message";
export { Media } from "./entities/Media";

// Export types and interfaces
export * from "./types/interfaces";

// Export database configuration
export { AppDataSource, initializeDatabase } from "./config/database";

// Export middlewares
export { authMiddleware, optionalAuth } from "./middleware/auth";
export { upload, handleUploadError } from "./middleware/upload";

// Default export is the main WhatsApp module
export { WhatsAppModule as default } from "./modules/WhatsAppModule";
