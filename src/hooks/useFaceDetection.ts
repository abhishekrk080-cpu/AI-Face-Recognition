import { useState, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { useNotifications } from './useNotifications';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

export function useFaceDetection() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      try {
        // Load models sequentially to track progress
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        if (!mounted) return;
        setLoadingProgress(33);
        
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        if (!mounted) return;
        setLoadingProgress(66);
        
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        if (!mounted) return;
        setLoadingProgress(100);
        
        setIsLoaded(true);
      } catch (err) {
        console.error("Error loading face-api models:", err);
        if (mounted) setError("Failed to load AI models. Please check your internet connection.");
        addNotification({
          title: 'System Error',
          message: 'Failed to load face detection models. Please check your internet connection and reload.',
          type: 'error'
        });
      }
    };
    loadModels();
    return () => { mounted = false; };
  }, []);

  const detectFace = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!isLoaded) return null;
    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      return detection || null;
    } catch (err) {
      console.error("Face detection error:", err);
      return null;
    }
  }, [isLoaded]);

  const detectAllFaces = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!isLoaded) return [];
    try {
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      return detections;
    } catch (err) {
      console.error("Face detection error:", err);
      return [];
    }
  }, [isLoaded]);

  return { isLoaded, loadingProgress, error, detectFace, detectAllFaces, faceapi };
}
