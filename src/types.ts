export interface Student {
  id: string; // Firestore document ID
  name: string;
  studentId: string;
  email: string;
  course: string;
  semester: string;
  faceDescriptor: number[]; // Stored as standard array in Firestore
  registeredAt: number; // Timestamp
  photoURL: string;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentName: string;
  course: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: 'Present' | 'Absent';
  confidence: number;
  method: 'Face Recognition' | 'Auto (Registration)' | 'Manual Override';
  timestamp: number;
}

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'error';
  read: boolean;
  createdAt: number;
  studentId?: string;
}
