import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, limit } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { COLLECTIONS } from '../constants';
import { Notification } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // Local storage fallback
      const handleStorage = () => {
        const localData = localStorage.getItem(COLLECTIONS.NOTIFICATIONS);
        if (localData) {
          const parsed = JSON.parse(localData) as Notification[];
          parsed.sort((a, b) => b.createdAt - a.createdAt);
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        }
      };
      
      handleStorage();
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }

    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      let unread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as Notification;
        notifs.push({ ...data, id: doc.id });
        if (!data.read) unread++;
      });
      setNotifications(notifs);
      setUnreadCount(unread);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    if (!isFirebaseConfigured()) {
      const localData = localStorage.getItem(COLLECTIONS.NOTIFICATIONS);
      if (localData) {
        const parsed = JSON.parse(localData) as Notification[];
        const updated = parsed.map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem(COLLECTIONS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }
      return;
    }

    try {
      await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!isFirebaseConfigured()) {
      const localData = localStorage.getItem(COLLECTIONS.NOTIFICATIONS);
      if (localData) {
        const parsed = JSON.parse(localData) as Notification[];
        const updated = parsed.map(n => ({ ...n, read: true }));
        localStorage.setItem(COLLECTIONS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }
      return;
    }

    try {
      const unreadNotifs = notifications.filter(n => !n.read && n.id);
      const updatePromises = unreadNotifs.map(n => 
        updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, n.id!), { read: true })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotif = {
      ...notification,
      read: false,
      createdAt: Date.now()
    };

    if (!isFirebaseConfigured()) {
      const localData = localStorage.getItem(COLLECTIONS.NOTIFICATIONS);
      const parsed = localData ? JSON.parse(localData) as Notification[] : [];
      const notifWithId = { ...newNotif, id: Date.now().toString() };
      localStorage.setItem(COLLECTIONS.NOTIFICATIONS, JSON.stringify([notifWithId, ...parsed]));
      window.dispatchEvent(new Event('storage'));
      return;
    }

    try {
      await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), newNotif);
    } catch (error) {
      console.error("Error adding notification:", error);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, addNotification };
}
