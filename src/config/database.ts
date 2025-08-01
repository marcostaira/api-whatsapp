import { DataSource } from "typeorm";
import { Tenant } from "../entities/Tenant";
import { Session } from "../entities/Session";
import { Contact } from "../entities/Contact";
import { Message } from "../entities/Message";
import { Media } from "../entities/Media";
import * as dotenv from "dotenv";
import path from "path";

// Garantir que o dotenv seja carregado ANTES de acessar process.env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "whatsapp_api",
  entities: [Tenant, Session, Contact, Message, Media],
  synchronize: process.env.NODE_ENV === "development",
  logging: process.env.NODE_ENV === "production",
  charset: "utf8mb4",
  timezone: "+00:00",
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("Database connected successfully");
    }
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};
