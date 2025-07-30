"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const Tenant_1 = require("../entities/Tenant");
const Session_1 = require("../entities/Session");
const Contact_1 = require("../entities/Contact");
const Message_1 = require("../entities/Message");
const Media_1 = require("../entities/Media");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "whatsapp_api",
    entities: [Tenant_1.Tenant, Session_1.Session, Contact_1.Contact, Message_1.Message, Media_1.Media],
    synchronize: process.env.NODE_ENV === "development",
    logging: process.env.NODE_ENV === "development",
    charset: "utf8mb4",
    timezone: "+00:00",
});
const initializeDatabase = async () => {
    try {
        if (!exports.AppDataSource.isInitialized) {
            await exports.AppDataSource.initialize();
            console.log("Database connected successfully");
        }
    }
    catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
};
exports.initializeDatabase = initializeDatabase;
//# sourceMappingURL=database.js.map