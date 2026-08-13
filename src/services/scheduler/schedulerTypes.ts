export interface ReminderJobData {
  userId: string;
  channelId: string;
  content: string;
  createdAt: string;
  dmRetryCount?: number;
}

export interface ReminderInfo {
  index: number;
  content: string;
  scheduledAt: Date | null;
  createdAt: string;
  jobId: unknown;
}

export interface CancelReminderResult {
  success: boolean;
  message: string;
  content?: string;
}

export interface ParsedTimeResult {
  time: string;
  task: string;
}
