"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const WhatsAppModule_1 = require("../modules/WhatsAppModule");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
const whatsappModule = new WhatsAppModule_1.WhatsAppModule();
router.post("/tenants", async (req, res) => {
    try {
        const tenant = await whatsappModule.createTenant(req.body);
        res.status(201).json({ success: true, data: tenant });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/tenants", async (req, res) => {
    try {
        const tenants = await whatsappModule.getAllTenants();
        res.json({ success: true, data: tenants });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/tenants/:id", async (req, res) => {
    try {
        const tenant = await whatsappModule.getTenant(req.params.id);
        if (!tenant) {
            return res
                .status(404)
                .json({ success: false, error: "Tenant not found" });
        }
        res.json({ success: true, data: tenant });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/tenants/:id", async (req, res) => {
    try {
        const tenant = await whatsappModule.updateTenant(req.params.id, req.body);
        if (!tenant) {
            return res
                .status(404)
                .json({ success: false, error: "Tenant not found" });
        }
        res.json({ success: true, data: tenant });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.delete("/tenants/:id", async (req, res) => {
    try {
        const success = await whatsappModule.deleteTenant(req.params.id);
        if (!success) {
            return res
                .status(404)
                .json({ success: false, error: "Tenant not found" });
        }
        res.json({ success: true, message: "Tenant deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post("/connect", auth_1.authMiddleware, async (req, res) => {
    try {
        const { usePairingCode, phoneNumber } = req.body;
        const tenantId = req.tenant.id;
        const result = await whatsappModule.createConnection({
            tenantId,
            usePairingCode,
            phoneNumber,
        });
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/connection/:sessionId/status", auth_1.authMiddleware, async (req, res) => {
    try {
        const status = await whatsappModule.getConnectionStatus(req.params.sessionId);
        res.json({ success: true, data: status });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete("/connection/:sessionId", auth_1.authMiddleware, async (req, res) => {
    try {
        const success = await whatsappModule.disconnectSession(req.params.sessionId);
        res.json({
            success,
            message: success ? "Disconnected successfully" : "Failed to disconnect",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/connections", auth_1.authMiddleware, async (req, res) => {
    try {
        const connections = await whatsappModule.getAllConnections(req.tenant.id);
        res.json({ success: true, data: connections });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post("/messages/send", auth_1.authMiddleware, async (req, res) => {
    try {
        const { sessionId, to, type, content, media, location, contact, quotedMessage, } = req.body;
        const result = await whatsappModule.sendMessage(req.tenant.id, sessionId, {
            to,
            type,
            content,
            media,
            location,
            contact,
            quotedMessage,
        });
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/messages/send-bulk", auth_1.authMiddleware, async (req, res) => {
    try {
        const { sessionId, messages } = req.body;
        const results = await whatsappModule.sendBulkMessages(req.tenant.id, sessionId, messages);
        res.json({ success: true, data: results });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/messages", auth_1.authMiddleware, async (req, res) => {
    try {
        const filter = {
            tenantId: req.tenant.id,
            contactId: req.query.contactId,
            type: req.query.type,
            direction: req.query.direction,
            status: req.query.status,
            dateFrom: req.query.dateFrom
                ? new Date(req.query.dateFrom)
                : undefined,
            dateTo: req.query.dateTo
                ? new Date(req.query.dateTo)
                : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset
                ? parseInt(req.query.offset)
                : undefined,
        };
        const result = await whatsappModule.getMessages(filter);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/messages/:messageId", auth_1.authMiddleware, async (req, res) => {
    try {
        const message = await whatsappModule.getMessage(req.params.messageId);
        if (!message) {
            return res
                .status(404)
                .json({ success: false, error: "Message not found" });
        }
        res.json({ success: true, data: message });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/messages/:messageId/status", auth_1.authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const success = await whatsappModule.updateMessageStatus(req.params.messageId, status);
        res.json({
            success,
            message: success ? "Status updated" : "Failed to update status",
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.delete("/messages/:messageId", auth_1.authMiddleware, async (req, res) => {
    try {
        const success = await whatsappModule.deleteMessage(req.params.messageId);
        res.json({
            success,
            message: success ? "Message deleted" : "Failed to delete message",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/messages/contact/:contactId", auth_1.authMiddleware, async (req, res) => {
    try {
        const limit = req.query.limit
            ? parseInt(req.query.limit)
            : undefined;
        const messages = await whatsappModule.getMessagesByContact(req.tenant.id, req.params.contactId, limit);
        res.json({ success: true, data: messages });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/messages/unread", auth_1.authMiddleware, async (req, res) => {
    try {
        const messages = await whatsappModule.getUnreadMessages(req.tenant.id);
        res.json({ success: true, data: messages });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/messages/:messageId/read", auth_1.authMiddleware, async (req, res) => {
    try {
        const success = await whatsappModule.markAsRead(req.params.messageId);
        res.json({
            success,
            message: success ? "Message marked as read" : "Failed to mark as read",
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/messages/search", auth_1.authMiddleware, async (req, res) => {
    try {
        const { query, limit } = req.query;
        const messages = await whatsappModule.searchMessages(req.tenant.id, query, limit ? parseInt(limit) : undefined);
        res.json({ success: true, data: messages });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/messages/stats", auth_1.authMiddleware, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const stats = await whatsappModule.getMessageStats(req.tenant.id, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/contacts", auth_1.authMiddleware, async (req, res) => {
    try {
        const filter = {
            tenantId: req.tenant.id,
            isGroup: req.query.isGroup ? req.query.isGroup === "true" : undefined,
            isBlocked: req.query.isBlocked
                ? req.query.isBlocked === "true"
                : undefined,
            search: req.query.search,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset
                ? parseInt(req.query.offset)
                : undefined,
        };
        const result = await whatsappModule.getContacts(filter);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/contacts/:contactId", auth_1.authMiddleware, async (req, res) => {
    try {
        const contact = await whatsappModule.getContactById(req.params.contactId);
        if (!contact) {
            return res
                .status(404)
                .json({ success: false, error: "Contact not found" });
        }
        res.json({ success: true, data: contact });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/contacts/whatsapp/:whatsappId", auth_1.authMiddleware, async (req, res) => {
    try {
        const contact = await whatsappModule.getContact(req.tenant.id, req.params.whatsappId);
        if (!contact) {
            return res
                .status(404)
                .json({ success: false, error: "Contact not found" });
        }
        res.json({ success: true, data: contact });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put("/contacts/:contactId", auth_1.authMiddleware, async (req, res) => {
    try {
        const contact = await whatsappModule.updateContact(req.params.contactId, req.body);
        if (!contact) {
            return res
                .status(404)
                .json({ success: false, error: "Contact not found" });
        }
        res.json({ success: true, data: contact });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/contacts/:whatsappId/block", auth_1.authMiddleware, async (req, res) => {
    try {
        const success = await whatsappModule.blockContact(req.tenant.id, req.params.whatsappId);
        res.json({
            success,
            message: success ? "Contact blocked" : "Failed to block contact",
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/contacts/:whatsappId/unblock", auth_1.authMiddleware, async (req, res) => {
    try {
        const success = await whatsappModule.unblockContact(req.tenant.id, req.params.whatsappId);
        res.json({
            success,
            message: success ? "Contact unblocked" : "Failed to unblock contact",
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.delete("/contacts/:contactId", auth_1.authMiddleware, async (req, res) => {
    try {
        const success = await whatsappModule.deleteContact(req.params.contactId);
        res.json({
            success,
            message: success ? "Contact deleted" : "Failed to delete contact",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/contacts/search", auth_1.authMiddleware, async (req, res) => {
    try {
        const { query, limit } = req.query;
        const contacts = await whatsappModule.searchContacts(req.tenant.id, query, limit ? parseInt(limit) : undefined);
        res.json({ success: true, data: contacts });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/contacts/groups", auth_1.authMiddleware, async (req, res) => {
    try {
        const contacts = await whatsappModule.getGroupContacts(req.tenant.id);
        res.json({ success: true, data: contacts });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/contacts/business", auth_1.authMiddleware, async (req, res) => {
    try {
        const contacts = await whatsappModule.getBusinessContacts(req.tenant.id);
        res.json({ success: true, data: contacts });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post("/media/upload", auth_1.authMiddleware, upload_1.upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({ success: false, error: "No file uploaded" });
        }
        const result = await whatsappModule.saveMedia(req.file.buffer, req.file.mimetype, req.file.originalname);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/media/:filename", async (req, res) => {
    try {
        const filePath = req.params.filename;
        const buffer = await whatsappModule.getMedia(filePath);
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(buffer);
    }
    catch (error) {
        res.status(404).json({ success: false, error: "File not found" });
    }
});
router.delete("/media/:filename", auth_1.authMiddleware, async (req, res) => {
    try {
        const filePath = req.params.filename;
        const success = await whatsappModule.deleteMedia(filePath);
        res.json({
            success,
            message: success ? "Media deleted" : "Failed to delete media",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post("/webhook/test", auth_1.authMiddleware, async (req, res) => {
    try {
        const { url } = req.body;
        if (!whatsappModule.validateWebhookUrl(url)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid webhook URL" });
        }
        const success = await whatsappModule.testWebhook(url, req.tenant.id);
        res.json({
            success,
            message: success ? "Webhook test successful" : "Webhook test failed",
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/profile/:sessionId", auth_1.authMiddleware, async (req, res) => {
    try {
        const profile = await whatsappModule.getTenantProfile(req.tenant.id, req.params.sessionId);
        res.json({ success: true, data: profile });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/export/messages", auth_1.authMiddleware, async (req, res) => {
    try {
        const filter = {
            tenantId: req.tenant.id,
            contactId: req.query.contactId,
            type: req.query.type,
            direction: req.query.direction,
            dateFrom: req.query.dateFrom
                ? new Date(req.query.dateFrom)
                : undefined,
            dateTo: req.query.dateTo
                ? new Date(req.query.dateTo)
                : undefined,
        };
        const messages = await whatsappModule.exportMessages(req.tenant.id, filter);
        res.json({ success: true, data: messages });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get("/export/contacts", auth_1.authMiddleware, async (req, res) => {
    try {
        const filter = {
            tenantId: req.tenant.id,
            isGroup: req.query.isGroup ? req.query.isGroup === "true" : undefined,
            isBlocked: req.query.isBlocked
                ? req.query.isBlocked === "true"
                : undefined,
        };
        const contacts = await whatsappModule.exportContacts(req.tenant.id, filter);
        res.json({ success: true, data: contacts });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=api.js.map