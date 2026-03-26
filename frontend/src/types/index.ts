export type UserRole = 'admin' | 'instructor' | 'student';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  preferred_language?: string;
  is_active: boolean;
  created_at?: string;
  batches?: { id: string; batch_name: string }[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface OnboardResponse {
  user: User;
  credentials: {
    password: string;
  };
  tokens: AuthTokens;
}

export interface Course {
  id: number;
  title: string;
  description?: string;
  category?: string;
  duration?: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  created_by: number;
  createdAt?: string;
  updatedAt?: string;
}

export type BatchStatus = 'draft' | 'ongoing' | 'completed' | 'inactive';

export interface Batch {
  id: string;
  course_id: number;
  instructor_id?: number;
  created_by: number;
  batch_name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: BatchStatus;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
  course?: {
    id: number;
    title: string;
  };
  instructor?: {
    id: number;
    name: string;
    email: string;
  };
  students?: User[];
  topics?: Topic[];
}

export interface BatchStudent {
  id: string;
  batch_id: string;
  student_id: number;
  enrolled_at: string;
}

export interface ApiError {
  message: string;
}

// Video Module Types
export type VideoStatus = 'pending' | 'ready' | 'failed' | 'cancelled';

export interface Video {
  id: string;
  title: string;
  description?: string;
  mux_asset_id?: string;
  mux_playback_id?: string;
  duration?: number;
  upload_status: VideoStatus; // Changed from status to upload_status
  thumbnail_url?: string;
  uploaded_by: number;
  language?: string;
  visibility?: string;
  is_active?: boolean;
  topic_id?: string;
  createdAt: string;
  updatedAt: string;
  batches?: {
    id: string;
    batch_name: string;
  }[];
  topic?: Topic;
}

export interface VideoUploadResponse {
  message: string;
  video: Video;
  uploadUrl: string;
}

export interface VideoPlaybackResponse {
  playbackUrl: string;
  thumbnailUrl?: string;
}

export type DocumentType = 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'txt' | 'other';

export interface Topic {
  id: number;
  batch_id: string;
  title: string;
  description?: string;
  order_index: number;
  createdAt: string;
  updatedAt: string;
  videos?: Video[];
  documents?: Document[];
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  file_name?: string;
  file_path: string;
  file_size?: number;
  file_type: DocumentType;
  language?: string;
  uploaded_by: number;
  visibility?: string;
  is_active?: boolean;
  batch_id?: string;
  topic_id?: number;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
  batch?: {
    id: string;
    batch_name: string;
  };
  topic?: Topic;
}

export interface DocumentUploadResponse {
  message: string;
  document: Document;
}

// Live Class Module Types
export type LiveClassStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface LiveClass {
  id: number; // Changed from string to number
  batch_id: string;
  instructor_id: number;
  topic: string; // Changed from title
  description?: string;
  start_time: string; // Changed from scheduled_at
  duration: number; // Changed from duration_minutes
  zoom_meeting_id: string;
  zoom_join_url: string;
  zoom_start_url: string;
  status: LiveClassStatus;
  recording_url?: string;
  createdAt: string;
  updatedAt: string;
  batch?: {
    id: string;
    batch_name: string;
  };
  instructor?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface LiveClassSignatureResponse {
  signature: string;
  meetingNumber: string;
  role: number;
  sdkKey: string;
  userName: string;
  userEmail: string;
}

export interface LiveClassJoinResponse {
  joinUrl: string;
  meetingId: string;
  password?: string;
}

// Webinar Module Types
export type WebinarStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Webinar {
  id: string;
  topic: string;
  description?: string;
  start_time: string;
  duration: number;
  instructor_id: number;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  zoom_start_url?: string;
  max_attendees?: number;
  status: WebinarStatus;
  is_public: boolean;
  createdAt: string;
  updatedAt: string;
  instructor?: {
    id: number;
    name: string;
    email: string;
  };
  registrations_count?: number;
}

export interface WebinarRegistration {
  id: string;
  webinar_id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  user_id?: number;
  registered_at: string;
}

export interface WebinarRegisterResponse {
  message: string;
  registration: WebinarRegistration;
}

export interface WebinarJoinResponse {
  joinUrl: string;
  meetingId: string;
  password?: string;
}

// Test Module Types
export type TestStatus = 'draft' | 'published' | 'archived';
export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'FILE_UPLOAD';

export interface Option {
  id: number;
  question_id: number;
  content: string;
  media_url?: string;
  is_correct: boolean;
  order_index: number;
}

export interface Question {
  id: number;
  block_id: number;
  content: string;
  type: QuestionType;
  marks: number;
  order_index: number;
  reference_media_url?: string;
  model_answer?: string;
  options?: Option[];
}

export interface Block {
  id: number;
  test_id: number;
  title: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  order_index: number;
  questions?: Question[];
}

export interface Test {
  id: number;
  title: string;
  description?: string;
  batch_id: string;
  created_by: number;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_results_immediately: boolean;
  block_navigation_allowed: boolean;
  status: TestStatus;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  blocks?: Block[];
  batch?: {
    id: string;
    batch_name: string;
  };
}

// Invoice Module Types
export interface Invoice {
  id: number;
  invoice_number: string;
  user_id: number;
  batch_id: string;
  amount: number;
  gst_rate: number;
  is_gst_inclusive: boolean;
  gst_amount: number;
  total: number;
  payment_method: 'online' | 'offline';
  status: 'pending' | 'paid' | 'cancelled';
  payment_id?: string;
  issued_at: string;
  paid_at?: string;
  notes?: string;
  student?: {
    id: number;
    name: string;
    email: string;
  };
  batch?: {
    id: string;
    batch_name: string;
  };
}
