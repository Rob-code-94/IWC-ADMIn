import { useState, useEffect } from 'react';
import { db } from '@/services/firebase';
import { collectionGroup, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Alert } from '@/components/ui/NotificationBanner';

export const useAdminAlerts = () => {
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [counts, setCounts] = useState({
    messages: 0,
    tasks: 0
  });
  const [unreadClientIds, setUnreadClientIds] = useState<string[]>([]);

  // 1. Task Completion Monitor (Global)
  // Alert when a High Priority task is marked Complete
  useEffect(() => {
    if (!db) return;

    // Listen for recent high priority completions
    const q = query(
      collectionGroup(db, 'tasks'),
      where('priority', '==', 'High'),
      where('status', '==', 'Complete'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          // Only alert if it looks like a recent completion (status changed to complete)
          const task = change.doc.data();
          // Simple debounce/check logic for demo purposes
          if (change.type === 'modified') {
             setActiveAlert({
               id: change.doc.id,
               title: 'High Priority Task Completed',
               message: `Task "${task.title}" has been resolved.`,
               type: 'success'
             });
          }
        }
      });
    }, (error) => {
        // Gracefully handle missing index error
        if (error.code === 'failed-precondition') {
            console.warn("Global Task Monitor requires an index. Please check the console link to create it.");
        } else {
            console.error("Task monitor error:", error);
        }
    });

    return () => unsubscribe();
  }, []);

  // 2. High Priority Task Badge Counter - DISABLED by user request
  // Kept comment for reference but removed active logic to clear notifications
  /*
  useEffect(() => {
    if (!db) return;
    
    const q = query(
        collectionGroup(db, 'tasks'),
        where('priority', '==', 'High')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingHigh = snapshot.docs.filter(d => d.data().status !== 'Complete').length;
      setCounts(prev => ({ ...prev, tasks: pendingHigh }));
    }, (error) => {
        if (error.code === 'failed-precondition') {
            console.warn("Task Badge requires an index.");
        }
    });

    return () => unsubscribe();
  }, []);
  */

  // 3. Unread Message Monitor
  useEffect(() => {
    if (!db) return;
    
    // Listening for unread messages
    const q = query(
      collectionGroup(db, 'support_chat'),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      const clientIds = new Set<string>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Client-side filter for sender to avoid complex composite indexes
        if (data.sender !== 'admin') {
          unreadCount++;
          // Extract client ID from parent path: clients/{clientId}/support_chat/{msgId}
          const parentCollection = doc.ref.parent;
          const clientDoc = parentCollection.parent;
          if (clientDoc) {
              clientIds.add(clientDoc.id);
          }
        }
      });

      setCounts(prev => ({ ...prev, messages: unreadCount }));
      setUnreadClientIds(Array.from(clientIds));

      // Trigger banner for new incoming message
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          if (msg.sender !== 'admin') {
            setActiveAlert({
              id: change.doc.id,
              title: 'New Client Message',
              message: msg.text ? (msg.text.length > 30 ? msg.text.slice(0,30) + '...' : msg.text) : 'Attachment received',
              type: 'info'
            });
          }
        }
      });
    }, (error) => {
        if (error.code === 'failed-precondition') {
            console.warn("Message Monitor requires an index. Please check the console link to create it.");
        }
    });

    return () => unsubscribe();
  }, []);

  return { 
    activeAlert, 
    dismissAlert: () => setActiveAlert(null),
    counts,
    unreadClientIds
  };
};