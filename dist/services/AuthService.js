"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const database_1 = require("../config/database");
const Session_1 = require("../entities/Session");
class AuthService {
    constructor() {
        this.sessionRepository = database_1.AppDataSource.getRepository(Session_1.Session);
    }
    async saveState(tenantId, sessionId, state) {
        const serializedState = JSON.stringify(state, baileys_1.BufferJSON.replacer, 2);
        await this.sessionRepository.upsert({
            tenantId,
            sessionId,
            authState: serializedState,
            status: Session_1.SessionStatus.CONNECTED,
        }, ["tenantId", "sessionId"]);
    }
    async loadState(tenantId, sessionId) {
        const session = await this.sessionRepository.findOne({
            where: { tenantId, sessionId },
        });
        if (session?.authState) {
            try {
                return JSON.parse(session.authState, baileys_1.BufferJSON.reviver);
            }
            catch (error) {
                console.error("Error parsing auth state:", error);
            }
        }
        return {
            creds: (0, baileys_1.initAuthCreds)(),
            keys: {
                get: function (type, ids) {
                    throw new Error("Function not implemented.");
                },
                set: function (data) {
                    throw new Error("Function not implemented.");
                },
            },
        };
    }
    async clearState(tenantId, sessionId) {
        await this.sessionRepository.update({ tenantId, sessionId }, {
            authState: null,
            status: Session_1.SessionStatus.LOGOUT,
            lastDisconnectedAt: new Date(),
        });
    }
    async updateSessionStatus(tenantId, sessionId, status) {
        const updateData = { status };
        if (status === Session_1.SessionStatus.CONNECTED) {
            updateData.lastConnectedAt = new Date();
        }
        else if (status === Session_1.SessionStatus.DISCONNECTED) {
            updateData.lastDisconnectedAt = new Date();
        }
        await this.sessionRepository.update({ tenantId, sessionId }, updateData);
    }
    async saveQRCode(tenantId, sessionId, qrCode) {
        await this.sessionRepository.upsert({
            tenantId,
            sessionId,
            qrCode,
            status: Session_1.SessionStatus.CONNECTING,
        }, ["tenantId", "sessionId"]);
    }
    async savePairingCode(tenantId, sessionId, pairingCode) {
        await this.sessionRepository.upsert({
            tenantId,
            sessionId,
            pairingCode,
            status: Session_1.SessionStatus.CONNECTING,
        }, ["tenantId", "sessionId"]);
    }
    async getSession(tenantId, sessionId) {
        return await this.sessionRepository.findOne({
            where: { tenantId, sessionId },
        });
    }
    async getAllSessions(tenantId) {
        return await this.sessionRepository.find({
            where: { tenantId },
        });
    }
    async updateProfileData(tenantId, sessionId, profileData) {
        await this.sessionRepository.update({ tenantId, sessionId }, { profileData });
    }
    async removeSession(tenantId, sessionId) {
        await this.sessionRepository.delete({ tenantId, sessionId });
    }
    async getActiveSessions() {
        return await this.sessionRepository.find({
            where: { status: Session_1.SessionStatus.CONNECTED },
            relations: ["tenant"],
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map