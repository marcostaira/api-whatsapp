const axios = require("axios");

const BASE_URL = "http://localhost:3000/api";
let apiKey = "";
let tenantId = "";
let sessionId = "";

class WhatsAppAPITester {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.apiKey = "";
  }

  async request(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { "X-API-Key": this.apiKey }),
          ...headers,
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(
        `Error in ${method} ${endpoint}:`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async healthCheck() {
    console.log("\n🏥 Testing Health Check...");
    const response = await axios.get("http://localhost:3000/health");
    console.log("✅ Health Check:", response.data);
    return response.data;
  }

  async createTenant() {
    console.log("\n👤 Creating Tenant...");
    const tenantData = {
      name: "Empresa Teste API",
      receiveGroupMessages: true,
      autoReconnect: true,
      webhookUrl: "https://webhook.site/test-webhook",
    };

    const response = await this.request("POST", "/tenants", tenantData);
    console.log("✅ Tenant Created:", response.data);

    this.apiKey = response.data.apiKey;
    tenantId = response.data.id;

    return response.data;
  }

  async getTenant(id) {
    console.log(`\n📋 Getting Tenant ${id}...`);
    const response = await this.request("GET", `/tenants/${id}`);
    console.log("✅ Tenant Details:", response.data);
    return response.data;
  }

  async createConnection(usePairingCode = false, phoneNumber = null) {
    console.log("\n🔗 Creating WhatsApp Connection...");
    const connectionData = {
      usePairingCode,
      ...(phoneNumber && { phoneNumber }),
    };

    const response = await this.request("POST", "/connect", connectionData);
    console.log("✅ Connection Created:", response.data);

    sessionId = response.data.sessionId;

    if (response.data.qrCode) {
      console.log("📱 QR Code available for scanning");
    }

    if (response.data.pairingCode) {
      console.log("🔢 Pairing Code:", response.data.pairingCode);
    }

    return response.data;
  }

  async getConnectionStatus(sessionId) {
    console.log(`\n📊 Checking Connection Status for ${sessionId}...`);
    const response = await this.request(
      "GET",
      `/connection/${sessionId}/status`
    );
    console.log("✅ Connection Status:", response.data);
    return response.data;
  }

  async sendTextMessage(to, content) {
    console.log(`\n💬 Sending Text Message to ${to}...`);
    const messageData = {
      sessionId,
      to,
      type: "text",
      content,
    };

    const response = await this.request("POST", "/messages/send", messageData);
    console.log("✅ Message Sent:", response.data);
    return response.data;
  }

  async sendImageMessage(to, imageUrl, caption) {
    console.log(`\n🖼️ Sending Image Message to ${to}...`);
    const messageData = {
      sessionId,
      to,
      type: "image",
      media: {
        data: imageUrl,
        mimetype: "image/jpeg",
        caption,
      },
    };

    const response = await this.request("POST", "/messages/send", messageData);
    console.log("✅ Image Message Sent:", response.data);
    return response.data;
  }

  async sendBulkMessages(messages) {
    console.log("\n📨 Sending Bulk Messages...");
    const bulkData = {
      sessionId,
      messages,
    };

    const response = await this.request(
      "POST",
      "/messages/send-bulk",
      bulkData
    );
    console.log("✅ Bulk Messages Sent:", response.data);
    return response.data;
  }

  async getMessages(limit = 10) {
    console.log("\n📬 Getting Messages...");
    const response = await this.request("GET", `/messages?limit=${limit}`);
    console.log("✅ Messages Retrieved:", response.data);
    return response.data;
  }

  async getContacts(limit = 10) {
    console.log("\n👥 Getting Contacts...");
    const response = await this.request("GET", `/contacts?limit=${limit}`);
    console.log("✅ Contacts Retrieved:", response.data);
    return response.data;
  }

  async searchMessages(query, limit = 5) {
    console.log(`\n🔍 Searching Messages for "${query}"...`);
    const response = await this.request(
      "GET",
      `/messages/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    console.log("✅ Search Results:", response.data);
    return response.data;
  }

  async getMessageStats() {
    console.log("\n📊 Getting Message Statistics...");
    const response = await this.request("GET", "/messages/stats");
    console.log("✅ Message Stats:", response.data);
    return response.data;
  }

  async testWebhook(webhookUrl) {
    console.log("\n🎣 Testing Webhook...");
    const response = await this.request("POST", "/webhook/test", {
      url: webhookUrl,
    });
    console.log("✅ Webhook Test:", response.data);
    return response.data;
  }

  async disconnectSession() {
    console.log(`\n🔌 Disconnecting Session ${sessionId}...`);
    const response = await this.request("DELETE", `/connection/${sessionId}`);
    console.log("✅ Session Disconnected:", response.data);
    return response.data;
  }
}

async function runTests() {
  const tester = new WhatsAppAPITester();

  try {
    console.log("🚀 Starting WhatsApp API Tests...\n");

    // 1. Health Check
    await tester.healthCheck();

    // 2. Create Tenant
    const tenant = await tester.createTenant();

    // 3. Get Tenant Details
    await tester.getTenant(tenant.id);

    // 4. Create Connection (QR Code)
    const connection = await tester.createConnection(false);

    // Wait a bit for potential connection
    console.log("\n⏳ Waiting 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 5. Check Connection Status
    await tester.getConnectionStatus(connection.sessionId);

    // 6. Test Messages (these will fail if not connected, which is expected)
    try {
      await tester.sendTextMessage(
        "5511999999999@s.whatsapp.net",
        "Teste via API"
      );
    } catch (error) {
      console.log("ℹ️ Message sending failed (expected if not connected)");
    }

    // 7. Get Messages
    await tester.getMessages();

    // 8. Get Contacts
    await tester.getContacts();

    // 9. Get Message Stats
    await tester.getMessageStats();

    // 10. Test Webhook
    await tester.testWebhook("https://webhook.site/test");

    console.log("\n✅ All tests completed successfully!");
    console.log("\n📝 Notes:");
    console.log("- Some tests may fail if WhatsApp is not connected");
    console.log("- Use the QR code or pairing code to connect WhatsApp");
    console.log("- Check webhook.site for webhook notifications");
    console.log(`\n🔑 Your API Key: ${tester.apiKey}`);
    console.log(`🆔 Your Tenant ID: ${tenantId}`);
    console.log(`📱 Your Session ID: ${sessionId}`);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = WhatsAppAPITester;
