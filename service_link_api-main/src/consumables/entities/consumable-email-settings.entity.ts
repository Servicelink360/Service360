import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Singleton row (id = 1) for consumables email branding / body. */
@Entity('consumable_email_settings')
export class ConsumableEmailSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  /** Display width in px for the logo in emails. */
  @Column({ name: 'logo_width', type: 'int', nullable: true, default: 140 })
  logoWidth: number | null;

  /** Display height in px for the logo in emails. */
  @Column({ name: 'logo_height', type: 'int', nullable: true, default: 72 })
  logoHeight: number | null;

  @Column({ name: 'brand_name', length: 255, default: 'SERVICELINK' })
  brandName: string;

  @Column({ length: 255, default: 'YOUR PARTNER IN FACILITIES' })
  slogan: string;

  @Column({ name: 'contact_name', length: 255, default: 'Brendan Godfrey' })
  contactName: string;

  @Column({ name: 'contact_title', length: 255, default: 'Facilities Helpdesk' })
  contactTitle: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ length: 64, nullable: true })
  mobile: string | null;

  @Column({ length: 255, nullable: true })
  email: string | null;

  @Column({ length: 255, nullable: true })
  website: string | null;

  @Column({ name: 'footer_text', type: 'text', nullable: true })
  footerText: string | null;

  /** Rich HTML email heading (e.g. Consumables delivery). */
  @Column({ name: 'heading_text', type: 'text', nullable: true })
  headingText: string | null;

  /** Editable intro above the items table. Supports {{customerName}} and {{siteName}}. */
  @Column({ name: 'intro_text', type: 'text', nullable: true })
  introText: string | null;

  /** Editable closing line before the signature block. */
  @Column({ name: 'closing_text', type: 'text', nullable: true })
  closingText: string | null;

  /** Rich HTML for the company / contact signature block (below logo). */
  @Column({ name: 'signature_html', type: 'text', nullable: true })
  signatureHtml: string | null;

  /**
   * Single rich HTML email body. Use {{itemsTable}} where the consumables table should appear.
   * Also supports {{customerName}} {{companyName}} {{siteName}}.
   */
  @Column({ name: 'body_html', type: 'text', nullable: true })
  bodyHtml: string | null;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
