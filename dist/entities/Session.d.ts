import { Tenant } from "./Tenant";
export declare enum SessionStatus {
    DISCONNECTED = "disconnected",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    LOGOUT = "logout"
}
export declare class Session {
    id: string;
    tenantId: string;
    tenant: Tenant;
    sessionId: string;
    status: SessionStatus;
    qrCode: string;
    pairingCode: string;
    authState: string | null;
    profileData: {
        id?: string;
        name?: string;
        picture?: string;
        status?: string;
        platform?: string;
        phone?: string;
    };
    lastConnectedAt: Date;
    lastDisconnectedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
