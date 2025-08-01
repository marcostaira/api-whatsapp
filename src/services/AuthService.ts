import {
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataSet,
  SignalDataTypeMap,
  AuthenticationCreds,
  SignalKeyStore,
} from "@whiskeysockets/baileys";
import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Session, SessionStatus } from "../entities/Session";

export class AuthService {
  private sessionRepository: Repository<Session>;

  constructor() {
    this.sessionRepository = AppDataSource.getRepository(Session);
  }

  /**
   * Cria um AuthState compatível com Baileys usando padrão de useMultiFileAuthState
   */
  async useMultiDBAuthState(
    tenantId: string,
    sessionId: string
  ): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    const cacheKey = `${tenantId}_${sessionId}`;

    // Carregar estado existente ou criar novo
    let creds: AuthenticationCreds;
    let keys: any = {};

    try {
      const session = await this.sessionRepository.findOne({
        where: { tenantId, sessionId },
      });

      if (session?.authState) {
        console.log(`✅ Loading existing auth state for session: ${sessionId}`);
        const parsedState = JSON.parse(session.authState, BufferJSON.reviver);
        creds = parsedState.creds || initAuthCreds();
        keys = parsedState.keys || {};
      } else {
        console.log(`📝 Creating new auth state for session: ${sessionId}`);
        creds = initAuthCreds();
        keys = {};
      }
    } catch (error) {
      console.error("❌ Error loading auth state, creating new:", error);
      creds = initAuthCreds();
      keys = {};
    }

    // Criar o key store seguindo o padrão do Baileys
    const keyStore: SignalKeyStore = {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[]
      ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
        const data: { [id: string]: SignalDataTypeMap[T] } = {};

        if (keys[type]) {
          for (const id of ids) {
            if (keys[type][id]) {
              data[id] = keys[type][id];
            }
          }
        }

        return data;
      },

      set: async (data: SignalDataSet): Promise<void> => {
        for (const category in data) {
          const categoryKey = category as keyof SignalDataTypeMap;
          if (!keys[categoryKey]) {
            keys[categoryKey] = {};
          }

          const categoryData = data[categoryKey];
          if (categoryData) {
            Object.assign(keys[categoryKey], categoryData);
          }
        }

        // Auto-save quando keys são atualizadas
        await this.saveAuthState(tenantId, sessionId, { creds, keys });
      },
    };

    const state: AuthenticationState = {
      creds,
      keys: keyStore,
    };

    const saveCreds = async (): Promise<void> => {
      await this.saveAuthState(tenantId, sessionId, { creds, keys });
    };

    return {
      state,
      saveCreds,
    };
  }

  private async saveAuthState(
    tenantId: string,
    sessionId: string,
    authState: { creds: AuthenticationCreds; keys: any }
  ): Promise<void> {
    try {
      const serializedState = JSON.stringify(authState, BufferJSON.replacer, 2);

      await this.sessionRepository.upsert(
        {
          tenantId,
          sessionId,
          authState: serializedState,
          status: SessionStatus.CONNECTED,
          lastConnectedAt: new Date(),
        },
        ["tenantId", "sessionId"]
      );

      console.log(`✅ Auth state saved for session: ${sessionId}`);
    } catch (error) {
      console.error("❌ Error saving auth state:", error);
      throw error;
    }
  }

  // Método de compatibilidade com código existente
  async saveState(
    tenantId: string,
    sessionId: string,
    state: AuthenticationState
  ): Promise<void> {
    return this.saveAuthState(tenantId, sessionId, state);
  }

  // Método de compatibilidade com código existente
  async loadState(
    tenantId: string,
    sessionId: string
  ): Promise<AuthenticationState> {
    const { state } = await this.useMultiDBAuthState(tenantId, sessionId);
    return state;
  }

  async clearState(tenantId: string, sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.update(
        { tenantId, sessionId },
        {
          authState: null,
          status: SessionStatus.LOGOUT,
          lastDisconnectedAt: new Date(),
          qrCode: null,
          pairingCode: null,
        }
      );

      console.log(`✅ Auth state cleared for session: ${sessionId}`);
    } catch (error) {
      console.error("❌ Error clearing auth state:", error);
    }
  }

  async updateSessionStatus(
    tenantId: string,
    sessionId: string,
    status: SessionStatus
  ): Promise<void> {
    try {
      const updateData: any = { status };

      if (status === SessionStatus.CONNECTED) {
        updateData.lastConnectedAt = new Date();
        updateData.qrCode = null;
        updateData.pairingCode = null;
      } else if (status === SessionStatus.DISCONNECTED) {
        updateData.lastDisconnectedAt = new Date();
      }

      await this.sessionRepository.update({ tenantId, sessionId }, updateData);

      console.log(`✅ Session ${sessionId} status updated to: ${status}`);
    } catch (error) {
      console.error("❌ Error updating session status:", error);
    }
  }

  async saveQRCode(
    tenantId: string,
    sessionId: string,
    qrCode: string
  ): Promise<void> {
    try {
      await this.sessionRepository.upsert(
        {
          tenantId,
          sessionId,
          qrCode,
          status: SessionStatus.CONNECTING,
          pairingCode: null,
        },
        ["tenantId", "sessionId"]
      );
      console.log(`✅ QR Code saved for session: ${sessionId}`);
    } catch (error) {
      console.error("❌ Error saving QR code:", error);
    }
  }

  async savePairingCode(
    tenantId: string,
    sessionId: string,
    pairingCode: string
  ): Promise<void> {
    try {
      await this.sessionRepository.upsert(
        {
          tenantId,
          sessionId,
          pairingCode,
          status: SessionStatus.CONNECTING,
          qrCode: null,
        },
        ["tenantId", "sessionId"]
      );
      console.log(`✅ Pairing code saved for session: ${sessionId}`);
    } catch (error) {
      console.error("❌ Error saving pairing code:", error);
    }
  }

  async getSession(
    tenantId: string,
    sessionId: string
  ): Promise<Session | null> {
    try {
      return await this.sessionRepository.findOne({
        where: { tenantId, sessionId },
      });
    } catch (error) {
      console.error("❌ Error getting session:", error);
      return null;
    }
  }

  async getAllSessions(tenantId: string): Promise<Session[]> {
    try {
      return await this.sessionRepository.find({
        where: { tenantId },
        order: { createdAt: "DESC" },
      });
    } catch (error) {
      console.error("❌ Error getting all sessions:", error);
      return [];
    }
  }

  async updateProfileData(
    tenantId: string,
    sessionId: string,
    profileData: {
      id?: string;
      name?: string;
      picture?: string;
      status?: string;
      platform?: string;
      phone?: string;
    }
  ): Promise<void> {
    try {
      await this.sessionRepository.update(
        { tenantId, sessionId },
        { profileData }
      );
      console.log(`✅ Profile data updated for session: ${sessionId}`);
    } catch (error) {
      console.error("❌ Error updating profile data:", error);
    }
  }

  async removeSession(tenantId: string, sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.delete({ tenantId, sessionId });
      console.log(`✅ Session removed: ${sessionId}`);
    } catch (error) {
      console.error("❌ Error removing session:", error);
    }
  }

  async getActiveSessions(): Promise<Session[]> {
    try {
      return await this.sessionRepository.find({
        where: { status: SessionStatus.CONNECTED },
        relations: ["tenant"],
        order: { lastConnectedAt: "DESC" },
      });
    } catch (error) {
      console.error("❌ Error getting active sessions:", error);
      return [];
    }
  }

  // Cleanup method
  cleanup(): void {
    console.log("✅ AuthService cleanup completed");
  }
}
