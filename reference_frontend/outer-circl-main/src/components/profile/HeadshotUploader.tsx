import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { validateHeadshot } from '@/utils/headshotValidation';
import { compressImage } from '@/utils/imageCompression';
import { supabase } from '@/integrations/supabase/client';

interface HeadshotUploaderProps {
  userId: string;
  existingAvatarUrl?: string | null;
  onUploadComplete: (url: string) => void;
  required?: boolean;
}

const HeadshotUploader: React.FC<HeadshotUploaderProps> = ({
  userId,
  existingAvatarUrl,
  onUploadComplete,
  required = false
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const checkCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { available: false, reason: 'Camera API not supported in this browser' };
      }
      
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (result.state === 'denied') {
          return { available: false, reason: 'Camera permission denied' };
        }
      }
      
      return { available: true, reason: null };
    } catch (error) {
      return { available: true, reason: null };
    }
  };

  const initializeCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          aspectRatio: { ideal: 1.77 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let errorMessage = "Unable to access your camera.";
      
      if (err.name === 'NotAllowedError') {
        errorMessage = "Camera access denied. Please allow camera permissions in your browser settings.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No camera detected. Please use the 'Upload Photo' option instead.";
      } else if (err.name === 'NotReadableError') {
        errorMessage = "Camera is already in use by another app. Please close other apps and try again.";
      } else if (err.name === 'SecurityError') {
        errorMessage = "Camera blocked by security settings. Please use the 'Upload Photo' option instead.";
      }
      
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: errorMessage
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], "headshot.jpg", { type: "image/jpeg" });
            await validateAndProcessFile(file);
          }
        }, 'image/jpeg', 0.95);
      }
      
      stopCamera();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await validateAndProcessFile(file);
  };

  const validateAndProcessFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setValidationMessage(null);
    setIsValid(null);
    
    try {
      // Compress image if larger than 2MB
      let processedFile = file;
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Compressing image...",
          description: "Optimizing your photo for upload.",
        });
        processedFile = await compressImage(file, 2, 1920);
      }
      
      // Validate if file contains a headshot
      const validation = await validateHeadshot(processedFile);
      setValidationMessage(validation.message);
      setIsValid(validation.isValid);
      
      if (!validation.isValid) {
        setIsUploading(false);
        return;
      }
      
      // Create preview
      const objectUrl = URL.createObjectURL(processedFile);
      setPreviewUrl(objectUrl);
      
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      // For new users during registration, use a temporary filename that will be updated after user creation
      const fileName = userId === "new-user" 
        ? `temp_${Date.now()}.${fileExt}`
        : `${userId}_${Date.now()}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, processedFile, {
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      if (publicUrlData) {
        onUploadComplete(publicUrlData.publicUrl);
        toast({
          variant: "default",
          title: "Success!",
          description: "Your headshot has been uploaded successfully.",
        });
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <Avatar className="w-24 h-24 border-2 border-primary">
          <AvatarImage src={previewUrl || undefined} />
          <AvatarFallback className="bg-muted">
            {required ? "Required" : "User"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col gap-2 items-center">
          <p className="text-sm text-center text-muted-foreground">
            {required 
              ? "A clear headshot photo is required for your profile" 
              : "Upload a clear headshot for your profile"}
          </p>
          
          {validationMessage && (
            <Alert variant={isValid ? "default" : "destructive"} className="py-2 mt-2 mb-2">
              <div className="flex items-center gap-2">
                {isValid ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{validationMessage}</AlertDescription>
              </div>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive" className="py-2 mt-2 mb-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {showCamera ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="relative w-full max-w-md">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  className="w-full rounded-md border"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex items-center gap-2 min-h-[44px]">
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
                <Button variant="outline" onClick={stopCamera} className="min-h-[44px]">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
              <Button 
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 min-h-[44px] flex-1"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Photo
              </Button>
              
              <Button 
                variant="outline"
                onClick={initializeCamera}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 min-h-[44px] flex-1"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                capture="user"
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeadshotUploader;