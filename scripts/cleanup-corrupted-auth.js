#!/usr/bin/env node

require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

/**
 * Script para limpar estados de autenticação corrompidos
 * Resolve o erro "state.get is not a function"
 */
async function cleanupCorruptedAuth() {
  console.log("🧹 Cleaning up corrupted authentication states...\n");

  // 1. Limpar arquivos de auth
  console.log("1️⃣ Removing authentication files...");
  const authFiles = fs
    .readdirSync(".")
    .filter((name) => name.startsWith("auth_info_"));

  authFiles.forEach((file) => {
    const filePath = path.join(".", file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
      console.log(`🗑️ Removed: ${file}/`);
    }
  });

  if (authFiles.length === 0) {
    console.log("ℹ️ No auth files found");
  }

  // 2. Limpar banco de dados
  console.log("\n2️⃣ Cleaning corrupted sessions in database...");

  const config = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "whatsapp_api",
  };

  let connection;

  try {
    connection = await mysql.createConnection(config);

    // Primeiro, listar todas as sessões
    const [sessions] = await connection.execute(`
      SELECT tenantId, sessionId, status, lastConnectedAt, lastDisconnectedAt 
      FROM sessions 
      ORDER BY updatedAt DESC
    `);

    console.log(`📊 Found ${sessions.length} session(s) in database:`);
    sessions.forEach((session, index) => {
      console.log(
        `   ${index + 1}. ${session.sessionId} (${session.status}) - Tenant: ${
          session.tenantId
        }`
      );
    });

    // Resetar todas as sessions com authState corrompido
    const [result] = await connection.execute(`
      UPDATE sessions 
      SET 
        status = 'disconnected',
        authState = NULL,
        qrCode = NULL,
        pairingCode = NULL,
        lastDisconnectedAt = NOW()
      WHERE authState IS NOT NULL
    `);

    console.log(`✅ ${result.affectedRows} session(s) reset in database`);

    // Opcional: Remover sessões muito antigas (mais de 24 horas desconectadas)
    const [oldResult] = await connection.execute(`
      DELETE FROM sessions 
      WHERE status = 'disconnected' 
      AND (lastDisconnectedAt < DATE_SUB(NOW(), INTERVAL 24 HOUR) OR lastDisconnectedAt IS NULL)
      AND lastConnectedAt IS NULL
    `);

    if (oldResult.affectedRows > 0) {
      console.log(`🗑️ Removed ${oldResult.affectedRows} old session(s)`);
    }

    await connection.end();
  } catch (error) {
    console.error("❌ Database error:", error.message);
    if (connection) {
      await connection.end();
    }
  }

  console.log("\n3️⃣ Cleanup completed!");
  console.log("💡 Next steps:");
  console.log("   1. Restart the API: npm run dev");
  console.log("   2. Create new connection via API");
  console.log("   3. Scan fresh QR code");
  console.log(
    "   4. The 'state.get is not a function' error should be resolved"
  );

  console.log("\n🔍 What this script did:");
  console.log("   ✅ Removed all local auth files");
  console.log("   ✅ Reset all sessions with corrupted authState");
  console.log("   ✅ Cleaned up old disconnected sessions");
  console.log("   ✅ Forced fresh authentication state creation");

  console.log("\n⚠️ Important:");
  console.log("   - All existing connections will need to be re-authenticated");
  console.log("   - You'll need to scan QR codes again");
  console.log("   - This resolves the Baileys auth state corruption issue");
}

// Função para confirmação do usuário
function askConfirmation() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "\n⚠️ This will disconnect ALL WhatsApp sessions and require re-authentication. Continue? (y/N): ",
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
      }
    );
  });
}

// Executar com confirmação
async function main() {
  console.log("🔧 WhatsApp Auth State Cleanup Tool");
  console.log("===================================");
  console.log("This tool fixes the 'state.get is not a function' error");
  console.log("by cleaning corrupted authentication states.\n");

  // Verificar se é execução forçada
  const forceCleanup =
    process.argv.includes("--force") || process.argv.includes("-f");

  if (forceCleanup) {
    console.log("🚀 Force cleanup mode enabled");
    await cleanupCorruptedAuth();
  } else {
    const confirmed = await askConfirmation();

    if (confirmed) {
      await cleanupCorruptedAuth();
    } else {
      console.log("❌ Cleanup cancelled by user");
      process.exit(0);
    }
  }
}

main().catch((error) => {
  console.error("❌ Cleanup failed:", error);
  process.exit(1);
});
