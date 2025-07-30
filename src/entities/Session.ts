import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Tenant } from "./Tenant";

export enum SessionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  LOGOUT = "logout",
}

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.sessions)
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ unique: true })
  sessionId: string;

  @Column({
    type: "enum",
    enum: SessionStatus,
    default: SessionStatus.DISCONNECTED,
  })
  status: SessionStatus;

  @Column({ type: "text", nullable: true })
  qrCode: string;

  @Column({ type: "text", nullable: true })
  pairingCode: string;

  @Column({ type: "longtext", nullable: true, default: null })
  authState: string | null;

  @Column({ type: "json", nullable: true })
  profileData: {
    id?: string;
    name?: string;
    picture?: string;
    status?: string;
    platform?: string;
    phone?: string;
  };

  @Column({ type: "timestamp", nullable: true })
  lastConnectedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastDisconnectedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
