import multer from "multer";
export declare const upload: multer.Multer;
export declare const handleUploadError: (error: any, req: any, res: any, next: any) => any;
export declare const validateFileExtension: (filename: string) => boolean;
export declare const getFileCategory: (mimetype: string) => string;
