// 管理员模块专用类型定义
import type { QuotaLog } from '@/types'

export interface AdminDashboardStats {
  users: {
    total: number
    active: number
    inactive: number
    admins: number
  }
  tempEmails: {
    total: number
    active: number
    inactive: number
  }
  emails: {
    total: number
    today: number
    thisWeek: number
    thisMonth: number
  }
  domains: {
    total: number
    active: number
    inactive: number
  }
  redeemCodes: {
    total: number
    used: number
    unused: number
    expired: number
  }
  quotaDistribution: {
    totalQuota: number
    usedQuota: number
    averageQuotaPerUser: number
  }
  quotaActivity: {
    totalEarned: number
    totalConsumed: number
    todayEarned: number
    todayConsumed: number
  }
  checkinActivity: {
    totalCheckins: number
    uniqueUsers: number
    todayCheckins: number
    weekCheckins: number
  }
  recentActivity: {
    todayRegistrations: number
    weekRegistrations: number
    todayActiveUsers: number
    weekActiveUsers: number
  }
  systemHealth: SystemHealth
}

export interface AdminUserDetails extends User {
  tempEmailCount: number
  emailCount: number
  lastLoginAt?: string
  registrationIp?: string
}

export interface AdminEmailDetails extends Email {
  tempEmailAddress: string
  userEmail: string
  domainName: string
}

export interface AdminLogDetails extends OperationLog {
  userEmail?: string
}

export interface AdminRedeemCodeDetails extends RedeemCode {
  usedByEmail?: string
}

export interface QuotaLogWithUser extends QuotaLog {
  user_email: string
}

// 批量操作类型
export interface BatchUserOperation {
  userIds: number[]
  operation: 'activate' | 'deactivate' | 'delete' | 'adjustQuota'
  quotaAdjustment?: number
}

export interface BatchEmailOperation {
  emailIds: number[]
  operation: 'delete' | 'markRead' | 'markUnread'
}

export interface BatchRedeemCodeCreate {
  quota: number
  validUntil: string
  count: number
  prefix?: string
}

// 导出数据类型
export interface ExportUserData {
  id: number
  email: string
  role: string
  quota: number
  isActive: boolean
  tempEmailCount: number
  emailCount: number
  createdAt: string
  lastLoginAt?: string
}

export interface ExportEmailData {
  id: number
  tempEmailAddress: string
  userEmail: string
  sender: string
  subject: string
  receivedAt: string
  isRead: boolean
  hasVerificationCode: boolean
}

export interface ExportLogData {
  id: number
  userEmail?: string
  action: string
  ipAddress?: string
  userAgent?: string
  details?: string
  timestamp: string
}

// 统计查询参数
export interface AdminStatsParams {
  startDate?: string
  endDate?: string
  groupBy?: 'day' | 'week' | 'month'
}

// 系统监控类型
export interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    connectionCount?: number
  }
  storage: {
    totalEmails: number
    totalSize: number
    avgEmailSize: number
  }
  performance: {
    avgResponseTime: number
    requestsPerMinute: number
    errorRate: number
  }
  rateLimits: {
    activeRateLimits: number
    blockedRequests: number
  }
}

import type { 
  User, 
  Email, 
  OperationLog, 
  RedeemCode,
  PaginationParams,
  PaginatedResponse 
} from '@/types'
