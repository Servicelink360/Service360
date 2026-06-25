# WhatsApp notifications for urgent staff fault assignments

**Status:** Plan only (not implemented)  
**Last updated:** June 2025  
**Scope:** Service360 — notify staff via WhatsApp when assigned to an urgent fault report task (and optional reminder on nudge)

---

## 1. Goal

When an admin assigns a staff member to an **urgent fault report** on the **Urgent reports** tab, the assignee should receive a **WhatsApp message** in addition to the existing **email** and **My tasks** in-app entry.

Optional (phase 2): same channel for **Send reminder** (`PATCH /v1/report-faults/:id/nudge-assignee`).

---

## 2. Current behaviour (baseline)

| Event | Channel today | Code touchpoint |
|-------|---------------|-----------------|
| Admin assigns staff (`delegatedToType: staff`) | Email → staff inbox | `report-faults.service.ts` → `sendStaffMyTasksAssignmentEmail()` |
| Staff opens My tasks | In-app list only | `GET /v1/report-faults/my-tasks` |
| Admin/customer nudge | Email reminder | `nudgeDelegationAssignee()` → `sendStaffMyTasksReminderEmail()` |
| Urgent vs normal | Email subject/body wording only | `priority === 1` check in email helpers |

**Not implemented:** WhatsApp, SMS, push notifications, or use of `users.phone` for alerts.

**Profile prefs today:** Email-only toggles (`emailNotifyUrgentFaultReports`, etc.). Staff assignment emails are **not** gated by those prefs.

---

## 3. Recommended provider

### Option A — Twilio WhatsApp API (recommended for v1)

| Pros | Cons |
|------|------|
| Fast to integrate; sandbox for dev | Per-message cost |
| Good Node/NestJS SDK | Requires Twilio WhatsApp sender approval |
| Template API well documented | Meta still approves message templates |

### Option B — Meta WhatsApp Business Cloud API

| Pros | Cons |
|------|------|
| Direct from Meta; no Twilio markup | More setup (Business Manager, app review) |
| Lower cost at scale | More operational overhead |

**Recommendation:** Start with **Twilio WhatsApp** for speed; abstract behind an internal `WhatsAppService` so the provider can be swapped later.

---

## 4. Architecture

```
setFaultDelegation() / nudgeDelegationAssignee()
        │
        ├── sendStaffMyTasksAssignmentEmail()     (existing)
        └── whatsAppNotifications.sendStaffAssignment()   (new)
                    │
                    ├── isWhatsAppConfigured()
                    ├── staff wants WhatsApp? (pref + valid phone)
                    ├── urgent only? (config flag)
                    └── Twilio / Meta API
```

### Design principles

1. **Email remains primary** — WhatsApp is additive; failure must not block assignment.
2. **Fire-and-forget** — same pattern as email (`void this.send...()`).
3. **Log failures** — never throw from notification path into the assignment API response.
4. **Opt-in** — staff must enable WhatsApp and have a valid mobile on file.
5. **Urgent-only for v1** — reduces volume and template approval scope; expand later if needed.

---

## 5. Database changes

### 5.1 Staff notification preference

Add to `users` (staff + admin if they can be assignees later):

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whatsapp_notify_urgent_assignments BOOLEAN NOT NULL DEFAULT FALSE;
```

Optional audit log (recommended for compliance):

```sql
CREATE TABLE IF NOT EXISTS whatsapp_notification_log (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  report_fault_id INT,
  message_type VARCHAR(32) NOT NULL,  -- 'assignment' | 'reminder'
  phone_e164 VARCHAR(20) NOT NULL,
  provider_message_id VARCHAR(128),
  status VARCHAR(16) NOT NULL,        -- 'sent' | 'failed' | 'skipped'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Apply via existing `postgres-schema-patch.service.ts` migration pattern.

### 5.2 Phone number quality

- Reuse `users.phone` (already on profile).
- Normalize to **E.164** on save and before send (e.g. `+61412345678` for AU).
- Reject or skip send if phone missing/invalid; log `skipped`.

---

## 6. Backend implementation

### 6.1 New module

```
src/notifications/
  whatsapp/
    whatsapp.module.ts
    whatsapp.service.ts          # provider abstraction
    twilio-whatsapp.provider.ts  # Twilio implementation
    whatsapp-message.builder.ts  # template variable mapping
    dto/
```

### 6.2 Environment variables

```env
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=twilio          # twilio | meta
WHATSAPP_URGENT_ONLY=true         # v1: only priority === 1

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # sandbox or approved sender
```

### 6.3 Integration points

| Method | When to call WhatsApp |
|--------|----------------------|
| `setFaultDelegation()` | After save, when `delegatedToType === 'staff'` and `staffUser` resolved |
| `nudgeDelegationAssignee()` | Phase 2 — when `delegatedType === 'staff'` |

**Gate before send:**

```text
WHATSAPP_ENABLED === true
AND isWhatsAppConfigured()
AND (+fault.priority === 1 OR WHATSAPP_URGENT_ONLY === false)
AND staffUser.whatsappNotifyUrgentAssignments === true
AND normalizePhone(staffUser.phone) is valid E.164
```

### 6.4 Message content (template)

WhatsApp requires **pre-approved templates** for outbound business-initiated messages.

**Template name (example):** `servicelink_urgent_fault_assigned`

**Variables:**

1. Staff first name  
2. Site name  
3. Issue summary (truncated ~80 chars)  
4. Act-by date/time (Australia/Sydney)  
5. Short link to My tasks (same as email: `emailMyTasksUrl()`)

**Example body (for Meta/Twilio approval):**

> Hello {{1}}, you have been assigned an urgent fault on Service360.  
> Site: {{2}}  
> Issue: {{3}}  
> Act by: {{4}}  
> Open My tasks: {{5}}

Reminder template (phase 2): `servicelink_urgent_fault_reminder` — same fields, different intro line.

### 6.5 API: notification settings

Extend `PUT /v1/users/notificationSettings` and profile `GET` response:

```json
{
  "whatsappNotifyUrgentAssignments": false
}
```

Staff-only field (customers/admins unchanged unless product expands scope).

---

## 7. Admin frontend implementation

**Repo:** `service_link_admin-main`  
**Reference:** `src/containers/profile/email-notifications.tsx`

### 7.1 Profile UI

Add section below email notifications (staff only):

- **Label:** “WhatsApp — urgent fault assignments”
- **Hint:** “Send a WhatsApp message to your phone number on file when you are assigned an urgent fault. Requires a valid mobile number in your profile.”
- **Toggle:** `whatsappNotifyUrgentAssignments`
- Link to profile phone field if phone empty

### 7.2 Staff directory (admin)

- Show phone column or indicator “WhatsApp ready” when E.164 valid + opt-in.
- Optional: admin warning when assigning staff with no phone / no opt-in (“Email only”).

### 7.3 No change required on assign modal

Assignment flow stays the same; notifications are server-side.

---

## 8. Phased rollout

### Phase 1 — MVP (urgent staff assignment)

- [ ] Twilio sandbox + dev credentials  
- [ ] `WhatsAppService` + log table  
- [ ] DB column `whatsapp_notify_urgent_assignments`  
- [ ] Hook `setFaultDelegation()` for `staff` + `priority === 1`  
- [ ] Profile toggle (API + admin UI)  
- [ ] Phone E.164 validation on profile save  
- [ ] Submit 1 WhatsApp template for approval  
- [ ] Staging test with real staff phone  

### Phase 2 — Reminders

- [ ] WhatsApp on `nudgeDelegationAssignee()` for staff  
- [ ] Second approved template for reminders  
- [ ] Rate limit nudges (e.g. max 1 WhatsApp reminder per fault per 24h)

### Phase 3 — Optional expansions

- [ ] Normal (non-urgent) staff assignments  
- [ ] Personnel / magic-link assignments (different template with secure link)  
- [ ] Admin settings page for provider keys (instead of env-only)  
- [ ] Delivery status webhooks from Twilio → update `whatsapp_notification_log`

---

## 9. Compliance and operations

| Topic | Action |
|-------|--------|
| **Consent** | Opt-in toggle; document in Privacy Policy |
| **Phone storage** | Already collected; note WhatsApp use in policy update |
| **Australia** | ACMA/marketing rules — transactional service messages to opted-in users are lower risk; still document purpose |
| **Costs** | Estimate: assignments/day × WhatsApp per-message fee; set `WHATSAPP_URGENT_ONLY=true` initially |
| **Failures** | Log + monitor; do not retry aggressively (avoid duplicate messages) |
| **Support** | “I didn’t get WhatsApp” → check opt-in, phone format, Twilio logs |

---

## 10. Testing plan

### Unit tests

- Phone normalization (AU formats: `0412…`, `+61412…`, spaces/dashes)  
- Send gated correctly (disabled, no phone, not opt-in, not urgent)  
- Template variable truncation  

### Integration tests (staging)

1. Staff with opt-in + valid phone → assign urgent fault → WhatsApp received  
2. Staff opt-out → assign → email only, log `skipped`  
3. Invalid phone → assign → email only, log `skipped`  
4. `WHATSAPP_ENABLED=false` → no API calls to Twilio  
5. Twilio failure → assignment still returns success  

### Manual QA checklist

- [ ] Assign from Urgent reports tab  
- [ ] Task appears in My tasks  
- [ ] Email still sent  
- [ ] WhatsApp received within ~30s  
- [ ] Toggle off → no WhatsApp on next assign  
- [ ] Update phone → next assign uses new number  

---

## 11. Effort estimate

| Area | Estimate |
|------|----------|
| Twilio account + template approval | 1–3 business days (external) |
| Backend service + hooks + migration | 1–2 days |
| Profile API + admin UI toggle | 0.5 day |
| Phone validation hardening | 0.5 day |
| Staging QA + docs | 0.5 day |
| **Total engineering** | **~3–4 days** (after template approved) |

---

## 12. Open decisions (confirm before build)

1. **Urgent only vs all staff assignments** for v1?  
   → Recommend **urgent only**.

2. **Opt-in default** — `false` (recommended) or `true` for existing staff?  
   → Recommend **false**; communicate rollout to staff.

3. **Twilio vs Meta direct**?  
   → Recommend **Twilio** for v1.

4. **Include normal fault assignments in phase 1?**  
   → Recommend **no**; separate template or parameter later.

5. **Show WhatsApp status in assign UI** (“will notify via WhatsApp”)?  
   → Nice-to-have; not required for MVP.

---

## 13. Related files (implementation reference)

| Layer | Path |
|-------|------|
| Assignment + email | `src/report-faults/report-faults.service.ts` (`setFaultDelegation`, `sendStaffMyTasksAssignmentEmail`) |
| Nudge / reminder | `src/report-faults/report-faults.service.ts` (`nudgeDelegationAssignee`) |
| Personnel email pattern | `src/report-faults/personnel-fault-access.service.ts` |
| Mail helper | `src/helpers/sendEmail.ts` |
| Notification prefs | `src/users/users.service.ts`, `dto/update-customer-notification.dto.ts` |
| Admin profile UI | `src/containers/profile/email-notifications.tsx` |
| Urgent tasks UI | `src/components/report-faults/tasks-faults-panel.tsx` |
| Staff My tasks | `src/containers/staff-my-tasks/index.tsx` |

---

## 14. Success criteria

- [ ] Staff who opt in with a valid mobile receive WhatsApp within 1 minute of urgent assignment  
- [ ] Email and My tasks behaviour unchanged  
- [ ] Assignment API never fails due to WhatsApp errors  
- [ ] All send attempts logged for support  
- [ ] Privacy policy / staff comms updated before production enable
