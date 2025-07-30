import { AuthenticationState } from "@whiskeysockets/baileys";
import { Session, SessionStatus } from "../entities/Session";
export declare class AuthService {
    private sessionRepository;
    constructor();
    saveState(tenantId: string, sessionId: string, state: AuthenticationState): Promise<void>;
    loadState(tenantId: string, sessionId: string): Promise<AuthenticationState>;
    clearState(tenantId: string, sessionId: string): Promise<void>;
    updateSessionStatus(tenantId: string, sessionId: string, status: SessionStatus): Promise<void>;
    saveQRCode(tenantId: string, sessionId: string, qrCode: string): Promise<void>;
    savePairingCode(tenantId: string, sessionId: string, pairingCode: string): Promise<void>;
    getSession(tenantId: string, sessionId: string): Promise<Session | null>;
    getAllSessions(tenantId: string): Promise<Session[]>;
    updateProfileData(tenantId: string, sessionId: string, profileData: any): Promise<void>;
    removeSession(tenantId: string, sessionId: string): Promise<void>;
    getActiveSessions(): Promise<Session[]>;
}
