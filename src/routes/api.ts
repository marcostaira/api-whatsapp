import { Router } from "express";
import { WhatsAppModule } from "../modules/WhatsAppModule";
import { authMiddleware } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();
const whatsappModule = new WhatsAppModule();

// === TENANT ROUTES ===
router.post("/tenants", async (req, res) => {
  try {
    const tenant = await whatsappModule.createTenant(req.body);
    res.status(201).json({ success: true, data: tenant });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/tenants", async (req, res) => {
  try {
    const tenants = await whatsappModule.getAllTenants();
    res.json({ success: true, data: tenants });
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === CONNECTION ROUTES ===
router.post("/connect", authMiddleware, async (req, res) => {
  try {
    const { usePairingCode, phoneNumber } = req.body;
    const tenantId = req.tenant!.id;

    const result = await whatsappModule.createConnection({
      tenantId,
      usePairingCode,
      phoneNumber,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get(
  "/connection/:sessionId/status",
  authMiddleware,
  async (req, res) => {
    try {
      const status = await whatsappModule.getConnectionStatus(
        req.params.sessionId
      );
      res.json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.delete("/connection/:sessionId", authMiddleware, async (req, res) => {
  try {
    const success = await whatsappModule.disconnectSession(
      req.params.sessionId
    );
    res.json({
      success,
      message: success ? "Disconnected successfully" : "Failed to disconnect",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/connections", authMiddleware, async (req, res) => {
  try {
    const connections = await whatsappModule.getAllConnections(req.tenant!.id);
    res.json({ success: true, data: connections });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === MESSAGE ROUTES ===
router.post("/messages/send", authMiddleware, async (req, res) => {
  try {
    const {
      sessionId,
      to,
      type,
      content,
      media,
      location,
      contact,
      quotedMessage,
    } = req.body;

    const result = await whatsappModule.sendMessage(req.tenant!.id, sessionId, {
      to,
      type,
      content,
      media,
      location,
      contact,
      quotedMessage,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/messages/send-bulk", authMiddleware, async (req, res) => {
  try {
    const { sessionId, messages } = req.body;

    const results = await whatsappModule.sendBulkMessages(
      req.tenant!.id,
      sessionId,
      messages
    );
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/messages", authMiddleware, async (req, res) => {
  try {
    const filter = {
      tenantId: req.tenant!.id,
      contactId: req.query.contactId as string,
      type: req.query.type as string,
      direction: req.query.direction as string,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom
        ? new Date(req.query.dateFrom as string)
        : undefined,
      dateTo: req.query.dateTo
        ? new Date(req.query.dateTo as string)
        : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset
        ? parseInt(req.query.offset as string)
        : undefined,
    };

    const result = await whatsappModule.getMessages(filter);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/messages/:messageId", authMiddleware, async (req, res) => {
  try {
    const message = await whatsappModule.getMessage(req.params.messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, error: "Message not found" });
    }
    res.json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/messages/:messageId/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const success = await whatsappModule.updateMessageStatus(
      req.params.messageId,
      status
    );
    res.json({
      success,
      message: success ? "Status updated" : "Failed to update status",
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/messages/:messageId", authMiddleware, async (req, res) => {
  try {
    const success = await whatsappModule.deleteMessage(req.params.messageId);
    res.json({
      success,
      message: success ? "Message deleted" : "Failed to delete message",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/messages/contact/:contactId", authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined;
    const messages = await whatsappModule.getMessagesByContact(
      req.tenant!.id,
      req.params.contactId,
      limit
    );
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/messages/unread", authMiddleware, async (req, res) => {
  try {
    const messages = await whatsappModule.getUnreadMessages(req.tenant!.id);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/messages/:messageId/read", authMiddleware, async (req, res) => {
  try {
    const success = await whatsappModule.markAsRead(req.params.messageId);
    res.json({
      success,
      message: success ? "Message marked as read" : "Failed to mark as read",
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/messages/search", authMiddleware, async (req, res) => {
  try {
    const { query, limit } = req.query;
    const messages = await whatsappModule.searchMessages(
      req.tenant!.id,
      query as string,
      limit ? parseInt(limit as string) : undefined
    );
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/messages/stats", authMiddleware, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const stats = await whatsappModule.getMessageStats(
      req.tenant!.id,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === CONTACT ROUTES ===
router.get("/contacts", authMiddleware, async (req, res) => {
  try {
    const filter = {
      tenantId: req.tenant!.id,
      isGroup: req.query.isGroup ? req.query.isGroup === "true" : undefined,
      isBlocked: req.query.isBlocked
        ? req.query.isBlocked === "true"
        : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset
        ? parseInt(req.query.offset as string)
        : undefined,
    };

    const result = await whatsappModule.getContacts(filter);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/contacts/:contactId", authMiddleware, async (req, res) => {
  try {
    const contact = await whatsappModule.getContactById(req.params.contactId);
    if (!contact) {
      return res
        .status(404)
        .json({ success: false, error: "Contact not found" });
    }
    res.json({ success: true, data: contact });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get(
  "/contacts/whatsapp/:whatsappId",
  authMiddleware,
  async (req, res) => {
    try {
      const contact = await whatsappModule.getContact(
        req.tenant!.id,
        req.params.whatsappId
      );
      if (!contact) {
        return res
          .status(404)
          .json({ success: false, error: "Contact not found" });
      }
      res.json({ success: true, data: contact });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.put("/contacts/:contactId", authMiddleware, async (req, res) => {
  try {
    const contact = await whatsappModule.updateContact(
      req.params.contactId,
      req.body
    );
    if (!contact) {
      return res
        .status(404)
        .json({ success: false, error: "Contact not found" });
    }
    res.json({ success: true, data: contact });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/contacts/:whatsappId/block", authMiddleware, async (req, res) => {
  try {
    const success = await whatsappModule.blockContact(
      req.tenant!.id,
      req.params.whatsappId
    );
    res.json({
      success,
      message: success ? "Contact blocked" : "Failed to block contact",
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post(
  "/contacts/:whatsappId/unblock",
  authMiddleware,
  async (req, res) => {
    try {
      const success = await whatsappModule.unblockContact(
        req.tenant!.id,
        req.params.whatsappId
      );
      res.json({
        success,
        message: success ? "Contact unblocked" : "Failed to unblock contact",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.delete("/contacts/:contactId", authMiddleware, async (req, res) => {
  try {
    const success = await whatsappModule.deleteContact(req.params.contactId);
    res.json({
      success,
      message: success ? "Contact deleted" : "Failed to delete contact",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/contacts/search", authMiddleware, async (req, res) => {
  try {
    const { query, limit } = req.query;
    const contacts = await whatsappModule.searchContacts(
      req.tenant!.id,
      query as string,
      limit ? parseInt(limit as string) : undefined
    );
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/contacts/groups", authMiddleware, async (req, res) => {
  try {
    const contacts = await whatsappModule.getGroupContacts(req.tenant!.id);
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/contacts/business", authMiddleware, async (req, res) => {
  try {
    const contacts = await whatsappModule.getBusinessContacts(req.tenant!.id);
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === MEDIA ROUTES ===
router.post(
  "/media/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }

      const result = await whatsappModule.saveMedia(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.get("/media/:filename", async (req, res) => {
  try {
    const filePath = req.params.filename; // You might want to validate this path
    const buffer = await whatsappModule.getMedia(filePath);

    // Set appropriate headers based on file type
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (error: any) {
    res.status(404).json({ success: false, error: "File not found" });
  }
});

router.delete("/media/:filename", authMiddleware, async (req, res) => {
  try {
    const filePath = req.params.filename; // You might want to validate this path
    const success = await whatsappModule.deleteMedia(filePath);
    res.json({
      success,
      message: success ? "Media deleted" : "Failed to delete media",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === WEBHOOK ROUTES ===
router.post("/webhook/test", authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    if (!whatsappModule.validateWebhookUrl(url)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid webhook URL" });
    }

    const success = await whatsappModule.testWebhook(url, req.tenant!.id);
    res.json({
      success,
      message: success ? "Webhook test successful" : "Webhook test failed",
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// === PROFILE ROUTES ===
router.get("/profile/:sessionId", authMiddleware, async (req, res) => {
  try {
    const profile = await whatsappModule.getTenantProfile(
      req.tenant!.id,
      req.params.sessionId
    );
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === EXPORT ROUTES ===
router.get("/export/messages", authMiddleware, async (req, res) => {
  try {
    const filter = {
      tenantId: req.tenant!.id,
      contactId: req.query.contactId as string,
      type: req.query.type as string,
      direction: req.query.direction as string,
      dateFrom: req.query.dateFrom
        ? new Date(req.query.dateFrom as string)
        : undefined,
      dateTo: req.query.dateTo
        ? new Date(req.query.dateTo as string)
        : undefined,
    };

    const messages = await whatsappModule.exportMessages(
      req.tenant!.id,
      filter
    );
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/export/contacts", authMiddleware, async (req, res) => {
  try {
    const filter = {
      tenantId: req.tenant!.id,
      isGroup: req.query.isGroup ? req.query.isGroup === "true" : undefined,
      isBlocked: req.query.isBlocked
        ? req.query.isBlocked === "true"
        : undefined,
    };

    const contacts = await whatsappModule.exportContacts(
      req.tenant!.id,
      filter
    );
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
