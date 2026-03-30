import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { AttendanceRecord } from '../types';
import { COLLECTIONS } from '../constants';
import { format, subDays } from 'date-fns';
import { useNotifications } from './useNotifications';

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

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
    method: AttendanceRecord['method'],
    status: 'Present' | 'Absent' = 'Present'
  ) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (!isFirebaseConfigured()) {
      // Local Storage Fallback
      const currentRecords = JSON.parse(localStorage.getItem(COLLECTIONS.ATTENDANCE) || '[]');
      
      // Check if already marked today
      const existingRecordIndex = currentRecords.findIndex((r: AttendanceRecord) => r.studentId === studentId && r.date === today);
      
      if (existingRecordIndex !== -1) {
        if (currentRecords[existingRecordIndex].status === status) {
          return { success: false, message: `Already marked ${status.toLowerCase()} today` };
        } else {
          // Update existing absent record to present
          currentRecords[existingRecordIndex] = {
            ...currentRecords[existingRecordIndex],
            status,
            method,
            confidence,
            time: format(new Date(), 'HH:mm:ss'),
            timestamp: Date.now()
          };
          localStorage.setItem(COLLECTIONS.ATTENDANCE, JSON.stringify(currentRecords));
          setRecords(currentRecords);
          window.dispatchEvent(new Event('storage'));
          
          if (status === 'Absent') {
            checkConsecutiveAbsences(studentId, studentName, today);
          }
          
          return { success: true, message: `Marked ${status.toLowerCase()}` };
        }
      }

      const newRecord: AttendanceRecord = {
        id: Math.random().toString(36).substring(2, 9),
        studentId,
        studentName,
        course,
        date: today,
        time: format(new Date(), 'HH:mm:ss'),
        status,
        confidence,
        method,
        timestamp: Date.now()
      };

      const updatedRecords = [newRecord, ...currentRecords];
      localStorage.setItem(COLLECTIONS.ATTENDANCE, JSON.stringify(updatedRecords));
      setRecords(updatedRecords);
      window.dispatchEvent(new Event('storage'));
      
      if (status === 'Absent') {
        checkConsecutiveAbsences(studentId, studentName, today);
      }
      
      return { success: true, message: `Marked ${status.toLowerCase()}` };
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
        const existingDoc = querySnapshot.docs[0];
        if (existingDoc.data().status === status) {
          return { success: false, message: `Already marked ${status.toLowerCase()} today` };
        } else {
          // Update existing absent record to present
          await updateDoc(doc(db, COLLECTIONS.ATTENDANCE, existingDoc.id), {
            status,
            method,
            confidence,
            time: format(new Date(), 'HH:mm:ss'),
            timestamp: Date.now()
          });
          
          if (status === 'Absent') {
            checkConsecutiveAbsences(studentId, studentName, today);
          }
          
          return { success: true, message: `Marked ${status.toLowerCase()}` };
        }
      }

      const record: Omit<AttendanceRecord, 'id'> = {
        studentId,
        studentName,
        course,
        date: today,
        time: format(new Date(), 'HH:mm:ss'),
        status,
        confidence,
        method,
        timestamp: Date.now()
      };

      await addDoc(collection(db, COLLECTIONS.ATTENDANCE), record);
      
      if (status === 'Absent') {
        checkConsecutiveAbsences(studentId, studentName, today);
      }
      
      return { success: true, message: `Marked ${status.toLowerCase()}` };
    } catch (error) {
      console.error("Error marking attendance:", error);
      addNotification({
        title: 'System Error',
        message: `Failed to mark attendance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
      throw error;
    }
  };

  const deleteAttendance = async (studentId: string, date: string) => {
    if (!isFirebaseConfigured()) {
      // Local Storage Fallback
      const currentRecords = JSON.parse(localStorage.getItem(COLLECTIONS.ATTENDANCE) || '[]');
      const updatedRecords = currentRecords.filter((r: AttendanceRecord) => !(r.studentId === studentId && r.date === date));
      
      localStorage.setItem(COLLECTIONS.ATTENDANCE, JSON.stringify(updatedRecords));
      setRecords(updatedRecords);
      window.dispatchEvent(new Event('storage'));
      return { success: true, message: 'Attendance deleted' };
    }

    try {
      const q = query(
        collection(db, COLLECTIONS.ATTENDANCE), 
        where('studentId', '==', studentId),
        where('date', '==', date)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { success: false, message: 'Record not found' };
      }

      // Delete all matching records (should usually be just one)
      const deletePromises = querySnapshot.docs.map(document => 
        deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, document.id))
      );
      
      await Promise.all(deletePromises);
      return { success: true, message: 'Attendance deleted' };
    } catch (error) {
      console.error("Error deleting attendance:", error);
      throw error;
    }
  };

  const checkConsecutiveAbsences = async (studentId: string, studentName: string, targetDate: string) => {
    try {
      // Get the dates for the last 3 days ending on targetDate
      const dateObj = new Date(targetDate);
      const dates = [
        targetDate,
        format(subDays(dateObj, 1), 'yyyy-MM-dd'),
        format(subDays(dateObj, 2), 'yyyy-MM-dd')
      ];

      let isAbsentForThreeDays = true;

      if (!isFirebaseConfigured()) {
        const currentRecords = JSON.parse(localStorage.getItem(COLLECTIONS.ATTENDANCE) || '[]');
        for (const d of dates) {
          const record = currentRecords.find((r: AttendanceRecord) => r.studentId === studentId && r.date === d);
          if (!record || record.status !== 'Absent') {
            isAbsentForThreeDays = false;
            break;
          }
        }
      } else {
        for (const d of dates) {
          const q = query(
            collection(db, COLLECTIONS.ATTENDANCE),
            where('studentId', '==', studentId),
            where('date', '==', d)
          );
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            isAbsentForThreeDays = false;
            break;
          }
          const record = snapshot.docs[0].data() as AttendanceRecord;
          if (record.status !== 'Absent') {
            isAbsentForThreeDays = false;
            break;
          }
        }
      }

      if (isAbsentForThreeDays) {
        // Check if we already notified recently to avoid spam
        // For simplicity, we just add the notification. In a real app, we'd check existing notifications.
        await addNotification({
          title: 'Consecutive Absences Alert',
          message: `${studentName} has been marked absent for 3 consecutive days.`,
          type: 'alert',
          studentId
        });
      }
    } catch (error) {
      console.error("Error checking consecutive absences:", error);
    }
  };

  const editAttendance = async (
    studentId: string, 
    date: string, 
    updates: Partial<AttendanceRecord>
  ) => {
    let studentName = '';
    if (!isFirebaseConfigured()) {
      // Local Storage Fallback
      const currentRecords = JSON.parse(localStorage.getItem(COLLECTIONS.ATTENDANCE) || '[]');
      const updatedRecords = currentRecords.map((r: AttendanceRecord) => {
        if (r.studentId === studentId && r.date === date) {
          studentName = r.studentName;
          return { ...r, ...updates };
        }
        return r;
      });
      
      localStorage.setItem(COLLECTIONS.ATTENDANCE, JSON.stringify(updatedRecords));
      setRecords(updatedRecords);
      window.dispatchEvent(new Event('storage'));
      
      if (updates.status === 'Absent' && studentName) {
        checkConsecutiveAbsences(studentId, studentName, date);
      }
      
      return { success: true, message: 'Attendance updated' };
    }

    try {
      const q = query(
        collection(db, COLLECTIONS.ATTENDANCE), 
        where('studentId', '==', studentId),
        where('date', '==', date)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { success: false, message: 'Record not found' };
      }

      // Update all matching records (should usually be just one)
      const updatePromises = querySnapshot.docs.map(document => {
        studentName = document.data().studentName;
        return updateDoc(doc(db, COLLECTIONS.ATTENDANCE, document.id), updates);
      });
      
      await Promise.all(updatePromises);
      
      if (updates.status === 'Absent' && studentName) {
        checkConsecutiveAbsences(studentId, studentName, date);
      }
      
      return { success: true, message: 'Attendance updated' };
    } catch (error) {
      console.error("Error updating attendance:", error);
      addNotification({
        title: 'System Error',
        message: `Failed to update attendance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
      throw error;
    }
  };

  return { records, loading, markAttendance, deleteAttendance, editAttendance };
}
