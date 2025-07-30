"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
class MediaService {
    constructor() {
        this.uploadPath = process.env.UPLOAD_PATH || "./uploads";
        this.ensureUploadDirectory();
    }
    async ensureUploadDirectory() {
        try {
            await fs_1.promises.access(this.uploadPath);
        }
        catch {
            await fs_1.promises.mkdir(this.uploadPath, { recursive: true });
        }
        const subdirs = ["images", "videos", "audios", "documents", "thumbnails"];
        for (const subdir of subdirs) {
            const dirPath = path_1.default.join(this.uploadPath, subdir);
            try {
                await fs_1.promises.access(dirPath);
            }
            catch {
                await fs_1.promises.mkdir(dirPath, { recursive: true });
            }
        }
    }
    async saveMedia(buffer, mimetype, originalName) {
        const fileExtension = this.getFileExtension(mimetype);
        const filename = `${(0, uuid_1.v4)()}${fileExtension}`;
        const mediaType = this.getMediaType(mimetype);
        const filePath = path_1.default.join(this.uploadPath, mediaType, filename);
        await fs_1.promises.writeFile(filePath, buffer);
        const result = {
            filename,
            filePath,
            size: buffer.length,
            thumbnailPath: undefined,
        };
        if (mediaType === "images") {
            result.thumbnailPath = await this.generateImageThumbnail(filePath, filename);
        }
        else if (mediaType === "videos") {
            result.thumbnailPath = await this.generateVideoThumbnail(filePath, filename);
        }
        return result;
    }
    async getMedia(filePath) {
        try {
            return await fs_1.promises.readFile(filePath);
        }
        catch (error) {
            throw new Error(`File not found: ${filePath}`);
        }
    }
    async deleteMedia(filePath) {
        try {
            await fs_1.promises.unlink(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async generateImageThumbnail(filePath, filename) {
        try {
            const thumbnailFilename = `thumb_${filename}`;
            const thumbnailPath = path_1.default.join(this.uploadPath, "thumbnails", thumbnailFilename);
            await (0, sharp_1.default)(filePath)
                .resize(200, 200, {
                fit: "inside",
                withoutEnlargement: true,
            })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);
            return thumbnailPath;
        }
        catch (error) {
            console.error("Error generating image thumbnail:", error);
            return "";
        }
    }
    async generateVideoThumbnail(filePath, filename) {
        try {
            const thumbnailFilename = `thumb_${filename.replace(/\.[^/.]+$/, ".jpg")}`;
            const thumbnailPath = path_1.default.join(this.uploadPath, "thumbnails", thumbnailFilename);
            return "";
        }
        catch (error) {
            console.error("Error generating video thumbnail:", error);
            return "";
        }
    }
    getMediaType(mimetype) {
        if (mimetype.startsWith("image/"))
            return "images";
        if (mimetype.startsWith("video/"))
            return "videos";
        if (mimetype.startsWith("audio/"))
            return "audios";
        return "documents";
    }
    getFileExtension(mimetype) {
        const mimeToExt = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/quicktime": ".mov",
            "audio/mpeg": ".mp3",
            "audio/ogg": ".ogg",
            "audio/wav": ".wav",
            "audio/mp4": ".m4a",
            "application/pdf": ".pdf",
            "application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/vnd.ms-excel": ".xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
            "text/plain": ".txt",
        };
        return mimeToExt[mimetype] || ".bin";
    }
    async getMediaInfo(filePath, mimetype) {
        const metadata = {};
        try {
            if (mimetype.startsWith("image/")) {
                const imageInfo = await (0, sharp_1.default)(filePath).metadata();
                metadata.width = imageInfo.width;
                metadata.height = imageInfo.height;
            }
        }
        catch (error) {
            console.error("Error getting media info:", error);
        }
        return metadata;
    }
    async optimizeImage(filePath, quality = 80) {
        return await (0, sharp_1.default)(filePath).jpeg({ quality }).toBuffer();
    }
    async resizeImage(filePath, width, height) {
        return await (0, sharp_1.default)(filePath)
            .resize(width, height, {
            fit: "inside",
            withoutEnlargement: true,
        })
            .toBuffer();
    }
    getMediaUrl(filePath) {
        const relativePath = path_1.default.relative(this.uploadPath, filePath);
        return `/media/${relativePath}`;
    }
}
exports.MediaService = MediaService;
//# sourceMappingURL=MediaService.js.map