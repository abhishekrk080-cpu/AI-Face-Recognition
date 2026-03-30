const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Cloud Function to check for 3 consecutive absences when an attendance record is created or updated
exports.checkConsecutiveAbsences = functions.firestore
  .document('attendance/{docId}')
  .onWrite(async (change, context) => {
    const newData = change.after.exists ? change.after.data() : null;
    
    // If deleted or not marked absent, do nothing
    if (!newData || newData.status !== 'Absent') {
      return null;
    }

    const studentId = newData.studentId;
    const studentName = newData.studentName;
    const targetDate = newData.date;

    // Calculate the dates for the last 3 days
    const dateObj = new Date(targetDate);
    const dates = [
      targetDate,
      new Date(dateObj.setDate(dateObj.getDate() - 1)).toISOString().split('T')[0],
      new Date(dateObj.setDate(dateObj.getDate() - 1)).toISOString().split('T')[0]
    ];

    let isAbsentForThreeDays = true;

    for (const d of dates) {
      const q = db.collection('attendance')
        .where('studentId', '==', studentId)
        .where('date', '==', d);
      
      const snapshot = await q.get();
      
      if (snapshot.empty) {
        isAbsentForThreeDays = false;
        break;
      }
      
      const record = snapshot.docs[0].data();
      if (record.status !== 'Absent') {
        isAbsentForThreeDays = false;
        break;
      }
    }

    if (isAbsentForThreeDays) {
      // Create a notification
      await db.collection('notifications').add({
        title: 'Consecutive Absences Alert',
        message: `${studentName} has been marked absent for 3 consecutive days.`,
        type: 'alert',
        studentId: studentId,
        read: false,
        createdAt: Date.now()
      });
      console.log(`Notification created for ${studentName} (3 consecutive absences)`);
    }

    return null;
  });

// Example Cloud Function to log system errors and create notifications
// This could be triggered by an HTTP request from the client when an error occurs
exports.logSystemError = functions.https.onCall(async (data, context) => {
  const { message, source } = data;
  
  await db.collection('notifications').add({
    title: 'System Error',
    message: `Error in ${source}: ${message}`,
    type: 'error',
    read: false,
    createdAt: Date.now()
  });
  
  return { success: true };
});
