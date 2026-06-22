/**
 * useBackgroundJob Hook
 * 
 * React hook for managing background jobs.
 * Provides easy interface for long-running operations.
 */

import { useState, useCallback, useEffect } from 'react';
import { jobQueue, JobStatus, JobPriority } from '@/jobs/JobQueue';
import type { Job } from '@/jobs/JobQueue';

interface UseBackgroundJobResult {
  startJob: (name: string, type: string, data: any, priority?: JobPriority) => Promise<string>;
  cancelJob: (jobId: string) => boolean;
  job: Job | null;
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  progress: number;
  result: any;
  error: string | null;
}

/**
 * Hook for managing a background job
 */
export function useBackgroundJob(jobId?: string): UseBackgroundJobResult {
  const [currentJobId, setCurrentJobId] = useState<string | undefined>(jobId);
  const [job, setJob] = useState<Job | null>(null);

  // Poll for job status updates
  useEffect(() => {
    if (!currentJobId) return;

    const interval = setInterval(() => {
      const updatedJob = jobQueue.getJob(currentJobId);
      if (updatedJob) {
        setJob(updatedJob);
        
        // Stop polling if job is completed/failed/cancelled
        if ([JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED].includes(updatedJob.status)) {
          clearInterval(interval);
        }
      }
    }, 500); // Poll every 500ms

    return () => clearInterval(interval);
  }, [currentJobId]);

  const startJob = useCallback(async (
    name: string,
    type: string,
    data: any,
    priority: JobPriority = JobPriority.MEDIUM
  ): Promise<string> => {
    const jobId = await jobQueue.addJob(name, type, data, priority);
    setCurrentJobId(jobId);
    return jobId;
  }, []);

  const cancelJob = useCallback((jobId: string): boolean => {
    return jobQueue.cancelJob(jobId);
  }, []);

  return {
    startJob,
    cancelJob,
    job,
    isRunning: job?.status === JobStatus.RUNNING,
    isCompleted: job?.status === JobStatus.COMPLETED,
    isFailed: job?.status === JobStatus.FAILED,
    progress: job?.progress || 0,
    result: job?.result,
    error: job?.error || null
  };
}

/**
 * Hook for monitoring all jobs
 */
export function useJobQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const allJobs = jobQueue.getAllJobs();
      setJobs(allJobs);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const pendingJobs = jobs.filter(j => j.status === JobStatus.PENDING);
  const runningJobs = jobs.filter(j => j.status === JobStatus.RUNNING);
  const completedJobs = jobs.filter(j => j.status === JobStatus.COMPLETED);
  const failedJobs = jobs.filter(j => j.status === JobStatus.FAILED);

  return {
    jobs,
    pendingJobs,
    runningJobs,
    completedJobs,
    failedJobs,
    totalJobs: jobs.length,
    activeJobs: pendingJobs.length + runningJobs.length
  };
}

