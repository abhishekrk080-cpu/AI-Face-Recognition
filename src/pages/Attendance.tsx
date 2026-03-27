import { useState, useRef, useEffect, useMemo } from 'react';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useStudents } from '../hooks/useStudents';
import { useAttendance } from '../hooks/useAttendance';
import { useToast } from '../components/Toast';
import { Camera, RefreshCw, Users, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function Attendance() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isLoaded, detectAllFaces, faceapi } = useFaceDetection();
  const { students, loading: studentsLoading } = useStudents();
  const { records, markAttendance } = useAttendance();
  const { toast } = useToast();

  const [isStreaming, setIsStreaming] = useState(false);
  const [markedToday, setMarkedToday] = useState<Set<string>>(new Set());
  const [presentCount, setPresentCount] = useState(0);

  // Initialize markedToday from existing records
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = records.filter(r => r.date === today && r.status === 'Present');
    setMarkedToday(new Set(todayRecords.map(r => r.studentId)));
    setPresentCount(todayRecords.length);
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast("Camera permission denied or not available.", "error");
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
              setMarkedToday(prev => new Set(prev).add(studentId));
              
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
                }
              } catch (err) {
                // Revert local state on failure
                setMarkedToday(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(studentId);
                  return newSet;
                });
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
  }, [isStreaming, isLoaded, faceMatcher, students, markedToday, markAttendance, toast, faceapi, detectAllFaces]);

  const handleManualOverride = async (student: typeof students[0]) => {
    if (markedToday.has(student.studentId)) {
      toast(`${student.name} is already marked present today`, 'warning');
      return;
    }
    
    try {
      await markAttendance(
        student.studentId,
        student.name,
        student.course,
        1.0,
        'Manual Override'
      );
      toast(`${student.name} manually marked present`, 'success');
    } catch (err) {
      toast(`Failed to mark ${student.name}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Live Attendance</h2>
          <p className="text-text-secondary">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
        </div>
        <div className="glass-card px-6 py-3 flex items-center gap-4 border-primary-500/30">
          <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary font-medium">Present Today</p>
            <p className="text-2xl font-bold text-white">{presentCount} <span className="text-sm font-normal text-text-secondary">/ {students.length}</span></p>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary">
              <Camera className="w-12 h-12 mb-4 opacity-50" />
              <p>Camera is off</p>
              <button onClick={startCamera} className="mt-4 btn-secondary text-sm">Start Camera</button>
            </div>
          )}
        </div>

        {/* Manual Override / Status Section */}
        <div className="glass-card p-6 flex flex-col h-[500px]">
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
                  <button
                    key={student.id}
                    onClick={() => handleManualOverride(student)}
                    disabled={isPresent}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                      isPresent 
                        ? "bg-emerald-500/10 border-emerald-500/20 opacity-70 cursor-not-allowed" 
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
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
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 opacity-50" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
