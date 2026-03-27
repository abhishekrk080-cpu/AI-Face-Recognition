import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AttendanceRecord } from '../types';
import { COLLECTIONS } from '../constants';
import { format } from 'date-fns';

// Helper to check if Firebase is configured
const isFirebaseConfigured = () => {
  return db.app.options.apiKey !== "YOUR_API_KEY" && db.app.options.apiKey !== undefined;
};

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // Local Storage Fallback
      const localData = localStorage.getItem(COLLECTIONS.ATTENDANCE);
      if (localData) {
        const parsed = JSON.parse(localData);
        // Sort by timestamp desc
        parsed.sort((a: AttendanceRecord, b: AttendanceRecord) => b.timestamp - a.timestamp);
        setRecords(parsed);
      }
      setLoading(false);
      
      const handleStorageChange = () => {
        const updatedData = localStorage.getItem(COLLECTIONS.ATTENDANCE);
        if (updatedData) {
          const parsed = JSON.parse(updatedData);
          parsed.sort((a: AttendanceRecord, b: AttendanceRecord) => b.timestamp - a.timestamp);
          setRecords(parsed);
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }

    const q = query(collection(db, COLLECTIONS.ATTENDANCE), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      setRecords(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching attendance:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAttendance = async (
    studentId: string, 
    studentName: string, 
    course: string, 
    confidence: number, 
    method: AttendanceRecord['method']
  ) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (!isFirebaseConfigured()) {
      // Local Storage Fallback
      const currentRecords = JSON.parse(localStorage.getItem(COLLECTIONS.ATTENDANCE) || '[]');
      
      // Check if already marked today
      if (currentRecords.some((r: AttendanceRecord) => r.studentId === studentId && r.date === today)) {
        return { success: false, message: 'Already marked present today' };
      }

      const newRecord: AttendanceRecord = {
        id: Math.random().toString(36).substring(2, 9),
        studentId,
        studentName,
        course,
        date: today,
        time: format(new Date(), 'HH:mm:ss'),
        status: 'Present',
        confidence,
        method,
        timestamp: Date.now()
      };

      const updatedRecords = [newRecord, ...currentRecords];
      localStorage.setItem(COLLECTIONS.ATTENDANCE, JSON.stringify(updatedRecords));
      setRecords(updatedRecords);
      window.dispatchEvent(new Event('storage'));
      return { success: true, message: 'Marked present' };
    }

    try {
      // Check if already marked today
      const q = query(
        collection(db, COLLECTIONS.ATTENDANCE), 
        where('studentId', '==', studentId),
        where('date', '==', today)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { success: false, message: 'Already marked present today' };
      }

      const record: Omit<AttendanceRecord, 'id'> = {
        studentId,
        studentName,
        course,
        date: today,
        time: format(new Date(), 'HH:mm:ss'),
        status: 'Present',
        confidence,
        method,
        timestamp: Date.now()
      };

      await addDoc(collection(db, COLLECTIONS.ATTENDANCE), record);
      return { success: true, message: 'Marked present' };
    } catch (error) {
      console.error("Error marking attendance:", error);
      throw error;
    }
  };

  return { records, loading, markAttendance };
}
