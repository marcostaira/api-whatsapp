import { Message } from "./Message";
export declare class Media {
    id: string;
    messageId: string;
    message: Message;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    filePath: string;
    thumbnailPath: string;
    caption: string;
    metadata: {
        width?: number;
        height?: number;
        duration?: number;
        pages?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
