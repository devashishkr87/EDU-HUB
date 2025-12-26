
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  SCHOLAR = 'SCHOLAR',
  REP = 'REP'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface AcademicMaterial {
  id: string;
  title: string;
  description: string;
  subject: string;
  uploaderId: string;
  uploaderName: string;
  fileUrl: string;
  fileName: string;
  timestamp: number;
  type: 'PDF' | 'ASSIGNMENT' | 'SYLLABUS';
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface StudyPlanItem {
  dayNumber?: number;
  weekNumber: number;
  topic: string;
  objective: string;
  isRevision: boolean;
  intensity: 'Low' | 'Medium' | 'High';
  isExamPrep: boolean;
}
