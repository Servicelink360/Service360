# Staff-Template Assignment Database Schema Analysis

## 1. TEMPLATE ASSIGNMENT TO STAFF MECHANISM

### Primary Assignment Entities

#### **Task Entity** (`src/tasks/entities/task.entity.ts`)
```typescript
@Entity('tasks')
export class Task extends BaseEntity {
    @Column()
    name: string
    
    @Column({ name: 'staff_id' })
    staffId: number
    
    @JoinColumn({ name: 'staff_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    staff?: User
    
    @Column({ name: 'report_template_id' })
    reportTemplateId: number
    
    @JoinColumn({ name: 'report_template_id' })
    @ManyToOne(() => ReportTemplate, { orphanedRowAction: 'delete' })
    reportTemplate?: ReportTemplate
    
    // Additional context fields
    @Column()
    description: string
    @Column({ name: 'start_date' })
    startDate: Date
    @Column({ name: 'end_date' })
    endDate: Date
    @Column()
    type: string // Task type
    @Column()
    status: number
}
```

**Purpose**: Assigns a report template to a staff member for a specific task. This is the primary way admins assign templates to staff.

---

#### **UserTask Entity** (`src/user-tasks/entities/user-task.entity.ts`)
```typescript
@Entity({ name: "user_tasks" })
export class UserTask {
    @Column({ name: 'staff_id' })
    staffId: number
    
    @JoinColumn({ name: 'staff_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    staff?: User
    
    @Column({ name: 'report_template_id' })
    reportTemplateId: number
    
    @JoinColumn({ name: 'report_template_id' })
    @ManyToOne(() => ReportTemplate, { orphanedRowAction: 'delete' })
    reportTemplate?: ReportTemplate
    
    // Task context
    @Column({ name: 'task_id' })
    taskId: number
    @Column({ name: 'task_name' })
    taskName: string
    @Column({ name: 'start_time' })
    startTime: Date
    @Column({ name: 'end_time' })
    endTime: Date
    @Column({ name: 'site_id' })
    siteId: number
    @Column({ name: 'site_name' })
    siteName: string
    @Column({ name: 'customer_id' })
    customerId: number
    @Column({ name: 'department_id' })
    departmentId: string
    @Column()
    status: number
    
    @OneToMany(() => UserTaskReport, t => t.userTask, { cascade: true })
    reports?: UserTaskReport[]
}
```

**Purpose**: Represents an instance of a task assigned to a staff member with the associated report template. This is created when a task is assigned/checked in by staff.

---

### Assignment Flow
1. Admin creates a **Task** with `reportTemplateId` and `staffId`
2. When staff checks in or task is assigned, a **UserTask** record is created with the same template and staff reference
3. Staff completes the task and submits reports using the assigned template

---

## 2. API ENDPOINTS FOR FETCHING ASSIGNED TEMPLATES

### User Tasks Controller (`src/user-tasks/user-tasks.controller.ts`)

**Key Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/user-tasks` | GET | Fetch all user tasks for current user (filters by staffId if STAFF type) |
| `/user-tasks/:id` | GET | Get single user task details with its report template |
| `/user-tasks/getUserTaskToday` | GET | Get tasks for today with optional status filter |
| `/user-tasks/getUserTaskByStatus` | GET | Get tasks filtered by status (p=pending, i=in progress, s=success) |
| `/user-tasks/getAllUserTaskToday` | GET | Get all user tasks for today |

### Service Methods (`src/user-tasks/user-tasks.service.ts`)

#### **getUserTaskByStatus()**
```typescript
async getUserTaskByStatus(
    userInfo: IUserInfo, 
    status?: string, 
    siteId?: number, 
    departmentId?: string, 
    staffId?: number
)
```

**Query Logic:**
```typescript
const query = this.userTasksRepository.createQueryBuilder('usertasks')
    .innerJoin('usertasks.staff', 'staff', 'staff.status!=4')
    .addSelect(['staff.fullName', 'staff.username'])
    .leftJoin('usertasks.customer', 'customer')
    .addSelect(['customer.fullName', 'customer.username'])

// Filters by staffId based on user type
if (userInfo.type == userType.STAFF) {
    query.andWhere("( usertasks.staffId= :staffId )", { staffId: userInfo.userId })
}
else if (userInfo.type == userType.ADMIN && +staffId) {
    query.andWhere("( usertasks.staffId= :staffId )", { staffId: +staffId })
}
```

**Returns**: All UserTask records with their associated `reportTemplate` loaded, filtered by staffId

---

#### **findOne(id: number)**
Retrieves a single user task by ID with full relationship data including the report template.

---

#### **getAllUserTasksByUserId()**
Fetches all user tasks for a specific user with pagination and filtering.

---

### Tasks Controller (`src/tasks/tasks.controller.ts`)

**Key Endpoints:**
- `GET /tasks` - List all tasks with templates
- `GET /tasks/:id` - Get specific task with template details
- `POST /tasks` - Create new task with template assignment
- `PATCH /tasks/:id` - Update task (including template assignment)

---

## 3. COMPLETED REPORTS STORAGE

### Report Storage Entities

#### **UserTaskReport Entity** (`src/user-tasks/entities/user-task-report.entity.ts`)
```typescript
@Entity({ name: "user_task_reports" })
export class UserTaskReport {
    @PrimaryGeneratedColumn()
    id: number
    
    @Column({ name: 'user_task_id' })
    userTaskId: number
    
    @JoinColumn({ name: 'user_task_id' })
    @ManyToOne(() => UserTask, { orphanedRowAction: 'delete' })
    userTask?: UserTask
    
    @Column()
    name: string          // Field name from template
    
    @Column()
    type: string          // Field type (text, checkbox, date, etc.)
    
    @Column()
    value: string         // Submitted value by staff
    
    @Column()
    order: number         // Field order from template
    
    @CreateDateColumn({ default: 'now()', name: 'created_at' })
    createdAt: Date
}
```

**Purpose**: Stores individual field responses submitted by staff for each user task. Related back to UserTask which contains the template reference.

**Data Structure:**
- Multiple rows per user task (one row per field in the template)
- Each row stores: field name, type, submitted value, and submission timestamp
- Links to UserTask which links to ReportTemplate (allowing template reconstruction)

---

#### **ReportFault Entity** (`src/report-faults/entities/report-fault.entity.ts`)
```typescript
@Entity('report_faults')
export class ReportFault extends BaseEntity {
    @Column()
    subject: string
    
    @Column({ name: 'customer_id' })
    customerId: number
    
    @Column({ name: 'staff_id' })
    staffId: number
    
    @JoinColumn({ name: 'staff_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    staff?: User
    
    @Column()
    message: string
    
    @Column({ name: 'site_id' })
    siteId: number
    
    @Column({ name: 'department_id' })
    departmentId: string
    
    @Column()
    priority: number
    
    @Column({ name: 'attach_files' })
    attachFiles: string
    
    @Column()
    status: number
    
    @OneToMany(() => ReportFaultAnswer, t => t.reportFault, { cascade: true })
    answers?: ReportFaultAnswer[]
}
```

**Purpose**: Stores fault/issue reports submitted by staff. Does NOT directly link to templates but is a separate reporting mechanism.

---

#### **ReportFaultAnswer Entity** (`src/report-faults/entities/report-fault-answer.entity.ts`)
```typescript
@Entity('report_fault_answers')
export class ReportFaultAnswer extends BaseEntity {
    @Column({ name: 'report_fault_id' })
    reportFaultId: number
    
    @JoinColumn({ name: 'report_fault_id' })
    @ManyToOne(() => ReportFault, { orphanedRowAction: 'delete' })
    reportFault?: ReportFault
    
    @Column()
    message: string
    
    @Column({ name: 'user_id' })
    userId: number
    
    @JoinColumn({ name: 'user_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    user?: User
    
    @Column({ name: 'type' })
    type: number
    
    @Column({ name: 'attach_files' })
    attachFiles: string
}
```

**Purpose**: Stores answers/comments on fault reports (similar to a comment thread).

---

### Report Faults Service Methods (`src/report-faults/report-faults.service.ts`)

#### **findAll()**
Fetches all report faults with filtering:
```typescript
const query = this.reportFaultsRepository.createQueryBuilder('reportFaults')
    .leftJoin('reportFaults.answers', 'answers')
    .leftJoinAndSelect('answers', 'answers')

// Filter by staff ID if user type is STAFF
if (userInfo.type === userType.STAFF) {
    query.andWhere("( reportFaults.staffId = :staffId)", { staffId: +userInfo.userId })
}

// Filter by status and date range
if (+body.status) {
    query.andWhere("( reportFaults.status = :status)", { status: +body.status })
}
if (body.startDate && body.endDate) {
    query.andWhere('reportFaults.createdAt > :startDate AND reportFaults.createdAt< :endDate', {
        startDate: moment(body.startDate).format("YYYY-MM-DD 00:00:00"),
        endDate: moment(body.endDate).format("YYYY-MM-DD 23:59:59")
    })
}
```

---

## 4. COMPLETE DATA FLOW SUMMARY

### Assigning Templates to Staff
```
Admin Creates Task
    ├── task.name
    ├── task.staffId (assign to staff member)
    ├── task.reportTemplateId (select which template to use)
    ├── task.startDate / endDate
    └── task.shifts (optional shift configuration)
         ↓
Staff Checks In / Task Assigned
         ↓
    UserTask created with:
    ├── staff_id (from task)
    ├── report_template_id (from task)
    ├── task_id (reference to task)
    └── reports[] (empty initially)
```

### Submitting Reports
```
Staff Completes Task
    ├── Submits form responses
    ├── For each template field submitted
         ↓
    UserTaskReport created with:
    ├── user_task_id
    ├── field name
    ├── field type
    ├── submitted value
    └── created_at timestamp
```

### Fault Reporting (Separate)
```
Staff Reports Fault/Issue
    ├── Creates ReportFault
    ├── fault.staffId
    ├── fault.subject / message
    ├── fault.priority
    └── fault.status
         ↓
    Admin Responds
         ↓
    ReportFaultAnswer created with:
    ├── report_fault_id
    ├── user_id (responder)
    ├── message (response)
    └── type (role of responder)
```

---

## 5. KEY DIFFERENCES

| Aspect | UserTask/UserTaskReport | ReportFault |
|--------|------------------------|------------|
| **Purpose** | Template-based structured reports | Free-form fault/issue reporting |
| **Template Use** | REQUIRED - template defines form | OPTIONAL - no template structure |
| **Data Storage** | One row per field (normalized) | Single row with message field |
| **Responses** | UserTaskReport rows | ReportFaultAnswer as comments |
| **Workflow** | Task → UserTask → UserTaskReports | Direct fault submission |
| **Staff Assignment** | Assigned via Task → UserTask | Submitted directly by staff |

---

## 6. ENTITY RELATIONSHIPS DIAGRAM

```
ReportTemplate
    ↑
    ├─ has many items (ReportTemplateItem)
    │
    └─ assigned via Task
           ↓
           Task (staffId, reportTemplateId)
           ├── has many shifts (TaskShift)
           └── creates → UserTask (staffId, reportTemplateId)
                             ↓
                             User (staff member)
                             └─ completes → UserTaskReport[]
                                    (field responses)

Separately:
User (staff)
    ├─ submits → ReportFault
    │               └─ has many → ReportFaultAnswer[]
    │
    └─ creates/updates → ReportFaultAnswer
```

---

## Summary

- **Assignment**: Admin assigns templates to staff through **Task** entity (task.staffId + task.reportTemplateId)
- **Fetching**: Use `getUserTaskByStatus()` or `getAllUserTasksByUserId()` to get assigned templates by staffId
- **Completed Reports**: Stored in **UserTaskReport** (template-based fields) and **ReportFault** (free-form issues)
- **Database Tables**:
  - `tasks` - template assignments to staff
  - `user_tasks` - task instances with templates
  - `user_task_reports` - submitted template field responses
  - `report_faults` - fault/issue reports
  - `report_fault_answers` - fault report comments/responses
