import { WhatsAppModule, initializeDatabase } from "../src";

async function example() {
  // Initialize database first
  await initializeDatabase();

  // Create WhatsApp module instance
  const whatsapp = new WhatsAppModule();

  try {
    // 1. Create a tenant
    const tenant = await whatsapp.createTenant({
      name: "My Company",
      receiveGroupMessages: true,
      autoReconnect: true,
      webhookUrl: "https://myapp.com/webhook",
    });

    console.log("Tenant created:", tenant);
    console.log("API Key:", tenant.apiKey);

    // 2. Create connection via QR Code
    const connection = await whatsapp.createConnection({
      tenantId: tenant.id,
      usePairingCode: false,
    });

    console.log("Connection created:", connection);

    // Wait for connection to be established
    // You would typically check the status or listen for webhooks

    // 3. Send a text message
    const textMessage = await whatsapp.sendMessage(
      tenant.id,
      connection.sessionId,
      {
        to: "5511999999999@s.whatsapp.net",
        type: "text",
        content: "Hello from WhatsApp API!",
      }
    );

    console.log("Text message sent:", textMessage);

    // 4. Send an image message
    const imageMessage = await whatsapp.sendMessage(
      tenant.id,
      connection.sessionId,
      {
        to: "5511999999999@s.whatsapp.net",
        type: "image",
        media: {
          data: "path/to/image.jpg", // or Buffer
          mimetype: "image/jpeg",
          caption: "Check out this image!",
        },
      }
    );

    console.log("Image message sent:", imageMessage);

    // 5. Send a location message
    const locationMessage = await whatsapp.sendMessage(
      tenant.id,
      connection.sessionId,
      {
        to: "5511999999999@s.whatsapp.net",
        type: "location",
        location: {
          latitude: -23.5505,
          longitude: -46.6333,
          name: "São Paulo",
          address: "São Paulo, SP, Brazil",
        },
      }
    );

    console.log("Location message sent:", locationMessage);

    // 6. Get messages
    const messages = await whatsapp.getMessages({
      tenantId: tenant.id,
      limit: 10,
    });

    console.log("Recent messages:", messages);

    // 7. Get contacts
    const contacts = await whatsapp.getContacts({
      tenantId: tenant.id,
      limit: 10,
    });

    console.log("Contacts:", contacts);

    // 8. Search messages
    const searchResults = await whatsapp.searchMessages(tenant.id, "hello", 5);
    console.log("Search results:", searchResults);

    // 9. Get message statistics
    const stats = await whatsapp.getMessageStats(tenant.id);
    console.log("Message statistics:", stats);

    // 10. Connection via pairing code
    const pairingConnection = await whatsapp.createConnection({
      tenantId: tenant.id,
      usePairingCode: true,
      phoneNumber: "5511999999999",
    });

    console.log("Pairing code:", pairingConnection.pairingCode);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Usage with API key authentication (for external applications)
async function externalUsage() {
  const whatsapp = new WhatsAppModule();

  // Validate API key (usually done in middleware)
  const tenant = await whatsapp.validateApiKey("your-api-key-here");

  if (!tenant) {
    console.error("Invalid API key");
    return;
  }

  // Now you can use all methods with the tenant
  const connections = await whatsapp.getAllConnections(tenant.id);
  console.log("Active connections:", connections);
}

// Bulk messaging example
async function bulkMessaging() {
  const whatsapp = new WhatsAppModule();

  // Assume you have a valid tenant ID and session ID
  const tenantId = "your-tenant-id";
  const sessionId = "your-session-id";

  const messages = [
    {
      to: "5511999999999@s.whatsapp.net",
      message: {
        type: "text" as const,
        content: "Hello from bulk messaging!",
      },
    },
    {
      to: "5511888888888@s.whatsapp.net",
      message: {
        type: "text" as const,
        content: "Another message from bulk messaging!",
      },
    },
    {
      to: "5511777777777@s.whatsapp.net",
      message: {
        type: "image" as const,
        media: {
          data: "path/to/image.jpg",
          mimetype: "image/jpeg",
          caption: "Bulk image message",
        },
      },
    },
  ];

  const results = await whatsapp.sendBulkMessages(
    tenantId,
    sessionId,
    messages
  );
  console.log("Bulk messaging results:", results);
}

// Media handling example
async function mediaExample() {
  const whatsapp = new WhatsAppModule();

  // Save media file
  const buffer = Buffer.from("file content here"); // Your file buffer
  const mediaResult = await whatsapp.saveMedia(
    buffer,
    "image/jpeg",
    "my-image.jpg"
  );
  console.log("Media saved:", mediaResult);

  // Get media file
  const mediaBuffer = await whatsapp.getMedia(mediaResult.filePath);
  console.log("Media retrieved, size:", mediaBuffer.length);

  // Optimize image
  const optimizedBuffer = await whatsapp.optimizeImage(
    mediaResult.filePath,
    80
  );
  console.log("Image optimized, new size:", optimizedBuffer.length);

  // Resize image
  const resizedBuffer = await whatsapp.resizeImage(
    mediaResult.filePath,
    300,
    300
  );
  console.log("Image resized, new size:", resizedBuffer.length);
}

// Webhook testing example
async function webhookExample() {
  const whatsapp = new WhatsAppModule();

  const webhookUrl = "https://myapp.com/webhook";
  const tenantId = "your-tenant-id";

  // Validate webhook URL
  const isValidUrl = whatsapp.validateWebhookUrl(webhookUrl);
  console.log("Webhook URL is valid:", isValidUrl);

  if (isValidUrl) {
    // Test webhook
    const testResult = await whatsapp.testWebhook(webhookUrl, tenantId);
    console.log("Webhook test result:", testResult);
  }
}

// Contact management example
async function contactManagement() {
  const whatsapp = new WhatsAppModule();
  const tenantId = "your-tenant-id";

  // Get all contacts
  const allContacts = await whatsapp.getContacts({ tenantId });
  console.log("All contacts:", allContacts);

  // Get only group contacts
  const groupContacts = await whatsapp.getGroupContacts(tenantId);
  console.log("Group contacts:", groupContacts);

  // Get business contacts
  const businessContacts = await whatsapp.getBusinessContacts(tenantId);
  console.log("Business contacts:", businessContacts);

  // Search contacts
  const searchResults = await whatsapp.searchContacts(tenantId, "john", 10);
  console.log("Contact search results:", searchResults);

  // Block a contact
  const blockResult = await whatsapp.blockContact(
    tenantId,
    "5511999999999@s.whatsapp.net"
  );
  console.log("Contact blocked:", blockResult);

  // Unblock a contact
  const unblockResult = await whatsapp.unblockContact(
    tenantId,
    "5511999999999@s.whatsapp.net"
  );
  console.log("Contact unblocked:", unblockResult);
}

// Message management example
async function messageManagement() {
  const whatsapp = new WhatsAppModule();
  const tenantId = "your-tenant-id";

  // Get messages with filters
  const filteredMessages = await whatsapp.getMessages({
    tenantId,
    type: "text",
    direction: "inbound",
    dateFrom: new Date("2024-01-01"),
    dateTo: new Date(),
    limit: 50,
  });
  console.log("Filtered messages:", filteredMessages);

  // Get unread messages
  const unreadMessages = await whatsapp.getUnreadMessages(tenantId);
  console.log("Unread messages:", unreadMessages);

  // Mark message as read
  if (unreadMessages.length > 0) {
    const markReadResult = await whatsapp.markAsRead(
      unreadMessages[0].messageId
    );
    console.log("Message marked as read:", markReadResult);
  }

  // Get messages by contact
  const contactMessages = await whatsapp.getMessagesByContact(
    tenantId,
    "contact-id-here",
    20
  );
  console.log("Messages by contact:", contactMessages);

  // Search messages
  const messageSearchResults = await whatsapp.searchMessages(
    tenantId,
    "hello",
    10
  );
  console.log("Message search results:", messageSearchResults);
}

// Export data example
async function exportData() {
  const whatsapp = new WhatsAppModule();
  const tenantId = "your-tenant-id";

  // Export all messages
  const allMessages = await whatsapp.exportMessages(tenantId);
  console.log("Exported messages count:", allMessages.length);

  // Export contacts
  const allContacts = await whatsapp.exportContacts(tenantId);
  console.log("Exported contacts count:", allContacts.length);

  // Export filtered messages
  const filteredExport = await whatsapp.exportMessages(tenantId, {
    type: "image",
    dateFrom: new Date("2024-01-01"),
  });
  console.log("Exported filtered messages count:", filteredExport.length);
}

// Run examples
if (require.main === module) {
  example().catch(console.error);
}
