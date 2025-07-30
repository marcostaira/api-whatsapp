require("dotenv").config();
const mysql = require("mysql2/promise");

async function setupDatabase() {
  console.log("🗄️ Setting up WhatsApp API Database...\n");

  const config = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  };

  const databaseName = process.env.DB_DATABASE || "whatsapp_api";

  console.log("🔧 Database configuration:");
  console.log("- Host:", config.host);
  console.log("- Port:", config.port);
  console.log("- User:", config.user);
  console.log("- Database:", databaseName);
  console.log("- Password:", config.password ? "✅ SET" : "❌ NOT SET");

  let connection;

  try {
    // Connect to MySQL without specifying database
    console.log("\n🔌 Connecting to MySQL...");
    connection = await mysql.createConnection(config);
    console.log("✅ Connected to MySQL successfully");

    // Create database if it doesn't exist (using query instead of execute)
    console.log(
      `\n📊 Creating database "${databaseName}" if it doesn't exist...`
    );
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database "${databaseName}" created/verified`);

    // Close connection and reconnect to the specific database
    await connection.end();

    // Reconnect with database specified
    console.log(`\n🔌 Connecting to database "${databaseName}"...`);
    connection = await mysql.createConnection({
      ...config,
      database: databaseName,
    });
    console.log("✅ Connected to database successfully");

    // Create tables
    await createTables(connection);

    console.log("\n🎉 Database setup completed successfully!");
    console.log("\n💡 Next steps:");
    console.log("1. Run: npm run dev");
    console.log("2. Test: curl http://localhost:3000/health");
    console.log("3. Create tenant via API");
  } catch (error) {
    console.error("\n❌ Database setup failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Troubleshooting:");
      console.log("- Make sure MySQL is running");
      console.log("- Check connection details in .env file");
      console.log("- Try: brew services start mysql (macOS)");
      console.log("- Try: sudo systemctl start mysql (Linux)");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("\n💡 Troubleshooting:");
      console.log("- Check username and password in .env file");
      console.log("- Make sure user has database creation privileges");
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createTables(connection) {
  console.log("\n📋 Creating tables...");

  const tables = [
    {
      name: "tenants",
      sql: `CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        apiKey VARCHAR(255) NOT NULL UNIQUE,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        receiveGroupMessages BOOLEAN DEFAULT true,
        autoReconnect BOOLEAN DEFAULT true,
        webhookUrl TEXT NULL,
        settings JSON NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_apiKey (apiKey),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: "sessions",
      sql: `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        tenantId VARCHAR(36) NOT NULL,
        sessionId VARCHAR(255) NOT NULL UNIQUE,
        status ENUM('disconnected', 'connecting', 'connected', 'logout') DEFAULT 'disconnected',
        qrCode TEXT NULL,
        pairingCode TEXT NULL,
        authState LONGTEXT NULL,
        profileData JSON NULL,
        lastConnectedAt TIMESTAMP NULL,
        lastDisconnectedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        INDEX idx_tenantId (tenantId),
        INDEX idx_sessionId (sessionId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: "contacts",
      sql: `CREATE TABLE IF NOT EXISTS contacts (
        id VARCHAR(36) PRIMARY KEY,
        tenantId VARCHAR(36) NOT NULL,
        whatsappId VARCHAR(255) NOT NULL,
        name VARCHAR(255) NULL,
        pushName VARCHAR(255) NULL,
        profilePicture TEXT NULL,
        status TEXT NULL,
        isGroup BOOLEAN DEFAULT false,
        isBlocked BOOLEAN DEFAULT false,
        isBusiness BOOLEAN DEFAULT false,
        metadata JSON NULL,
        lastSeenAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        UNIQUE KEY unique_tenant_whatsapp (tenantId, whatsappId),
        INDEX idx_tenantId (tenantId),
        INDEX idx_whatsappId (whatsappId),
        INDEX idx_isGroup (isGroup),
        INDEX idx_isBlocked (isBlocked)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: "messages",
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        tenantId VARCHAR(36) NOT NULL,
        contactId VARCHAR(36) NOT NULL,
        messageId VARCHAR(255) NOT NULL UNIQUE,
        type ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'reaction', 'poll', 'template') NOT NULL,
        direction ENUM('inbound', 'outbound') NOT NULL,
        status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
        content TEXT NULL,
        quotedMessageId VARCHAR(255) NULL,
        contextInfo JSON NULL,
        metadata JSON NULL,
        timestamp TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE,
        INDEX idx_tenantId (tenantId),
        INDEX idx_contactId (contactId),
        INDEX idx_messageId (messageId),
        INDEX idx_type (type),
        INDEX idx_direction (direction),
        INDEX idx_status (status),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
    {
      name: "media",
      sql: `CREATE TABLE IF NOT EXISTS media (
        id VARCHAR(36) PRIMARY KEY,
        messageId VARCHAR(36) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        originalName VARCHAR(255) NOT NULL,
        mimeType VARCHAR(255) NOT NULL,
        size BIGINT NOT NULL,
        filePath TEXT NOT NULL,
        thumbnailPath TEXT NULL,
        caption TEXT NULL,
        metadata JSON NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
        INDEX idx_messageId (messageId),
        INDEX idx_filename (filename),
        INDEX idx_mimeType (mimeType)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
  ];

  for (const table of tables) {
    console.log(`Creating ${table.name} table...`);
    await connection.query(table.sql);
    console.log(`✅ ${table.name} table created`);
  }

  // Verify tables were created
  console.log("\n📊 Verifying tables...");
  const [tables_result] = await connection.query("SHOW TABLES");
  console.log("✅ Tables in database:");
  tables_result.forEach((row) => {
    const tableName = Object.values(row)[0];
    console.log(`   - ${tableName}`);
  });

  console.log("\n✅ All tables created successfully");
}

// Run setup
setupDatabase();
