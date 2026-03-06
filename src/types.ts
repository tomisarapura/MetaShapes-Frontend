export interface JobResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url: string | null;
}