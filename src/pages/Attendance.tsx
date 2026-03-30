import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useStudents } from '../hooks/useStudents';
import { useAttendance } from '../hooks/useAttendance';
import { useToast } from '../components/Toast';
import { Camera, RefreshCw, Users, CheckCircle, AlertCircle, XCircle, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function Attendance() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isLoaded, detectAllFaces, faceapi } = useFaceDetection();
  const { students, loading: studentsLoading } = useStudents();
  const { records, markAttendance, deleteAttendance, editAttendance } = useAttendance();
  const { toast } = useToast();

  const [isStreaming, setIsStreaming] = useState(false);
  const [markedToday, setMarkedToday] = useState<Set<string>>(new Set());
  const markedTodayRef = useRef<Set<string>>(new Set());
  
  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState<typeof students[0] | null>(null);
  const [editStatus, setEditStatus] = useState<'Present' | 'Absent'>('Present');
  const [editMethod, setEditMethod] = useState<'Face Recognition' | 'Manual Override'>('Manual Override');

  const [cameraError, setCameraError] = useState<string | null>(null);
  const isInitializingRef = useRef(false);

  // Initialize markedToday from existing records
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = records.filter(r => r.date === today && r.status === 'Present');
    const newSet = new Set(todayRecords.map(r => r.studentId));
    setMarkedToday(newSet);
    markedTodayRef.current = newSet;
  }, [records]);

  // Create FaceMatcher
  const faceMatcher = useMemo(() => {
    if (!students.length || !isLoaded) return null;
    
    const labeledDescriptors = students.map(student => {
      // Convert standard array back to Float32Array
      const descriptor = new Float32Array(student.faceDescriptor);
      return new faceapi.LabeledFaceDescriptors(student.studentId, [descriptor]);
    });
    
    // 0.5 threshold for strict matching
    return new faceapi.FaceMatcher(labeledDescriptors, 0.5);
  }, [students, isLoaded, faceapi]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let message = "Camera not available or in use by another application.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Camera permission denied. Please allow camera access in your browser settings and try again.";
        setCameraError('permission');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "No camera found on this device.";
        setCameraError('not-found');
      } else {
        setCameraError('other');
      }
      toast(message, "error");
      setIsStreaming(false);
    } finally {
      isInitializingRef.current = false;
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreaming(false);
    }
  };

  // Detection loop
  useEffect(() => {
    if (!isStreaming || !isLoaded || !faceMatcher || !videoRef.current || !canvasRef.current) return;

    let intervalId: NodeJS.Timeout;
    
    const runDetection = async () => {
      if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
        const detections = await detectAllFaces(videoRef.current);
        if (!videoRef.current || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        
        if (displaySize.width > 0) {
          faceapi.matchDimensions(canvas, displaySize);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);

          for (const detection of resizedDetections) {
            const match = faceMatcher.findBestMatch(detection.descriptor);
            const box = detection.detection.box;
            
            const isUnknown = match.label === 'unknown';
            const studentId = match.label;
            const student = students.find(s => s.studentId === studentId);
            const isAlreadyMarked = markedToday.has(studentId);
            
            // Draw box
            if (ctx) {
              ctx.lineWidth = 3;
              ctx.shadowBlur = 15;
              
              if (isUnknown) {
                ctx.strokeStyle = '#EF4444'; // Red
                ctx.shadowColor = '#EF4444';
              } else if (isAlreadyMarked) {
                ctx.strokeStyle = '#F59E0B'; // Amber
                ctx.shadowColor = '#F59E0B';
              } else {
                ctx.strokeStyle = '#10B981'; // Green
                ctx.shadowColor = '#10B981';
              }
              
              ctx.strokeRect(box.x, box.y, box.width, box.height);
              
              // Draw label background
              ctx.fillStyle = ctx.strokeStyle;
              ctx.shadowBlur = 0;
              const textWidth = ctx.measureText(isUnknown ? 'Unknown' : `${student?.name} (${Math.round((1 - match.distance) * 100)}%)`).width;
              ctx.fillRect(box.x, box.y - 30, textWidth + 20, 30);
              
              // Draw text
              ctx.fillStyle = '#FFFFFF';
              ctx.font = '16px Inter, sans-serif';
              ctx.fillText(
                isUnknown ? 'Unknown' : `${student?.name} (${Math.round((1 - match.distance) * 100)}%)`, 
                box.x + 10, 
                box.y - 10
              );
            }

            // Mark attendance
            if (!isUnknown && student && !isAlreadyMarked) {
              // Add to local set immediately to prevent spam
              const newSet = new Set(markedTodayRef.current);
              newSet.add(studentId);
              markedTodayRef.current = newSet;
              setMarkedToday(newSet);
              
              try {
                const res = await markAttendance(
                  studentId,
                  student.name,
                  student.course,
                  1 - match.distance, // Convert distance to confidence
                  'Face Recognition'
                );
                
                if (res.success) {
                  toast(`${student.name} marked present!`, 'success');
                } else {
                  if (res.message !== 'Already marked present today') {
                    const revertedSet = new Set(markedTodayRef.current);
                    revertedSet.delete(studentId);
                    markedTodayRef.current = revertedSet;
                    setMarkedToday(revertedSet);
                  }
                }
              } catch (err) {
                // Revert local state on failure
                const revertedSet = new Set(markedTodayRef.current);
                revertedSet.delete(studentId);
                markedTodayRef.current = revertedSet;
                setMarkedToday(revertedSet);
                toast(`Failed to mark ${student.name}`, 'error');
              }
            }
          }
        }
      }
    };

    // Run every 300ms
    intervalId = setInterval(runDetection, 300);
    return () => clearInterval(intervalId);
  }, [isStreaming, isLoaded, faceMatcher, students, markAttendance, toast, faceapi, detectAllFaces]);

  const handleManualOverride = async (student: typeof students[0]) => {
    if (markedTodayRef.current.has(student.studentId)) {
      toast(`${student.name} is already marked present today`, 'warning');
      return;
    }
    
    const newSet = new Set(markedTodayRef.current);
    newSet.add(student.studentId);
    markedTodayRef.current = newSet;
    setMarkedToday(newSet);
    
    try {
      const res = await markAttendance(
        student.studentId,
        student.name,
        student.course,
        1.0,
        'Manual Override'
      );
      if (res.success) {
        toast(`${student.name} manually marked present`, 'success');
      } else {
        if (res.message !== 'Already marked present today') {
          const revertedSet = new Set(markedTodayRef.current);
          revertedSet.delete(student.studentId);
          markedTodayRef.current = revertedSet;
          setMarkedToday(revertedSet);
        }
      }
    } catch (err) {
      const revertedSet = new Set(markedTodayRef.current);
      revertedSet.delete(student.studentId);
      markedTodayRef.current = revertedSet;
      setMarkedToday(revertedSet);
      toast(`Failed to mark ${student.name}`, 'error');
    }
  };

  const handleDeleteAttendance = async (e: React.MouseEvent, student: typeof students[0]) => {
    e.stopPropagation(); // Prevent triggering manual override
    
    if (!markedTodayRef.current.has(student.studentId)) {
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete the attendance record for ${student.name}?`)) {
      return;
    }
    
    // Optimistically remove from markedToday
    const newSet = new Set(markedTodayRef.current);
    newSet.delete(student.studentId);
    markedTodayRef.current = newSet;
    setMarkedToday(newSet);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await deleteAttendance(student.studentId, today);
      
      if (res.success) {
        toast(`${student.name}'s attendance deleted`, 'success');
      } else {
        // Revert on failure
        const revertedSet = new Set(markedTodayRef.current);
        revertedSet.add(student.studentId);
        markedTodayRef.current = revertedSet;
        setMarkedToday(revertedSet);
        toast(`Failed to delete attendance: ${res.message}`, 'error');
      }
    } catch (err) {
      // Revert on failure
      const revertedSet = new Set(markedTodayRef.current);
      revertedSet.add(student.studentId);
      markedTodayRef.current = revertedSet;
      setMarkedToday(revertedSet);
      toast(`Failed to delete attendance for ${student.name}`, 'error');
    }
  };

  const handleEditClick = (e: React.MouseEvent, student: typeof students[0]) => {
    e.stopPropagation();
    const today = format(new Date(), 'yyyy-MM-dd');
    const record = records.find(r => r.studentId === student.studentId && r.date === today);
    
    if (record) {
      setEditStatus(record.status as 'Present' | 'Absent');
      setEditMethod(record.method as 'Face Recognition' | 'Manual Override');
    } else {
      setEditStatus('Present');
      setEditMethod('Manual Override');
    }
    setEditingStudent(student);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const isCurrentlyPresent = markedTodayRef.current.has(editingStudent.studentId);
    
    try {
      if (editStatus === 'Absent' && isCurrentlyPresent) {
        // If changing to Absent, update the record
        await editAttendance(editingStudent.studentId, today, { status: 'Absent', method: editMethod });
        const newSet = new Set(markedTodayRef.current);
        newSet.delete(editingStudent.studentId);
        markedTodayRef.current = newSet;
        setMarkedToday(newSet);
        toast(`Attendance for ${editingStudent.name} changed to Absent`, 'success');
      } else if (editStatus === 'Absent' && !isCurrentlyPresent) {
        // If marking absent and not currently present
        await markAttendance(
          editingStudent.studentId,
          editingStudent.name,
          editingStudent.course,
          1.0,
          editMethod,
          'Absent'
        );
        toast(`Attendance for ${editingStudent.name} marked as Absent`, 'success');
      } else if (editStatus === 'Present' && !isCurrentlyPresent) {
        // If changing to Present from Absent, create a new record
        await markAttendance(
          editingStudent.studentId,
          editingStudent.name,
          editingStudent.course,
          1.0,
          editMethod,
          'Present'
        );
        const newSet = new Set(markedTodayRef.current);
        newSet.add(editingStudent.studentId);
        markedTodayRef.current = newSet;
        setMarkedToday(newSet);
        toast(`Attendance for ${editingStudent.name} changed to Present`, 'success');
      } else if (editStatus === 'Present' && isCurrentlyPresent) {
         // If already present, just update the method
         await editAttendance(editingStudent.studentId, today, { method: editMethod });
         toast(`Attendance method for ${editingStudent.name} updated`, 'success');
      }
      
      setEditingStudent(null);
    } catch (err) {
      toast(`Failed to update attendance for ${editingStudent.name}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Live Attendance</h2>
          <p className="text-text-secondary">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
        </div>
        <div className="glass-card px-6 py-3 flex items-center gap-4 border-primary-500/30 w-full sm:w-auto">
          <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Present Today</p>
            <p className="text-2xl font-bold text-white">{markedToday.size} <span className="text-sm font-normal text-text-secondary">/ {students.length}</span></p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera Section */}
        <div className="lg:col-span-2 glass-card p-2 overflow-hidden relative aspect-video rounded-2xl bg-black/50 border-white/10 flex items-center justify-center">
          {(!isLoaded || studentsLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark/80 z-20 backdrop-blur-sm">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-4" />
              <p className="text-text-secondary font-medium">
                {studentsLoading ? 'Loading Students...' : 'Loading AI Models...'}
              </p>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className={cn("w-full h-full object-cover rounded-xl", !isStreaming && "opacity-0")}
            onPlay={() => setIsStreaming(true)}
          />
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          />
          
          {!isStreaming && isLoaded && !studentsLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary p-6 text-center">
              {cameraError === 'permission' ? (
                <>
                  <XCircle className="w-12 h-12 mb-4 text-red-500" />
                  <p className="text-white font-medium mb-2">Camera Permission Denied</p>
                  <p className="text-sm max-w-xs">Please allow camera access in your browser settings, then click retry below.</p>
                  <button onClick={startCamera} className="mt-6 btn-primary text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Retry Camera
                  </button>
                </>
              ) : (
                <>
                  <Camera className="w-12 h-12 mb-4 opacity-50" />
                  <p>Camera is off</p>
                  <button onClick={startCamera} className="mt-4 btn-secondary text-sm">Start Camera</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Manual Override / Status Section */}
        <div className="glass-card p-6 flex flex-col min-h-[400px] lg:h-[500px]">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Manual Override
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            Click a student to manually mark them as present if face recognition fails.
          </p>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {students.length === 0 ? (
              <div className="text-center text-text-secondary mt-10">
                No students registered yet.
              </div>
            ) : (
              students.map(student => {
                const isPresent = markedToday.has(student.studentId);
                return (
                  <div
                    key={student.id}
                    onClick={() => !isPresent && handleManualOverride(student)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                      isPresent 
                        ? "bg-emerald-500/10 border-emerald-500/20" 
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={student.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} 
                        alt={student.name} 
                        className="w-10 h-10 rounded-full object-cover bg-surface"
                      />
                      <div>
                        <p className="font-medium text-white text-sm">{student.name}</p>
                        <p className="text-xs text-text-secondary">{student.studentId}</p>
                      </div>
                    </div>
                    {isPresent ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => handleEditClick(e, student)}
                          className="p-1.5 rounded-full hover:bg-primary-500/20 text-text-secondary hover:text-primary-400 transition-colors"
                          title="Edit Attendance"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteAttendance(e, student)}
                          className="p-1.5 rounded-full hover:bg-red-500/20 text-emerald-400 hover:text-red-400 transition-colors"
                          title="Delete Attendance"
                        >
                          <CheckCircle className="w-5 h-5 group-hover:hidden" />
                          <Trash2 className="w-5 h-5 hidden group-hover:block" />
                        </button>
                      </div>
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 opacity-50" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-white">Edit Attendance</h3>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <img 
                src={editingStudent.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${editingStudent.name}`} 
                alt={editingStudent.name} 
                className="w-12 h-12 rounded-full object-cover bg-surface"
              />
              <div>
                <p className="font-medium text-white">{editingStudent.name}</p>
                <p className="text-sm text-text-secondary">{editingStudent.studentId}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                <select 
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'Present' | 'Absent')}
                  className="w-full bg-bg-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Method</label>
                <select 
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as 'Face Recognition' | 'Manual Override')}
                  className="w-full bg-bg-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="Face Recognition">Face Recognition</option>
                  <option value="Manual Override">Manual Override</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="btn-primary py-2 px-6"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
