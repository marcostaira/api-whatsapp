import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Tenant } from "./Tenant";
import { Contact } from "./Contact";
import { Media } from "./Media";

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  STICKER = "sticker",
  LOCATION = "location",
  CONTACT = "contact",
  REACTION = "reaction",
  POLL = "poll",
  TEMPLATE = "template",
}

export enum MessageStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

export enum MessageDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.messages)
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column()
  contactId: string;

  @ManyToOne(() => Contact, (contact) => contact.messages)
  @JoinColumn({ name: "contactId" })
  contact: Contact;

  @Column({ unique: true })
  messageId: string; // WhatsApp message ID

  @Column({
    type: "enum",
    enum: MessageType,
  })
  type: MessageType;

  @Column({
    type: "enum",
    enum: MessageDirection,
  })
  direction: MessageDirection;

  @Column({
    type: "enum",
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({ type: "text", nullable: true })
  content: string;

  @Column({ nullable: true })
  quotedMessageId: string;

  @Column({ type: "json", nullable: true })
  contextInfo: Record<string, any>;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => Media, (media) => media.message)
  media: Media[];

  @Column({ type: "timestamp" })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
