import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Session } from "./Session";
import { Contact } from "./Contact";
import { Message } from "./Message";

export enum TenantStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

@Entity("tenants")
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  apiKey: string;

  @Column({
    type: "enum",
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ default: true })
  receiveGroupMessages: boolean;

  @Column({ default: true })
  autoReconnect: boolean;

  @Column({ type: "text", nullable: true })
  webhookUrl: string;

  @Column({ type: "json", nullable: true })
  settings: Record<string, any>;

  @OneToMany(() => Session, (session) => session.tenant)
  sessions: Session[];

  @OneToMany(() => Contact, (contact) => contact.tenant)
  contacts: Contact[];

  @OneToMany(() => Message, (message) => message.tenant)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
