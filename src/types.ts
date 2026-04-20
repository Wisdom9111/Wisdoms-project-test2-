export type Role = 'student' | 'lecturer' | 'admin' | null;

export interface User {
  uid: string;
  email: string;
  role: Role;
  name: string;
  level?: string; // e.g., '300L'
  is_verified?: boolean;
  is_approved?: boolean; // Lecturers require this
  is_suspended?: boolean; // For blocked accounts
  force_logout?: boolean; // For admin kicking
  last_active?: any; // To track online status
  created_at?: any; // To see session they registered on
}

export interface Material {
  id: string;
  courseCode: string;
  courseTitle: string;
  lecturerName: string;
  lecturerUid: string;
  fileUrl: string;
  fileName?: string;
  level: string;
  semester: string;
  createdAt: any;
  keyTopics?: string[];
  overview?: string;
  extractedText?: string;
}

export interface Bulletin {
  id: string;
  content: string;
  targetLevel: string;
  lecturerName: string;
  lecturerUid?: string;
  createdAt: any;
}

export interface QuizQuestion {
  id: string;
  type: 'objective' | 'subjective';
  question: string;
  options?: string[]; // Only for objective
  correctAnswer?: number; // Only for objective (index)
  sampleAnswer?: string; // For subjective grading context
  explanation?: string; // For correct reasoning
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}
