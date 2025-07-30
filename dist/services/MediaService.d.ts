export declare class MediaService {
    private uploadPath;
    constructor();
    private ensureUploadDirectory;
    saveMedia(buffer: Buffer, mimetype: string, originalName?: string): Promise<{
        filename: string;
        filePath: string;
        size: number;
        thumbnailPath?: string;
    }>;
    getMedia(filePath: string): Promise<Buffer>;
    deleteMedia(filePath: string): Promise<boolean>;
    private generateImageThumbnail;
    private generateVideoThumbnail;
    private getMediaType;
    private getFileExtension;
    getMediaInfo(filePath: string, mimetype: string): Promise<{
        width?: number;
        height?: number;
        duration?: number;
        pages?: number;
    }>;
    optimizeImage(filePath: string, quality?: number): Promise<Buffer>;
    resizeImage(filePath: string, width: number, height: number): Promise<Buffer>;
    getMediaUrl(filePath: string): string;
}
