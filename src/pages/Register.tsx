import React, { useState, useRef, useEffect } from 'react';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useStudents } from '../hooks/useStudents';
import { useAttendance } from '../hooks/useAttendance';
import { useToast } from '../components/Toast';
import { Camera, RefreshCw, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';

export function Register() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isLoaded, detectFace, faceapi } = useFaceDetection();
  const { addStudent } = useStudents();
  const { markAttendance } = useAttendance();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    email: '',
    course: '',
    semester: ''
  });
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError') {
        toast("Camera permission denied. Please allow camera access in your browser settings and try again.", "error");
      } else {
        toast("Camera not available or in use by another application.", "error");
      }
      setIsStreaming(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreaming(false);
    }
  };

  // Draw overlay
  useEffect(() => {
    if (!isStreaming || !isLoaded || !videoRef.current || !canvasRef.current) return;

    let animationFrameId: number;
    
    const drawOverlay = async () => {
      if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
        const detection = await detectFace(videoRef.current);
        if (!videoRef.current || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        
        if (displaySize.width > 0) {
          faceapi.matchDimensions(canvas, displaySize);
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);

          if (detection) {
            const resizedDetection = faceapi.resizeResults(detection, displaySize);
            const box = resizedDetection.detection.box;
            
            // Draw custom glowing box
            if (ctx) {
              ctx.strokeStyle = '#10B981';
              ctx.lineWidth = 3;
              ctx.shadowColor = '#10B981';
              ctx.shadowBlur = 15;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
              
              // Draw corners
              const cornerLength = 20;
              ctx.beginPath();
              // Top left
              ctx.moveTo(box.x, box.y + cornerLength);
              ctx.lineTo(box.x, box.y);
              ctx.lineTo(box.x + cornerLength, box.y);
              // Top right
              ctx.moveTo(box.x + box.width - cornerLength, box.y);
              ctx.lineTo(box.x + box.width, box.y);
              ctx.lineTo(box.x + box.width, box.y + cornerLength);
              // Bottom right
              ctx.moveTo(box.x + box.width, box.y + box.height - cornerLength);
              ctx.lineTo(box.x + box.width, box.y + box.height);
              ctx.lineTo(box.x + box.width - cornerLength, box.y + box.height);
              // Bottom left
              ctx.moveTo(box.x + cornerLength, box.y + box.height);
              ctx.lineTo(box.x, box.y + box.height);
              ctx.lineTo(box.x, box.y + box.height - cornerLength);
              ctx.stroke();
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(drawOverlay);
    };

    drawOverlay();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isStreaming, isLoaded, detectFace, faceapi]);

  const captureFace = async () => {
    if (!videoRef.current || !isLoaded) return;
    
    setIsCapturing(true);
    try {
      const detection = await detectFace(videoRef.current);
      if (!videoRef.current) return;
      
      if (!detection) {
        toast("No face detected. Please look directly at the camera.", "warning");
        setIsCapturing(false);
        return;
      }

      // Capture image from video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);

      setCapturedImages([base64Image]); // Just keeping 1 for UI simplicity, but using the descriptor
      setFaceDescriptor(detection.descriptor);
      toast("Face captured successfully!", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to capture face.", "error");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceDescriptor || capturedImages.length === 0) {
      toast("Please capture your face first.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const studentId = await addStudent({
        name: formData.name,
        studentId: formData.studentId,
        email: formData.email,
        course: formData.course,
        semester: formData.semester,
        faceDescriptor: Array.from(faceDescriptor), // Convert Float32Array to standard array for Firestore
        registeredAt: Date.now()
      }, capturedImages[0]);

      toast("Student registered successfully!", "success");
      
      // Reset form
      setFormData({ name: '', studentId: '', email: '', course: '', semester: '' });
      setFaceDescriptor(null);
      setCapturedImages([]);
    } catch (err: any) {
      toast(err.message || "Failed to register student.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Camera Section */}
      <div className="flex flex-col gap-4">
        <div className="glass-card p-1 overflow-hidden relative aspect-video rounded-2xl bg-black/50 border-white/10 flex items-center justify-center">
          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark/80 z-20 backdrop-blur-sm">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-4" />
              <p className="text-text-secondary font-medium">Loading AI Models...</p>
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
          
          {isCapturing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 backdrop-blur-sm rounded-xl">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-4" />
              <p className="text-white font-medium">Processing Face Data...</p>
            </div>
          )}
          
          {!isStreaming && isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary">
              <Camera className="w-12 h-12 mb-4 opacity-50" />
              <p>Camera is off</p>
              <button onClick={startCamera} className="mt-4 btn-secondary text-sm">Start Camera</button>
            </div>
          )}
        </div>

        <div className="flex gap-4 items-center justify-between glass-card p-4">
          <div className="flex gap-2">
            {capturedImages.length > 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle className="w-5 h-5" />
                Face Captured
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400 font-medium">
                <AlertCircle className="w-5 h-5" />
                Face Required
              </div>
            )}
          </div>
          <button 
            type="button"
            onClick={captureFace}
            disabled={!isStreaming || isCapturing || !isLoaded}
            className="btn-primary flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            {isCapturing ? 'Capturing...' : 'Capture Face'}
          </button>
        </div>
      </div>

      {/* Form Section */}
      <div className="glass-card p-6 lg:p-8">
        <h2 className="text-2xl font-semibold mb-6">Student Details</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-text-secondary">Full Name</label>
              <input 
                required
                type="text" 
                className="glass-input w-full" 
                placeholder="John Doe"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Student ID</label>
              <input 
                required
                type="text" 
                className="glass-input w-full" 
                placeholder="CS101"
                value={formData.studentId}
                onChange={e => setFormData({...formData, studentId: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Email</label>
              <input 
                required
                type="email" 
                className="glass-input w-full" 
                placeholder="john@university.edu"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Course</label>
              <input 
                required
                type="text" 
                className="glass-input w-full" 
                placeholder="Computer Science"
                value={formData.course}
                onChange={e => setFormData({...formData, course: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Semester / Year</label>
              <input 
                required
                type="text" 
                className="glass-input w-full" 
                placeholder="Semester 4"
                value={formData.semester}
                onChange={e => setFormData({...formData, semester: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-6">
            <button 
              type="submit" 
              disabled={isSubmitting || !faceDescriptor}
              className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {isSubmitting ? 'Processing & Registering...' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
