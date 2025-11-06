/**
 * Import Job Tracker
 *
 * Manages import job state and progress updates for Server-Sent Events (SSE)
 */

import { type Response } from 'express';
import crypto from 'crypto';

export interface ImportProgress {
  stage: 'fetching' | 'processing' | 'analyzing' | 'complete' | 'error';
  message: string;
  currentCard?: number;
  totalCards?: number;
  imported?: number;
  updated?: number;
  skipped?: number;
  percentage?: number;
}

export interface ImportJob {
  id: string;
  game: string;
  setCode: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: ImportProgress;
  result?: {
    setId: number;
    imported: number;
    updated: number;
    variations: number;
    skipped: number;
  };
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  sseClients: Set<Response>;
}

class ImportJobTracker {
  private jobs: Map<string, ImportJob> = new Map();
  private readonly MAX_JOB_AGE_MS = 1000 * 60 * 60; // 1 hour

  /**
   * Create a new import job
   */
  createJob(game: string, setCode: string): string {
    const jobId = crypto.randomUUID();

    const job: ImportJob = {
      id: jobId,
      game,
      setCode,
      status: 'pending',
      progress: {
        stage: 'fetching',
        message: 'Initializing import...',
        percentage: 0
      },
      createdAt: new Date(),
      sseClients: new Set()
    };

    this.jobs.set(jobId, job);
    this.cleanupOldJobs();

    return jobId;
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): ImportJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Register an SSE client for a job
   */
  registerSSEClient(jobId: string, res: Response): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.sseClients.add(res);
    return true;
  }

  /**
   * Unregister an SSE client
   */
  unregisterSSEClient(jobId: string, res: Response): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.sseClients.delete(res);
    }
  }

  /**
   * Update job progress and notify all SSE clients
   */
  updateProgress(jobId: string, progress: ImportProgress): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.warn(`Attempted to update non-existent job: ${jobId}`);
      return;
    }

    // Calculate percentage based on stage and current progress
    let percentage = progress.percentage;
    if (!percentage && progress.currentCard && progress.totalCards) {
      const stageWeight = {
        fetching: 0.2,
        processing: 0.7,
        analyzing: 0.1,
        complete: 1.0,
        error: 1.0
      };

      const baseProgress = stageWeight[progress.stage] || 0;
      const cardProgress = (progress.currentCard / progress.totalCards) * (stageWeight[progress.stage] || 0);

      // For fetching stage, only use stage progress
      if (progress.stage === 'fetching') {
        percentage = Math.round(baseProgress * 100);
      } else if (progress.stage === 'processing') {
        percentage = Math.round((0.2 + cardProgress) * 100); // 20% + up to 70%
      } else if (progress.stage === 'analyzing') {
        percentage = Math.round((0.9 + (progress.stage === 'analyzing' ? 0.05 : 0)) * 100); // 90-95%
      } else {
        percentage = Math.round(baseProgress * 100);
      }
    } else if (!percentage) {
      percentage = 0;
    }

    job.progress = { ...progress, percentage };
    job.status = progress.stage === 'error' ? 'failed' :
                 progress.stage === 'complete' ? 'completed' : 'running';

    // Send progress update to all connected SSE clients
    this.broadcastToClients(job);
  }

  /**
   * Mark job as completed with results
   */
  completeJob(jobId: string, result: ImportJob['result']): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date();
    job.progress = {
      stage: 'complete',
      message: 'Import completed successfully',
      percentage: 100,
      imported: result?.imported,
      updated: result?.updated,
      skipped: result?.skipped
    };

    this.broadcastToClients(job);

    // Close all SSE connections after a short delay
    setTimeout(() => {
      this.closeSSEClients(jobId);
    }, 1000);
  }

  /**
   * Mark job as failed
   */
  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'failed';
    job.error = error;
    job.completedAt = new Date();
    job.progress = {
      stage: 'error',
      message: error,
      percentage: 0
    };

    this.broadcastToClients(job);

    // Close all SSE connections after a short delay
    setTimeout(() => {
      this.closeSSEClients(jobId);
    }, 1000);
  }

  /**
   * Broadcast progress update to all SSE clients
   */
  private broadcastToClients(job: ImportJob): void {
    const data = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error
    };

    const sseMessage = `data: ${JSON.stringify(data)}\n\n`;

    // Send to all connected clients
    for (const client of job.sseClients) {
      try {
        client.write(sseMessage);
      } catch (error) {
        console.error('Failed to send SSE message:', error);
        job.sseClients.delete(client);
      }
    }
  }

  /**
   * Close all SSE connections for a job
   */
  private closeSSEClients(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    for (const client of job.sseClients) {
      try {
        client.end();
      } catch (error) {
        console.error('Failed to close SSE connection:', error);
      }
    }

    job.sseClients.clear();
  }

  /**
   * Clean up jobs older than MAX_JOB_AGE_MS
   */
  private cleanupOldJobs(): void {
    const now = Date.now();

    for (const [jobId, job] of this.jobs.entries()) {
      const age = now - job.createdAt.getTime();

      if (age > this.MAX_JOB_AGE_MS) {
        // Close any remaining SSE connections
        this.closeSSEClients(jobId);
        this.jobs.delete(jobId);
        console.log(`🧹 Cleaned up old import job: ${jobId}`);
      }
    }
  }

  /**
   * Get all jobs (for debugging)
   */
  getAllJobs(): ImportJob[] {
    return Array.from(this.jobs.values());
  }
}

// Singleton instance
export const importJobTracker = new ImportJobTracker();
