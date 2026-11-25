import mongoose, { Schema, Document, Model } from 'mongoose';

// -----------------------------------------------------------------------------
// EMPLOYEE TASKS & GOALS
// -----------------------------------------------------------------------------

export interface IEmployeeTask extends Document {
  organizationId: string;
  employeeId: string;
  title: string;
  description: string;
  assignedDate: Date;
  dueDate?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  assignedByEmployeeId?: string;
  assignedByName: string;
  assignedByRole?: string;
  progressNotes?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeTaskSchema = new Schema<IEmployeeTask>(
  {
    organizationId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    assignedDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PENDING',
      index: true,
    },
    assignedByEmployeeId: { type: String },
    assignedByName: { type: String, default: 'Self / Management' },
    assignedByRole: { type: String },
    progressNotes: { type: String, default: '' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

EmployeeTaskSchema.index({ organizationId: 1, employeeId: 1, status: 1 });

export const EmployeeTask: Model<IEmployeeTask> =
  mongoose.models.EmployeeTask ||
  mongoose.model<IEmployeeTask>('EmployeeTask', EmployeeTaskSchema);

// -----------------------------------------------------------------------------
// COMPANY & BRANCH ANNOUNCEMENTS
// -----------------------------------------------------------------------------

export interface ICompanyAnnouncement extends Document {
  organizationId: string;
  title: string;
  description: string;
  category: 'COMPANY' | 'BRANCH' | 'DEPARTMENT' | 'HOLIDAY' | 'POLICY' | 'REMINDER';
  audienceType: 'ALL' | 'BRANCH' | 'DEPARTMENT' | 'ROLE';
  targetBranchIds: string[];
  targetDepartmentIds: string[];
  targetRoles: string[];
  isPinned: boolean;
  publishedAt: Date;
  expiresAt?: Date;
  createdByUserId: string;
  createdByName: string;
  readByUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CompanyAnnouncementSchema = new Schema<ICompanyAnnouncement>(
  {
    organizationId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['COMPANY', 'BRANCH', 'DEPARTMENT', 'HOLIDAY', 'POLICY', 'REMINDER'],
      default: 'COMPANY',
    },
    audienceType: {
      type: String,
      enum: ['ALL', 'BRANCH', 'DEPARTMENT', 'ROLE'],
      default: 'ALL',
    },
    targetBranchIds: [{ type: String }],
    targetDepartmentIds: [{ type: String }],
    targetRoles: [{ type: String }],
    isPinned: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date },
    createdByUserId: { type: String, required: true },
    createdByName: { type: String, default: 'Administration' },
    readByUserIds: [{ type: String }],
  },
  { timestamps: true }
);

export const CompanyAnnouncement: Model<ICompanyAnnouncement> =
  mongoose.models.CompanyAnnouncement ||
  mongoose.model<ICompanyAnnouncement>('CompanyAnnouncement', CompanyAnnouncementSchema);

// -----------------------------------------------------------------------------
// PERSONAL EMPLOYEE DOCUMENTS
// -----------------------------------------------------------------------------

export interface IEmployeeDocumentRecord extends Document {
  organizationId: string;
  employeeId: string;
  title: string;
  category: 'APPOINTMENT_LETTER' | 'EMPLOYMENT' | 'ID_PROOF' | 'TAX' | 'POLICY' | 'OTHER';
  fileName: string;
  mimeType: string;
  size: number;
  data?: Buffer;
  externalUrl?: string;
  uploadedByUserId: string;
  uploadedByName: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeDocumentRecordSchema = new Schema<IEmployeeDocumentRecord>(
  {
    organizationId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['APPOINTMENT_LETTER', 'EMPLOYMENT', 'ID_PROOF', 'TAX', 'POLICY', 'OTHER'],
      default: 'EMPLOYMENT',
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, default: 'application/pdf' },
    size: { type: Number, default: 0 },
    data: { type: Buffer },
    externalUrl: { type: String },
    uploadedByUserId: { type: String, required: true },
    uploadedByName: { type: String, default: 'Employee' },
    notes: { type: String },
  },
  { timestamps: true }
);

EmployeeDocumentRecordSchema.index({ organizationId: 1, employeeId: 1, createdAt: -1 });

export const EmployeeDocumentRecord: Model<IEmployeeDocumentRecord> =
  mongoose.models.EmployeeDocumentRecord ||
  mongoose.model<IEmployeeDocumentRecord>('EmployeeDocumentRecord', EmployeeDocumentRecordSchema);

// -----------------------------------------------------------------------------
// EMPLOYEE HELP & SUPPORT REQUESTS
// -----------------------------------------------------------------------------

export interface IEmployeeSupportTicket extends Document {
  organizationId: string;
  employeeId: string;
  userId: string;
  subject: string;
  category: 'HR_QUERY' | 'ATTENDANCE_ISSUE' | 'PAYROLL_QUERY' | 'IT_SUPPORT' | 'LEAVE_QUERY' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSupportTicketSchema = new Schema<IEmployeeSupportTicket>(
  {
    organizationId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['HR_QUERY', 'ATTENDANCE_ISSUE', 'PAYROLL_QUERY', 'IT_SUPPORT', 'LEAVE_QUERY', 'OTHER'],
      default: 'HR_QUERY',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    resolutionNotes: { type: String },
  },
  { timestamps: true }
);

EmployeeSupportTicketSchema.index({ organizationId: 1, employeeId: 1, createdAt: -1 });

export const EmployeeSupportTicket: Model<IEmployeeSupportTicket> =
  mongoose.models.EmployeeSupportTicket ||
  mongoose.model<IEmployeeSupportTicket>('EmployeeSupportTicket', EmployeeSupportTicketSchema);

// -----------------------------------------------------------------------------
// RICH NOTIFICATION METADATA (ATTACHED TO POSTGRESQL NOTIFICATIONS)
// -----------------------------------------------------------------------------

export type NotificationCategory =
  | 'ATTENDANCE'
  | 'LEAVE'
  | 'TASK'
  | 'ANNOUNCEMENT'
  | 'SUPPORT'
  | 'SHIFT'
  | 'SECURITY'
  | 'ORDER'
  | 'INVENTORY'
  | 'FINANCE'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface INotificationMeta extends Document {
  notificationId: string;
  organizationId: string;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actorName?: string;
  actorRole?: string;
  actionLabel?: string;
  details?: Record<string, string | number | boolean>;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationMetaSchema = new Schema<INotificationMeta>(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    organizationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ['ATTENDANCE', 'LEAVE', 'TASK', 'ANNOUNCEMENT', 'SUPPORT', 'SHIFT', 'SECURITY', 'ORDER', 'INVENTORY', 'FINANCE', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
    },
    actorName: { type: String },
    actorRole: { type: String },
    actionLabel: { type: String },
    details: { type: Schema.Types.Mixed },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true }
);

export const NotificationMeta: Model<INotificationMeta> =
  mongoose.models.NotificationMeta ||
  mongoose.model<INotificationMeta>('NotificationMeta', NotificationMetaSchema);
