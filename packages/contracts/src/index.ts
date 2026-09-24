export enum RoleCode {
  OPERATOR = 'operator',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  CANCELLING = 'cancelling',
  CANCELLED = 'cancelled',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  TIMED_OUT = 'timed_out',
}

export enum AssetStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export enum ExperimentStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  roles: RoleCode[];
  shopIds: string[];
}

export interface MetricInput {
  impressions: number;
  clicks: number;
  visitors: number;
  bouncedVisitors: number;
  paidOrders: number;
  unitsSold: number;
  gmv: number;
  adSpend: number;
}

export interface CalculatedMetrics {
  ctr: number | null;
  cvr: number | null;
  bounceRate: number | null;
  roi: number | null;
}

export const TASK_QUEUE = 'media-generation';
