import {
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataSet,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Session, SessionStatus } from "../entities/Session";

export class AuthService {
  private sessionRepository: Repository<Session>;

  constructor() {
    this.sessionRepository = AppDataSource.getRepository(Session);
  }

  async saveState(
    tenantId: string,
    sessionId: string,
    state: AuthenticationState
  ): Promise<void> {
    const serializedState = JSON.stringify(state, BufferJSON.replacer, 2);

    await this.sessionRepository.upsert(
      {
        tenantId,
        sessionId,
        authState: serializedState,
        status: SessionStatus.CONNECTED,
      },
      ["tenantId", "sessionId"]
    );
  }

  async loadState(
    tenantId: string,
    sessionId: string
  ): Promise<AuthenticationState> {
    const session = await this.sessionRepository.findOne({
      where: { tenantId, sessionId },
    });

    if (session?.authState) {
      try {
        return JSON.parse(session.authState, BufferJSON.reviver);
      } catch (error) {
        console.error("Error parsing auth state:", error);
      }
    }

    // Return a complete AuthenticationState with empty keys
    return {
      creds: initAuthCreds(),
      keys: {
        get: function <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[]
        ):
          | { [id: string]: SignalDataTypeMap[T] }
          | Promise<{ [id: string]: SignalDataTypeMap[T] }> {
          throw new Error("Function not implemented.");
        },
        set: function (data: SignalDataSet): void | Promise<void> {
          throw new Error("Function not implemented.");
        },
      },
    };
  }

  async clearState(tenantId: string, sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { tenantId, sessionId },
      {
        authState: null,
        status: SessionStatus.LOGOUT,
        lastDisconnectedAt: new Date(),
      }
    );
  }

  async updateSessionStatus(
    tenantId: string,
    sessionId: string,
    status: SessionStatus
  ): Promise<void> {
    const updateData: any = { status };

    if (status === SessionStatus.CONNECTED) {
      updateData.lastConnectedAt = new Date();
    } else if (status === SessionStatus.DISCONNECTED) {
      updateData.lastDisconnectedAt = new Date();
    }

    await this.sessionRepository.update({ tenantId, sessionId }, updateData);
  }

  async saveQRCode(
    tenantId: string,
    sessionId: string,
    qrCode: string
  ): Promise<void> {
    await this.sessionRepository.upsert(
      {
        tenantId,
        sessionId,
        qrCode,
        status: SessionStatus.CONNECTING,
      },
      ["tenantId", "sessionId"]
    );
  }

  async savePairingCode(
    tenantId: string,
    sessionId: string,
    pairingCode: string
  ): Promise<void> {
    await this.sessionRepository.upsert(
      {
        tenantId,
        sessionId,
        pairingCode,
        status: SessionStatus.CONNECTING,
      },
      ["tenantId", "sessionId"]
    );
  }

  async getSession(
    tenantId: string,
    sessionId: string
  ): Promise<Session | null> {
    return await this.sessionRepository.findOne({
      where: { tenantId, sessionId },
    });
  }

  async getAllSessions(tenantId: string): Promise<Session[]> {
    return await this.sessionRepository.find({
      where: { tenantId },
    });
  }

  async updateProfileData(
    tenantId: string,
    sessionId: string,
    profileData: any
  ): Promise<void> {
    await this.sessionRepository.update(
      { tenantId, sessionId },
      { profileData }
    );
  }

  async removeSession(tenantId: string, sessionId: string): Promise<void> {
    await this.sessionRepository.delete({ tenantId, sessionId });
  }

  async getActiveSessions(): Promise<Session[]> {
    return await this.sessionRepository.find({
      where: { status: SessionStatus.CONNECTED },
      relations: ["tenant"],
    });
  }
}
