import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, doc, deleteDoc, updateDoc, getDocs, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from '../firebase';
import { Student } from '../types';
import { COLLECTIONS } from '../constants';
import { useNotifications } from './useNotifications';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // Local Storage Fallback
      const localData = localStorage.getItem(COLLECTIONS.STUDENTS);
      if (localData) {
        setStudents(JSON.parse(localData));
      }
      setLoading(false);
      
      // Listen for local storage changes from other tabs
      const handleStorageChange = () => {
        const updatedData = localStorage.getItem(COLLECTIONS.STUDENTS);
        if (updatedData) setStudents(JSON.parse(updatedData));
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }

    const q = query(collection(db, COLLECTIONS.STUDENTS));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      setLoading(false);
      addNotification({
        title: 'System Error',
        message: `Failed to fetch students: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    });

    return () => unsubscribe();
  }, []);

  const addStudent = async (studentData: Omit<Student, 'id' | 'photoURL'>, photoBase64: string) => {
    if (!isFirebaseConfigured()) {
      // Local Storage Fallback
      const currentStudents = JSON.parse(localStorage.getItem(COLLECTIONS.STUDENTS) || '[]');
      if (currentStudents.some((s: Student) => s.studentId === studentData.studentId)) {
        throw new Error('Student ID already exists');
      }
      
      const newStudent: Student = {
        ...studentData,
        id: Math.random().toString(36).substring(2, 9),
        photoURL: photoBase64 // Store base64 directly in local storage for demo
      };
      
      const updatedStudents = [...currentStudents, newStudent];
      localStorage.setItem(COLLECTIONS.STUDENTS, JSON.stringify(updatedStudents));
      setStudents(updatedStudents);
      window.dispatchEvent(new Event('storage'));
      return newStudent.id;
    }

    try {
      // Check for duplicate student ID
      const q = query(collection(db, COLLECTIONS.STUDENTS), where('studentId', '==', studentData.studentId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error('Student ID already exists');
      }

      // Upload photo to storage
      const storageRef = ref(storage, `students/${studentData.studentId}_${Date.now()}.jpg`);
      await uploadString(storageRef, photoBase64, 'data_url');
      const photoURL = await getDownloadURL(storageRef);

      // Add to Firestore
      const docRef = await addDoc(collection(db, COLLECTIONS.STUDENTS), {
        ...studentData,
        photoURL,
      });

      return docRef.id;
    } catch (error) {
      console.error("Error adding student:", error);
      addNotification({
        title: 'System Error',
        message: `Failed to add student: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
      throw error;
    }
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    if (!isFirebaseConfigured()) {
      const currentStudents = JSON.parse(localStorage.getItem(COLLECTIONS.STUDENTS) || '[]');
      const updatedStudents = currentStudents.map((s: Student) => s.id === id ? { ...s, ...data } : s);
      localStorage.setItem(COLLECTIONS.STUDENTS, JSON.stringify(updatedStudents));
      setStudents(updatedStudents);
      window.dispatchEvent(new Event('storage'));
      return;
    }

    try {
      const docRef = doc(db, COLLECTIONS.STUDENTS, id);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error("Error updating student:", error);
      addNotification({
        title: 'System Error',
        message: `Failed to update student: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
      throw error;
    }
  };

  const deleteStudent = async (id: string, photoURL: string) => {
    if (!isFirebaseConfigured()) {
      const currentStudents = JSON.parse(localStorage.getItem(COLLECTIONS.STUDENTS) || '[]');
      const updatedStudents = currentStudents.filter((s: Student) => s.id !== id);
      localStorage.setItem(COLLECTIONS.STUDENTS, JSON.stringify(updatedStudents));
      setStudents(updatedStudents);
      window.dispatchEvent(new Event('storage'));
      return;
    }

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, COLLECTIONS.STUDENTS, id));
      
      // Delete from Storage
      if (photoURL && photoURL.startsWith('http')) {
        try {
          const storageRef = ref(storage, photoURL);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.error("Error deleting photo from storage:", storageErr);
        }
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      addNotification({
        title: 'System Error',
        message: `Failed to delete student: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
      throw error;
    }
  };

  return { students, loading, addStudent, updateStudent, deleteStudent };
}
