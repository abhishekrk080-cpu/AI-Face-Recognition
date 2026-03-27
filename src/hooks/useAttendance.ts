import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AttendanceRecord } from '../types';
import { COLLECTIONS } from '../constants';
import { format } from 'date-fns';

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
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
