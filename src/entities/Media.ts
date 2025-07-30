import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Message } from "./Message";

@Entity("media")
export class Media {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  messageId: string;

  @ManyToOne(() => Message, (message) => message.media)
  @JoinColumn({ name: "messageId" })
  message: Message;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @Column()
  filePath: string;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column({ nullable: true })
  caption: string;

  @Column({ type: "json", nullable: true })
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
