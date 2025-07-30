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
import { Message } from "./Message";

@Entity("contacts")
export class Contact {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.contacts)
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column()
  whatsappId: string; // Ex: 5511999999999@s.whatsapp.net

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  pushName: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ nullable: true })
  status: string;

  @Column({ default: false })
  isGroup: boolean;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ default: false })
  isBusiness: boolean;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => Message, (message) => message.contact)
  messages: Message[];

  @Column({ type: "timestamp", nullable: true })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
