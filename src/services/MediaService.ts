import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

export class MediaService {
  private uploadPath: string;

  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || "./uploads";
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ["images", "videos", "audios", "documents", "thumbnails"];
    for (const subdir of subdirs) {
      const dirPath = path.join(this.uploadPath, subdir);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
      }
    }
  }

  async saveMedia(
    buffer: Buffer,
    mimetype: string,
    originalName?: string
  ): Promise<{
    filename: string;
    filePath: string;
    size: number;
    thumbnailPath?: string;
  }> {
    const fileExtension = this.getFileExtension(mimetype);
    const filename = `${uuidv4()}${fileExtension}`;
    const mediaType = this.getMediaType(mimetype);
    const filePath = path.join(this.uploadPath, mediaType, filename);

    await fs.writeFile(filePath, buffer);

    const result = {
      filename,
      filePath,
      size: buffer.length,
      thumbnailPath: undefined as string | undefined,
    };

    // Generate thumbnail for images and videos
    if (mediaType === "images") {
      result.thumbnailPath = await this.generateImageThumbnail(
        filePath,
        filename
      );
    } else if (mediaType === "videos") {
      result.thumbnailPath = await this.generateVideoThumbnail(
        filePath,
        filename
      );
    }

    return result;
  }

  async getMedia(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  async deleteMedia(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async generateImageThumbnail(
    filePath: string,
    filename: string
  ): Promise<string> {
    try {
      const thumbnailFilename = `thumb_${filename}`;
      const thumbnailPath = path.join(
        this.uploadPath,
        "thumbnails",
        thumbnailFilename
      );

      await sharp(filePath)
        .resize(200, 200, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      console.error("Error generating image thumbnail:", error);
      return "";
    }
  }

  private async generateVideoThumbnail(
    filePath: string,
    filename: string
  ): Promise<string> {
    // Note: For video thumbnails, you would typically use ffmpeg
    // This is a placeholder implementation
    try {
      const thumbnailFilename = `thumb_${filename.replace(
        /\.[^/.]+$/,
        ".jpg"
      )}`;
      const thumbnailPath = path.join(
        this.uploadPath,
        "thumbnails",
        thumbnailFilename
      );

      // Here you would use ffmpeg to extract a frame from the video
      // For now, we'll return an empty string
      return "";
    } catch (error) {
      console.error("Error generating video thumbnail:", error);
      return "";
    }
  }

  private getMediaType(mimetype: string): string {
    if (mimetype.startsWith("image/")) return "images";
    if (mimetype.startsWith("video/")) return "videos";
    if (mimetype.startsWith("audio/")) return "audios";
    return "documents";
  }

  private getFileExtension(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
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
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
      "text/plain": ".txt",
    };

    return mimeToExt[mimetype] || ".bin";
  }

  async getMediaInfo(
    filePath: string,
    mimetype: string
  ): Promise<{
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
  }> {
    const metadata: any = {};

    try {
      if (mimetype.startsWith("image/")) {
        const imageInfo = await sharp(filePath).metadata();
        metadata.width = imageInfo.width;
        metadata.height = imageInfo.height;
      }
      // Add other media type metadata extraction as needed
    } catch (error) {
      console.error("Error getting media info:", error);
    }

    return metadata;
  }

  async optimizeImage(filePath: string, quality: number = 80): Promise<Buffer> {
    return await sharp(filePath).jpeg({ quality }).toBuffer();
  }

  async resizeImage(
    filePath: string,
    width: number,
    height: number
  ): Promise<Buffer> {
    return await sharp(filePath)
      .resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();
  }

  getMediaUrl(filePath: string): string {
    // This would return a URL to access the media file
    // You might want to implement a media serving endpoint
    const relativePath = path.relative(this.uploadPath, filePath);
    return `/media/${relativePath}`;
  }
}
