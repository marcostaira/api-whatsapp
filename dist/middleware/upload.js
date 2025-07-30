"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileCategory = exports.validateFileExtension = exports.handleUploadError = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
        "audio/webm",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
};
const limits = {
    fileSize: parseInt(process.env.MAX_FILE_SIZE?.replace("MB", "") || "50") *
        1024 *
        1024,
    files: 1,
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits,
});
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                error: `File too large. Maximum size is ${limits.fileSize / (1024 * 1024)}MB`,
            });
        }
        if (error.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
                success: false,
                error: "Too many files. Only one file is allowed",
            });
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
                success: false,
                error: 'Unexpected field name. Use "file" as the field name',
            });
        }
    }
    if (error.message.includes("File type")) {
        return res.status(400).json({
            success: false,
            error: error.message,
        });
    }
    return res.status(500).json({
        success: false,
        error: "Upload error occurred",
    });
};
exports.handleUploadError = handleUploadError;
const validateFileExtension = (filename) => {
    const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".mp4",
        ".webm",
        ".mov",
        ".avi",
        ".mp3",
        ".m4a",
        ".ogg",
        ".wav",
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".txt",
        ".csv",
        ".zip",
        ".rar",
        ".7z",
    ];
    const extension = path_1.default.extname(filename).toLowerCase();
    return allowedExtensions.includes(extension);
};
exports.validateFileExtension = validateFileExtension;
const getFileCategory = (mimetype) => {
    if (mimetype.startsWith("image/"))
        return "image";
    if (mimetype.startsWith("video/"))
        return "video";
    if (mimetype.startsWith("audio/"))
        return "audio";
    if (mimetype.includes("pdf") ||
        mimetype.includes("document") ||
        mimetype.includes("sheet") ||
        mimetype.includes("presentation"))
        return "document";
    if (mimetype.includes("text"))
        return "text";
    if (mimetype.includes("zip") ||
        mimetype.includes("rar") ||
        mimetype.includes("7z"))
        return "archive";
    return "other";
};
exports.getFileCategory = getFileCategory;
//# sourceMappingURL=upload.js.map