import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, doc, deleteDoc, updateDoc, getDocs, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Student } from '../types';
import { COLLECTIONS } from '../constants';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    });

    return () => unsubscribe();
  }, []);

  const addStudent = async (studentData: Omit<Student, 'id' | 'photoURL'>, photoBase64: string) => {
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
      throw error;
    }
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    try {
      const docRef = doc(db, COLLECTIONS.STUDENTS, id);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error("Error updating student:", error);
      throw error;
    }
  };

  const deleteStudent = async (id: string, photoURL: string) => {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, COLLECTIONS.STUDENTS, id));
      
      // Delete from Storage
      if (photoURL) {
        try {
          // Extract path from URL - this is a simple approach, might need refinement based on exact URL format
          const storageRef = ref(storage, photoURL);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.error("Error deleting photo from storage:", storageErr);
          // Continue even if storage delete fails
        }
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      throw error;
    }
  };

  return { students, loading, addStudent, updateStudent, deleteStudent };
}
