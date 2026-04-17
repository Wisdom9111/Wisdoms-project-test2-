export type Role = 'student' | 'lecturer' | null;

export interface User {
  uid: string;
  email: string;
  role: Role;
  name: string;
  level?: string; // e.g., '300L'
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
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}
