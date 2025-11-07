import { query } from '../db/client';

export interface Job {
  id: number;
  type: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  retry_count: number;
  max_retries: number;
}

export async function enqueueJob(job: {
  type: string;
  payload: any;
  maxRetries?: number;
}): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO job_queue (type, payload, max_retries)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [job.type, JSON.stringify(job.payload), job.maxRetries || 3]
  );

  return result.rows[0].id;
}

export async function getNextJob(): Promise<Job | null> {
  const result = await query<{
    id: number;
    type: string;
    payload: any;
    status: string;
    error: string | null;
    created_at: Date;
    started_at: Date | null;
    completed_at: Date | null;
    retry_count: number;
    max_retries: number;
  }>(
    `UPDATE job_queue
     SET status = 'processing', started_at = NOW()
     WHERE id = (
       SELECT id FROM job_queue
       WHERE status = 'pending'
       AND retry_count < max_retries
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    status: row.status as Job['status'],
    error: row.error || undefined,
    created_at: row.created_at,
    started_at: row.started_at || undefined,
    completed_at: row.completed_at || undefined,
    retry_count: row.retry_count,
    max_retries: row.max_retries,
  };
}

export async function completeJob(jobId: number): Promise<void> {
  await query(
    `UPDATE job_queue
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1`,
    [jobId]
  );
}

export async function failJob(jobId: number, error: string): Promise<void> {
  await query(
    `UPDATE job_queue
     SET status = 'failed', error = $2, completed_at = NOW()
     WHERE id = $1`,
    [jobId, error]
  );
}

export async function retryJob(jobId: number, error: string): Promise<void> {
  await query(
    `UPDATE job_queue
     SET status = 'pending', error = $2, retry_count = retry_count + 1
     WHERE id = $1`,
    [jobId, error]
  );
}

export async function getJobStatus(jobId: number): Promise<Job | null> {
  const result = await query<{
    id: number;
    type: string;
    payload: any;
    status: string;
    error: string | null;
    created_at: Date;
    started_at: Date | null;
    completed_at: Date | null;
    retry_count: number;
    max_retries: number;
  }>(
    'SELECT * FROM job_queue WHERE id = $1',
    [jobId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    status: row.status as Job['status'],
    error: row.error || undefined,
    created_at: row.created_at,
    started_at: row.started_at || undefined,
    completed_at: row.completed_at || undefined,
    retry_count: row.retry_count,
    max_retries: row.max_retries,
  };
}

