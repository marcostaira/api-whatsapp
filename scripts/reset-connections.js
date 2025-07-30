require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function resetConnections() {
  console.log("🔄 Resetando todas as conexões WhatsApp...\n");

  // 1. Limpar arquivos de auth
  console.log("1️⃣ Removendo arquivos de autenticação...");
  const authFiles = fs
    .readdirSync(".")
    .filter((name) => name.startsWith("auth_info_"));

  authFiles.forEach((file) => {
    const filePath = path.join(".", file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
      console.log(`🗑️ Removido: ${file}/`);
    }
  });

  if (authFiles.length === 0) {
    console.log("ℹ️ Nenhum arquivo de auth encontrado");
  }

  // 2. Limpar banco de dados
  console.log("\n2️⃣ Limpando sessions no banco de dados...");

  const config = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "whatsapp_api",
  };

  try {
    const connection = await mysql.createConnection(config);

    // Resetar todas as sessions
    const [result] = await connection.execute(`
      UPDATE sessions 
      SET status = 'disconnected', 
          authState = NULL, 
          qrCode = NULL, 
          pairingCode = NULL,
          lastDisconnectedAt = NOW()
    `);

    console.log(`✅ ${result.affectedRows} sessions resetadas no banco`);

    await connection.end();
  } catch (error) {
    console.error("❌ Erro acessando banco:", error.message);
  }

  console.log("\n3️⃣ Limpeza concluída!");
  console.log("💡 Agora você pode:");
  console.log("   1. Reiniciar a API: npm run dev");
  console.log("   2. Criar nova conexão via Insomnia");
  console.log("   3. Usar código de pareamento limpo\n");
}

resetConnections();
