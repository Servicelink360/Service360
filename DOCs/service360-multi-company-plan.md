# Service360 — Multi-Company Platform Plan

Plan to turn Service360 from a **single-operator product (ServiceLink)** into a **subscription platform** where each paying company gets an independent system like ServiceLink Admin has today — without destroying tenant data when we ship UI/code updates.

---

## 1. Goal

**Example flow**

1. Company1 joins Service360 and pays a subscription.
2. Company1 automatically gets its own independent Admin / Staff / Customer system (same product ServiceLink uses now).
3. Service360 keeps a **Super Admin** over all companies.
4. Product updates (UI + code) roll out to all companies safely.
5. Costs and performance stay practical on AWS.

---

## 2. Current state (today)

| Item | Reality |
|------|---------|
| Model | **One operator** (ServiceLink) + many **customer** companies |
| Roles | Customer `1`, Staff `2`, Admin `3` — Admin is global |
| Isolation | Customers scoped by `customer_companies` / `companyId`; Admins see everything |
| Branding | Mostly hardcoded ServiceLink (PDF, email, logo, ABN, contact) |
| Infra | One EC2 stack, one app DB (`service360`), one mail/S3/LiveKit config |
| Tenant table | **None** for operators — only client `customer_companies` |

**Gap:** There is no “Company1 is its own ServiceLink.” Any Admin today is platform-global.

---

## 3. Recommended architecture

### Best option for this product now

**Shared application + one database per company** (many databases on **one** RDS), plus a small **platform control database**.

```
                    ┌─────────────────────────────┐
                    │  Super Admin (Service360)   │
                    │  DB: service360_platform    │
                    │  tenants, billing, support  │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
     service360_servicelink  service360_company1  service360_company2
     (full product DB)       (full product DB)    (full product DB)
              │                    │                    │
              └──────────── same API + Admin UI ────────┘
                     (versioned build, tenant routing)
```

### Why this approach

| Approach | Verdict |
|----------|---------|
| **DB per company + shared app** | **Recommended** — isolation, reuses current Admin model, auto-provision on pay |
| Shared DB + `operatorId` everywhere | Better at huge scale later; large rewrite and leak risk now |
| Full separate EC2/RDS per company | Only for very large clients; expensive |

---

## 4. Roles

| Role | Scope |
|------|--------|
| **Super Admin** | All companies — see section 4.1 |
| **Company admin** | Only their DB — same power ServiceLink Admin has today |
| **Staff** | Only their company |
| **Customer** | Only their company (existing customer-company scope) |

---

## 4.1 Super Admin (required)

**Super Admin** = Service360 operator above every subscribed company. Not the same as Company1’s admin.

### Who

- You / Service360 staff who run the platform
- Stored in `service360_platform` (e.g. `platform_users`), **not** as a normal `userType.ADMIN` inside every company DB

### What Super Admin can do

| Capability | Description |
|------------|-------------|
| List all companies | Name, subdomain, plan, status (`pending` / `active` / `suspended` / `failed`) |
| Billing overview | Subscription active, past due, cancelled (via Stripe ids on tenant) |
| Provision control | Retry failed DB create / migrate / seed |
| Suspend / resume | Block login for a company without deleting their DB |
| Support access | “Enter Company1” as break-glass — **always audited** |
| Global health | Failed provisions, RDS size, tenant counts |
| Manage Super Admins | Invite other platform operators (optional 2FA) |

### What Super Admin must **not** do by default

- Silently browse all company data as if they were every company admin
- Share one global `ADMIN=3` account that is copied into every tenant DB
- Delete a company DB without a clear suspend → backup → delete workflow

### How support into a company works

1. Super Admin picks Company1 in the platform console.
2. System starts a **support session** (who, when, tenant id) in `support_sessions`.
3. Temporary token opens Company1 Admin **as support**, or opens a read-only console.
4. Session ends; audit log kept.

### Super Admin UI (minimum)

- `/platform` (or `admin.service360.com.au/platform`) — separate from company Admin home
- Tenants table + status badges
- Buttons: Provision retry, Suspend, Resume, Enter as support
- Link to Stripe customer (optional)

### Auth sketch

- Separate login or same login with `role = super_admin` claim in JWT from platform DB
- Company Admin JWT has `tenantId` / db slug only — **no** cross-tenant access
- APIs under `/v1/platform/*` require Super Admin; company APIs reject Super Admin unless in an active support session

**Rule:** Super Admin lives in the **platform DB**. Company Admin lives in the **company DB**. Do not reuse today’s global Admin as the multi-company Super Admin without splitting these.

---

## 5. Subscription → auto-create system

On successful payment (e.g. Stripe webhook):

1. Create tenant row in `service360_platform` (`pending` → `provisioning` → `active`).
2. Create database on RDS, e.g. `service360_company1`.
3. Run schema migrations (same schema as current product).
4. Seed first **company admin** user + invite email.
5. Apply branding defaults (name, logo placeholder, support email).
6. Assign subdomain: `company1.service360.com.au` (or path-based routing).
7. Mark tenant `active`; if any step fails → `failed` + retry, do not leave “paid but no system.”

**Yes — databases can be created automatically.** No manual AWS console work per signup.

---

## 6. AWS / cost

| Question | Answer |
|----------|--------|
| New DB for every company? | **Yes** (database or schema name per company) |
| New RDS / new AWS bill each time? | **No** — usually many DBs on **one** RDS |
| What you pay | Instance size + storage growth + backups |
| When to split | Large / noisy tenant → own RDS later |

---

## 7. Performance

Many databases alone do **not** make the system slow.

What can slow it:

- Total traffic and data on the shared RDS
- Too many DB connections (mitigate with pooling: RDS Proxy / PgBouncer)
- One very heavy tenant affecting others

**Plan:** start shared; watch CPU / connections / storage; scale instance or move heavy tenants.

---

## 8. Shipping UI/code updates without destroying company systems

**Shared code, separate data.**

```
New API + Admin build
        │
        ├── migrate service360_servicelink
        ├── migrate service360_company1
        ├── migrate service360_company2
        └── restart app (same version for all)
```

### Rules

- Deploy = **new build + forward migrations**, never recreate tenant DBs.
- Migrations additive first (add columns/tables); delay destructive drops.
- Tenant settings and branding live in **each company DB** (or platform registry), not hardcoded.
- Back up (or snapshot strategy) before mass migrate.
- Rollback = previous app image; avoid irreversible schema drops until safe.

Company1’s sites, staff, faults, files stay in **their** database.

---

## 9. Branding / white-label (required early)

Every company must edit its own logo and identity. The system must read **tenant branding settings**, not ServiceLink hardcodes.

### Target settings (per company DB or platform tenant row)

| Field | Example (today’s ServiceLink) |
|-------|-------------------------------|
| `logoUrl` | servicelink-logo.png |
| `legalName` | Servicelink Pty Ltd |
| `abn` | 77 624 079 698 |
| `address` | Suite 309/49-51 Queens Rd, Five Dock NSW 2046 |
| `phone` | 0420 220 220 (PDFs) / 0424 166 776 (consumables — already inconsistent) |
| `website` | www.servicelink.net.au |
| `helpdeskEmail` | helpdesk@servicelink.net.au |
| `brandName` | ServiceLink / SERVICELINK |
| `mailFrom` / `mailFromName` | per company |
| `footerTagline` | Your Partner in Facilities … |

### What is already partly dynamic

| Mechanism | Covers | Gap |
|-----------|--------|-----|
| `MAIL_FROM`, `MAIL_FROM_NAME` | Global mail From | Not per company |
| `REACT_APP_FOOTER_BRAND`, `REACT_APP_FOOTER_COMPANY_URL` | Footer copyright only | Build-time, not tenant; logo not included |
| `REPORT_PDF_LOGO_PATH` / `REPORT_PDF_LOGO_URL` | PDF logo file override | Legal text still hardcoded in HTML |
| `consumable_email_settings` (DB) | Consumables email brand/contact; messages reads `brand_name` only | **PDFs / sidebar logo / MAIL_FROM ignore this** |
| Training cert layout JSON | Per-cert org overrides | Defaults still Service360 / ServiceLink logo |

### Hardcoded inventory (must become dynamic)

#### Logos
- `service_link_admin-main/src/components/utility/logo.tsx` — sidebar ServiceLink logo
- Admin assets: `servicelink-logo.png`, transparent / sidebar / SVG variants
- API: `public/assets/servicelink-logo.png`, `logo-a8a4.png`
- PDF resolvers: `helpers/util.ts`, `toolbox-record-pdf.ts`, `training-certificate.ts`
- Certificate preview: `certificatePreview.tsx`

#### Legal block (name, ABN, address, phone, web, helpdesk)
- **`template.html`** — full header block hardcoded (only logo is `{{LOGO_URL}}`)
- `toolbox-record-pdf.ts` — same block
- `helpers/util.ts` — footer `www.servicelink.net.au`, default `submittedBy: 'ServiceLink'`
- Consumables seed (`consumables.service.ts`, `postgres-schema-patch.service.ts`) — Five Dock, helpdesk, brand SERVICELINK
- Monthly pack: `MonthlyCustomerPack.tsx` — `preparedBy: 'ServiceLink Pty Ltd\nService360'`, “Servicelink will continue…”, “Delivered to Servicelink staff”
- `monthly-reports.service.ts` — `submittedBy: 'ServiceLink'`
- Marketing legal: `legalContent.ts` — `LEGAL_OPERATOR = 'SERVICELINK'`
- `site.config.ts` — default footer URL servicelink.net.au

#### Emails / labels
- Contact / marketing: `helpdesk@servicelink.net.au`
- Messages UI: `"Help from Servicelink"`, fallback `'ServiceLink'`
- API messages / faults: assignee display `'Servicelink'`, “Servicelink Support conversation”
- Customer notifications: “assigned … to Servicelink”
- `sendEmail.ts` / `emailContent.ts` — Service360 support defaults (platform OK; operator mail must be tenant-aware)

#### Can stay Service360 (platform product brand)
- Marketing site, signup, `index.html` SEO, login “Service360” product chrome
- Smoke scripts / tmp files (non-prod)

### MVP fix order
1. Add **tenant branding** table/settings (or extend `consumable_email_settings` into a real `operator_branding`).
2. Wire **PDF template** + util footer + toolbox PDF to those fields.
3. Wire **admin logo** + footer at runtime from tenant (not only `REACT_APP_*`).
4. Wire **messages / faults / monthly pack** operator strings.
5. Per-tenant **mail From** + helpdesk.
6. New companies seed **their** branding — never inherit ServiceLink Five Dock / helpdesk by default.

**Largest risk if skipped:** Company2 customers still get ServiceLink ABN and Five Dock on every PDF.

---

## 10. Hardcoded (system-wide, beyond branding)

Inventory of other hardcodes that would break or look wrong for a second independent company. Branding/logo/ABN/helpdesk in **§9**; email/domain setup in **§11**.

### 10.1 Client-specific logic

| Finding | Where | Priority |
|---------|--------|----------|
| ~~**Bayside / Mascot** site sort / monthly parent order~~ | Replaced by `sites.dropdown_sort_order` (seed once for ServiceLink; runtime is data-driven) | **Done** |
| Monthly pack parent detection via `"Public Amenities"` name | `MonthlyCustomerPack.tsx` — convention, not client-specific | Can-wait → optional `is_amenity_parent` flag later |
| Training module code `'SL'` / Gateway rename to Servicelink | `training.service.ts` | **Must-fix** |
| Service name gate `"Public Amenities Cleaning"` | `report-fault-toilet-area.constants.ts` | Can-wait if data stays named that way |
| Marketing “Bayside Council” sample packs | `MonthlyReportPage.tsx`, How it works | Can-wait (platform marketing) |

### 10.2 Permissions / isolation

| Finding | Where | Priority |
|---------|--------|----------|
| **`checkRole()` always `return true`** — UI permissions bypass | `admin/.../library/helpers/utility.js` | **Must-fix** |
| Meetings **`clearAll`** deletes all meetings/invites (no company scope) | `meetings.service.ts` | **Must-fix** if shared DB |
| Single global brand row `consumable_email_settings` `LIMIT 1` | `messages.service.ts`, consumables | **Must-fix** |
| Admin-only APIs with no tenant id | various | OK today; needs per-company admin later |

### 10.3 LiveKit / meetings

| Finding | Where | Priority |
|---------|--------|----------|
| Room names `svc360-m-{id}` | `meetings.service.ts` | **Must-fix** if shared LiveKit across companies |
| Default participant name `'Service360'` | same | Can-wait |
| `LIVEKIT_*` from env | config | OK/env-only |

### 10.4 URLs / IPs / hosts

| Finding | Where | Priority |
|---------|--------|----------|
| Legacy PDF logo host `http://3.104.215.45:8001/...` | `helpers/util.ts` | **Must-fix** |
| Stale upload/API hosts in some env files (`3.104`, `3.106`) | `api/.env.prod`, `admin/.env.prod`, `.env.qa` | **Must-fix** if used in builds |
| Image-thumb allowlist: ServiceLink hosts / IPs only | `upload/image-thumb.controller.ts` | **Must-fix** |
| Prod API `https://api.service360.com.au/` | env | OK/env-only |
| Marketing sample PDFs on `service360basket` S3 | HowItWorksPage | Can-wait |
| CORS `origin: "*"` | `main.ts` | Can-wait (security) |

### 10.5 Emails / phones (extra)

| Finding | Where | Priority |
|---------|--------|----------|
| Contact error copy hardcodes `helpdesk@servicelink.net.au` | `contact.service.ts` | **Must-fix** |
| Forgot-password sends to **`quybv90@gmail.com`** | `users.service.ts` | **Must-fix** (wrong recipient) |
| Swagger DTO defaults same gmail | `auth/dto/*.ts` | Can-wait |
| Platform `support@service360.com.au` / `mail@service360.com.au` | email helpers, env | OK (platform) |

### 10.6 Timezone / locale (AU-only)

| Finding | Where | Priority |
|---------|--------|----------|
| Photo stamp `en-AU` + `Australia/Sydney` | `stamp-photo.ts`, field camera | **Must-fix** if company not Sydney |
| Fixed `AU_UTC_OFFSET = '+10:00'` (no DST) | `australianDatetime.ts` | **Must-fix** (wrong in AEDT even for Sydney) |
| Widespread Sydney / `en-AU` in PDFs, faults, training, lists | many API + admin files | Must-fix for non-AU; Can-wait if all tenants AU/Sydney |
| App date format `DD/MM/YYYY` | `data.config.ts` | Can-wait if AU-only |
| Reverse geocode AU-shaped | `reverse-geocode.ts` | Can-wait |

### 10.7 Uploads / storage

| Finding | Where | Priority |
|---------|--------|----------|
| S3 key prefix `admin-uploads/YYYY-MM-DD/...` (no tenant) | `s3-upload.helper.ts` | Can-wait → later prefix by company |
| Bucket via `S3_BUCKET` env | config | OK/env-only |
| Local `./public/upload/files` | upload controller | OK |

### 10.8 Product copy (operator assumptions)

| Finding | Where | Priority |
|---------|--------|----------|
| Help: “How to set up ServiceLink”, “email the ServiceLink team” | `help/how-to.tsx` | **Must-fix** |
| Admin personnel: “Add Servicelink contacts…” | `admin-personnel/index.tsx` | **Must-fix** |
| Fault label `CUSTOMER_SERVICE_PROVIDER_LABEL = 'Servicelink'` | `fault-delegation-cell.tsx` | **Must-fix** |
| Messages: `/servicelink/i` support party + “Help from Servicelink” | `messages/index.tsx` | **Must-fix** |
| Consumables portal fallback `'SERVICELINK'` | `consumables/index.tsx` | **Must-fix** |
| Cert preview “Servicelink Training” | `certificatePreview.tsx` | **Must-fix** |

### 10.9 Priority summary (this section)

**Must-fix first (highest leverage):**
1. ~~Bayside/Mascot sort + monthly-pack client logic~~ → `sites.dropdown_sort_order` (**done**)  
2. `checkRole` always true  
3. LiveKit `svc360-m-*` + meetings `clearAll`  
4. Stale `3.104` PDF logo URL + env hosts  
5. Image-thumb host allowlist  
6. Contact / help / fault / messages / consumables operator strings  
7. Single `consumable_email_settings` brand row  
8. Sydney/+10 hardcoding if tenants aren’t all Sydney  
9. Forgot-password gmail hardcode  

**OK as env:** API URL, S3, LiveKit keys, `MAIL_FROM`, Docker build args.

**Can-wait:** marketing samples, ops scripts, AU date format if all tenants AU, shared `admin-uploads/` until per-tenant keys.

---

## 11. Company email & existing domain setup

Each company must set up **their own helpdesk email** and (optionally) **their existing domain**. ServiceLink’s helpdesk stays on the ServiceLink tenant only — never shared across companies.

### 11.1 Goal

| Company needs | Outcome |
|---------------|---------|
| Own helpdesk address | e.g. `help@company1.com.au` — replies and PDF/UI contact |
| Existing domain | e.g. `company1.com.au` — DNS auth so they can later send as themselves |
| No clash | Many companies must **not** all use `helpdesk@servicelink.net.au` |

### 11.2 Recommended mail model

| Piece | Value | Notes |
|-------|--------|------|
| **Technical From** (MVP) | `mail@service360.com.au` | Shared; SPF/DKIM set once on Service360 |
| **From display name** | Company brand name | e.g. `Company1 <mail@service360.com.au>` |
| **Reply-To** | Company `helpdeskEmail` | Customer replies go to **their** inbox |
| **Custom From** (later) | `help@company1.com.au` | Only after domain DNS verified |

Example outbound mail:

```
From:     Company1 <mail@service360.com.au>
Reply-To: help@company1.com.au
Body:     company logo / branding
```

### 11.3 What exists today (gap)

| Piece | State |
|-------|--------|
| Organisation Settings (`/settings`) | Generic key/value — **not** email/domain setup |
| Consumables email settings | Brand / logo / contact for supplier emails only |
| Send mail (`MAIL_FROM` / Brevo) | **One global From** for the whole app |
| Custom domain / DNS verify UI | **None** |
| Per-company helpdesk as Reply-To everywhere | **Not wired** as first-class company setup |
| New-company seed | Risk of inheriting ServiceLink helpdesk / Five Dock defaults |

**Conclusion:** a new company **cannot** self-serve “our email + our existing domain” today.

### 11.4 System requirements (data)

Per company (tenant DB or branding table), store at least:

| Field | Purpose |
|-------|---------|
| `helpdeskEmail` | Their support address (Reply-To + PDFs/UI) |
| `helpdeskEmailVerified` | Optional confirm-link flag |
| `sendingDomain` | e.g. `company1.com.au` |
| `domainStatus` | `not_started` → `pending_dns` → `verified` / `failed` |
| `dnsRecordsJson` | Instructions last shown (SPF / DKIM / DMARC) |
| `customFromEnabled` | True only when domain verified |
| `mailFromName` | Display name on outbound mail |

**Rules**

- New companies: default helpdesk = signup admin email or **empty** — **never** `helpdesk@servicelink.net.au`.
- ServiceLink tenant only: seed `helpdesk@servicelink.net.au`.
- Domain should match helpdesk email domain (or warn).
- Do not allow every tenant to claim the same shared ServiceLink inbox as their helpdesk for live sending identity.

### 11.5 UI requirements (company admin)

Dedicated **Email & domain** setup (tab under Admin → Organisation, or own page):

1. **Helpdesk email** — input + save (+ optional “send confirmation link”).
2. **How sending works** — short copy: “We send from Service360; replies go to your helpdesk.”
3. **Your domain** — input existing domain (e.g. `company1.com.au`).
4. **DNS checklist** — copyable SPF / DKIM (/ DMARC) records.
5. **Verify domain** — button + status badge (`pending` / `verified` / `failed`).
6. **Test email** — send sample to the logged-in admin.
7. After verified — option to send **From** their domain (not only Reply-To).

**Super Admin:** see each tenant’s helpdesk + domain status; retry verify; never silently overwrite with ServiceLink defaults.

### 11.6 What is automatic vs not

| Step | Automatic? |
|------|------------|
| Save helpdesk + use as Reply-To | **Yes** |
| Brand From display name / logo in body | **Yes** |
| Generate DNS instructions | **Yes** |
| Publish DNS on their domain | **No** — company (or their IT) adds records |
| Detect records / mark verified | **Yes** (DNS lookup and/or Brevo domain API) |
| Switch From to their address | **Yes**, after verified |

You cannot silently authenticate `company1.com.au` without DNS access on that domain.

### 11.7 Clash if many companies share one helpdesk

If every company used `helpdesk@servicelink.net.au`:

- All replies land in one inbox — cannot separate Company1 vs Company2  
- Company2 identity looks like ServiceLink  
- Routing / tickets / support break  
- One domain cannot honestly be “from” many unrelated companies  

**Rule:** each company owns its helpdesk address; ServiceLink’s stays for ServiceLink only.

### 11.8 Build order (email & domain)

1. Persist `helpdeskEmail` + `sendingDomain` + `domainStatus`.
2. UI: helpdesk save + wire **Reply-To** on outbound mail.
3. UI: domain + DNS instructions + verify.
4. Replace hardcoded ServiceLink helpdesk in PDFs / messages / contact with tenant settings.
5. Optional: custom From after verify (Brevo/domain API).
6. Onboarding gate: “Confirm helpdesk email” before go-live.

### 11.9 Risks

- Consumables email settings ≠ full company email setup — need a clear company-level screen.
- Hardcoded ServiceLink helpdesk in PDFs/messages will ignore this UI until wired.
- Custom From needs provider **domain** support, not only transactional send.
- Without verify, UI could claim any domain — verification required before custom From.

---

## 12. Platform control plane (minimum tables)

Suggested `service360_platform` contents:

- `tenants` — id, name, slug/subdomain, db_name, status, plan, created_at  
- `subscriptions` — stripe customer/subscription ids, renewals, cancel state  
- `platform_users` — **Super Admins**  
- `provision_jobs` — attempts, errors, retries  
- `support_sessions` — Super Admin support access into a tenant (who / when / tenant)  

---

## 13. Phased delivery

### Phase 0 — Prep (current codebase)

1. Inventory hardcoded ServiceLink strings (PDF, email, UI, smoke scripts).
2. Externalize branding to config/settings.
3. Document current schema as the **tenant template**.
4. Design **Email & domain** settings (see §11) — helpdesk + domain status fields.

### Phase 1 — MVP multi-company

1. Create `service360_platform` DB + tenant registry.
2. Tenant routing (subdomain → DB connection).
3. Manual or scripted “provision tenant” (create DB, migrate, seed admin).
4. **Super Admin** UI: list tenants, status, suspend/resume, open support access.
5. Company **Email & domain** UI: helpdesk + Reply-To wiring (custom From optional later).
6. Prove: update app once → migrate all tenant DBs → no data loss.

### Phase 2 — Self-serve subscription

1. Stripe (or similar) checkout + webhooks.
2. Auto-provision on payment.
3. Invite email + first-login + **confirm helpdesk email** onboarding step.
4. Suspend / resume / cancel lifecycle.

### Phase 3 — Hardening

1. Connection pooling.
2. Per-tenant backups / restore runbook.
3. Feature flags for risky releases.
4. Metrics dashboards (per-tenant health).
5. Domain DNS verify + optional custom From.
6. Optional: dedicated RDS for large customers.

### Phase 4 — Optional later

- Shared-DB multi-tenant (`operatorId`) only if ops cost of many DBs becomes the bottleneck.
- Billing portal, usage limits, marketplace add-ons.

---

## 14. Non-goals (for early phases)

- Rewriting every query for shared-DB `operatorId` before MVP
- One new EC2 stack per small subscriber
- Silent cross-tenant Admin access without audit log
- Giving every company a mailbox on `@servicelink.net.au`
- Requiring custom-domain From on day one (Reply-To first)

---

## 15. Success criteria

- [ ] Paying company gets a working Admin system automatically (or via one provision job).
- [ ] Company admin cannot see other companies’ data.
- [ ] **Super Admin** can list/manage all companies and enter support sessions with audit log.
- [ ] One product deploy updates UI/code for all tenants without wiping DBs.
- [ ] Branding per company on PDFs/emails/UI.
- [ ] Each company has its own **helpdesk email**; ServiceLink helpdesk not shared.
- [ ] Company can enter **existing domain**, see DNS steps, and verify (custom From after verify).
- [ ] AWS cost scales mainly with **usage**, not “one RDS fee per signup.”

---

## 16. What else is needed (beyond architecture)

Items not fully covered above but required for a real launch:

### Product / signup
- [ ] Public **pricing + signup** page (Service360 branded)
- [ ] Plans (monthly/yearly), trial length, what is included
- [ ] Onboarding checklist after first login (add site, invite staff, logo)
- [ ] Company admin **invite / password reset** flows that work per tenant

### Domains & TLS
- [ ] Wildcard DNS + cert (`*.service360.com.au`) or automatic subdomain provisioning
- [ ] Map custom domains later (optional): `admin.company1.com.au`

### Files & media (S3)
- [ ] **Prefix per tenant** (or separate bucket) so uploads never mix  
  e.g. `s3://…/tenants/company1/…`
- [ ] `BASE_UPLOAD_URL` / CDN rules aware of tenant

### Email & domain
- See **§11** for full design. Checklist:
- [ ] Company **Email & domain** UI (helpdesk, domain, DNS, verify, test send)
- [ ] Per-tenant Reply-To + From display name (MVP send via Service360 domain)
- [ ] Domain verify → optional custom From
- [ ] SPF/DKIM on Service360 domain (once); per-company DNS when using their domain
- [ ] Templates: invite, fault notify, invoice — use tenant branding / helpdesk
- [ ] Never seed new tenants with `helpdesk@servicelink.net.au`

### Security
- [ ] Tenant isolation tests (Company1 token must fail on Company2 APIs)
- [ ] Rate limits on signup / provision
- [ ] Super Admin 2FA
- [ ] Secrets: per-tenant JWT isolation (tenant id in token; reject cross-tenant)
- [ ] Cancelled tenant: block login, keep DB soft-suspended for X days

### Legal / business
- [ ] Terms of service, privacy, DPA between Service360 and Company1
- [ ] Who owns customer data on cancel / export
- [ ] Invoice / tax (Stripe Tax or accountant process)
- [ ] Support SLA (who Company1 emails — you vs their own helpdesk)

### Ops
- [ ] Runbook: provision failure, restore one tenant from backup
- [ ] Migrate-all-tenants job in CI/deploy
- [ ] Monitoring: provision queue, RDS connections, disk, failed logins
- [ ] Smoke test matrix: Super Admin + 1–2 sample tenants after each release

### Realtime / extras already in product
- [ ] LiveKit / meetings: room naming includes tenant id (no cross-talk)
- [ ] Push / notifications keys scoped or shared carefully
- [ ] Mobile / PWA: know which tenant (subdomain or tenant picker)

### Data lifecycle
- [ ] Export company data (DB dump or guided export)
- [ ] Delete tenant after retention period
- [ ] Seed data policy: empty system vs sample sites for demos

### Not required for MVP (can wait)
- Marketplace apps, usage-based metering, dedicated RDS per customer, full shared-DB rewrite

---

## 17. Summary

| Decision | Choice |
|----------|--------|
| Product model | Each subscriber = independent operator system |
| Data | **One database per company** on shared RDS |
| App | **One shared** API + Admin version |
| Super Admin | **Platform DB** + tenant registry + audited support access |
| Signup | **Auto-provision** on subscription |
| Updates | Migrate all tenant DBs + restart shared app |
| Branding | Config/settings per tenant (not hardcoded ServiceLink) — **§9** |
| Other hardcodes | Bayside/Mascot, roles, LiveKit, Sydney time, stale IPs — **§10** |
| Email MVP | From Service360 domain + per-company **Reply-To** helpdesk — **§11** |
| Email later | Company **existing domain** + DNS verify + optional custom From |
| Helpdesk rule | Each company owns its address; ServiceLink’s stays ServiceLink-only |

This is the path from “ServiceLink-only Service360” to “Service360 as a multi-company subscription platform” with the lowest rewrite risk and strong isolation.
