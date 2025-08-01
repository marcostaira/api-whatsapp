import { WASocket } from "@whiskeysockets/baileys";

// Connection interfaces
export interface ConnectionOptions {
  tenantId: string;
  usePairingCode?: boolean;
  phoneNumber?: string;
}

export interface WhatsAppConnection {
  socket: WASocket;
  tenantId: string;
  sessionId: string;
  isConnected: boolean;
  qrCode?: string;
  pairingCode?: string;
}

// Message interfaces
export interface MediaOptions {
  data: Buffer | string;
  mimetype?: string;
  caption?: string;
  filename?: string;
}

export interface LocationOptions {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactOptions {
  name: string;
  phone: string;
  email?: string;
}

export interface SendMessageOptions {
  to?: string;
  type:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "sticker"
    | "location"
    | "contact";
  content?: string;
  media?: MediaOptions;
  location?: LocationOptions;
  contact?: ContactOptions;
  quotedMessage?: string;
}

export interface BulkMessageOptions {
  to: string;
  message: Omit<SendMessageOptions, "to">;
}

export interface BulkMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Tenant and Session interfaces
export interface TenantConfig {
  id: string;
  name: string;
  apiKey: string;
  receiveGroupMessages: boolean;
  autoReconnect: boolean;
  webhookUrl?: string;
  settings?: Record<string, any>;
}

export interface SessionInfo {
  sessionId: string;
  tenantId: string;
  status: "connected" | "connecting" | "disconnected" | "logout";
  qrCode?: string;
  pairingCode?: string;
  profile?: {
    id?: string;
    name?: string;
    number?: string;
  };
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Webhook interfaces - IMPORTANTE: Esta é a interface que estava faltando
export interface WebhookPayload {
  tenantId: string;
  sessionId: string;
  event: string;
  data: any;
  timestamp: Date;
}

export interface WebhookEvent {
  tenantId: string;
  sessionId: string;
  event:
    | "connection"
    | "qr_code"
    | "pairing_code"
    | "message"
    | "message_status"
    | "contact"
    | "presence";
  data: any;
  timestamp: string;
}

// Filter and search interfaces
export interface MessageFilter {
  tenantId?: string;
  type?:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "sticker"
    | "location"
    | "contact";
  direction?: "inbound" | "outbound";
  status?: "sent" | "delivered" | "read" | "failed";
  contactId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ContactFilter {
  tenantId?: string;
  isGroup?: boolean;
  blocked?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Statistics interfaces
export interface MessageStats {
  total: number;
  sent: number;
  received: number;
  byType: {
    text: number;
    image: number;
    video: number;
    audio: number;
    document: number;
    sticker: number;
    location: number;
    contact: number;
  };
  byStatus: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export interface ConnectionStats {
  total: number;
  connected: number;
  connecting: number;
  disconnected: number;
  byTenant: {
    [tenantId: string]: {
      connected: number;
      total: number;
    };
  };
}

// Media interfaces
export interface MediaInfo {
  id: string;
  tenantId: string;
  messageId: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url?: string;
  createdAt: Date;
}

export interface UploadedFile extends Express.Multer.File {
  tenantId?: string;
  messageId?: string;
}

// Configuration interfaces
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  uploadMaxSize: number;
  uploadAllowedTypes: string[];
}

export interface WhatsAppConfig {
  browserName: string;
  qrTimeout: number;
  connectTimeout: number;
  retryDelay: number;
  maxReconnectAttempts: number;
}

// Error interfaces
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export interface ValidationError extends ApiError {
  field?: string;
  value?: any;
}

// Event emitter interfaces
export interface ConnectionEvent {
  type:
    | "connected"
    | "disconnected"
    | "connecting"
    | "qr_generated"
    | "pairing_code_generated";
  sessionId: string;
  tenantId: string;
  data?: any;
}

export interface MessageEvent {
  type: "received" | "sent" | "status_update";
  sessionId: string;
  tenantId: string;
  messageId: string;
  data?: any;
}

// Health check interfaces
export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  database: boolean;
  connections: {
    total: number;
    healthy: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  version: string;
}

// Export and import interfaces
export interface ExportOptions {
  tenantId: string;
  type: "messages" | "contacts" | "sessions";
  format: "json" | "csv" | "xlsx";
  filters?: any;
  startDate?: Date;
  endDate?: Date;
}

export interface ImportOptions {
  tenantId: string;
  type: "contacts" | "messages";
  file: Buffer;
  format: "json" | "csv" | "xlsx";
  overwrite?: boolean;
}
