"use client";
import React, { useRef, useState, useEffect } from "react";
import {
  VStack, HStack, Button, Box, Text, Progress, Spinner, useToast, Image as ChakraImage, Input
} from "@chakra-ui/react";
import { Upload, Trash2, Check, Camera, Sparkles } from "lucide-react";
// IMPORT THE SERVER ACTION
import { enhanceScannedText } from "@/app/actions/ai";

declare global {
  interface Window {
    cv: any;
    Tesseract: any;
  }
}

interface DocumentScannerProps {
  onComplete: (extractedText: string) => void;
}

export default function DocumentScanner({ onComplete }: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'ocr' | 'ai'>('idle');
  const [progress, setProgress] = useState(0);
  
  // Camera States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Load OpenCV and Tesseract libraries
    const loadLibraries = async () => {
      if (!window.cv) {
        const script1 = document.createElement("script");
        script1.src = "https://docs.opencv.org/4.5.2/opencv.js";
        script1.async = true;
        script1.onload = () => checkForLibraries();
        document.body.appendChild(script1);
      }

      if (!window.Tesseract) {
        const script2 = document.createElement("script");
        script2.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js";
        script2.async = true;
        script2.onload = () => checkForLibraries();
        document.body.appendChild(script2);
      } else {
        checkForLibraries();
      }
    };

    const checkForLibraries = () => {
      setLibrariesLoaded(true);
    };

    loadLibraries();

    return () => {
      stopCamera();
    };
  }, []);

  // Attach stream to video element
  useEffect(() => {
    if (cameraActive && activeStream && videoRef.current) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.onloadedmetadata = () => {
        setStreamReady(true);
        videoRef.current?.play().catch(e => console.error("Autoplay blocked:", e));
      };
    }
  }, [cameraActive, activeStream]);

  // Start camera stream
  const startCamera = async () => {
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setActiveStream(stream);
      setCameraActive(true);
    } catch (error: any) {
      console.error("Camera error:", error);
      toast({ title: "Camera Failed", description: "Check permissions.", status: "error" });
    }
    setCameraLoading(false);
  };

  const stopCamera = () => {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      setActiveStream(null);
    }
    setCameraActive(false);
    setStreamReady(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/png");
      const processed = await processImageWithOpenCV(imageData);
      setScannedImages([...scannedImages, processed]);
      toast({ title: "Captured!", status: "success", duration: 1000 });
    }
  };

  const processImageWithOpenCV = async (imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!window.cv || !window.cv.Mat) { resolve(imageData); return; }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(imageData); return; }
          
          ctx.drawImage(img, 0, 0);
          
          // Simple grayscale processing
          const src = window.cv.imread(canvas);
          const dst = new window.cv.Mat();
          window.cv.cvtColor(src, dst, window.cv.COLOR_RGBA2GRAY);
          
          // Add thresholding to make text clearer
          window.cv.adaptiveThreshold(dst, dst, 255, window.cv.ADAPTIVE_THRESH_GAUSSIAN_C, window.cv.THRESH_BINARY, 11, 2);
          
          window.cv.imshow(canvas, dst);
          src.delete(); dst.delete();
          resolve(canvas.toDataURL("image/png"));
        } catch (e) { resolve(imageData); }
      };
      img.src = imageData;
    });
  };

  // --- MAIN PROCESSING FUNCTION ---
  const processDocuments = async () => {
    if (!window.Tesseract) return;
    
    // 1. OCR Phase
    setStatus('ocr');
    setProgress(0);

    try {
      const rawTexts: string[] = [];
      
      for (let i = 0; i < scannedImages.length; i++) {
        const res = await window.Tesseract.recognize(scannedImages[i], "eng", {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              const total = ((i + m.progress) / scannedImages.length) * 100;
              setProgress(Math.round(total));
            }
          }
        });
        rawTexts.push(res.data.text);
      }

      const combinedRaw = rawTexts.join("\n");
      
      // 2. AI Enhancement Phase
      setStatus('ai');
      const cleanedText = await enhanceScannedText(combinedRaw);
      
      onComplete(cleanedText);
      setScannedImages([]);
      stopCamera();
      toast({ title: "Success!", description: "Notes digitized & cleaned.", status: "success" });

    } catch (e) {
      console.error(e);
      toast({ title: "Processing Failed", status: "error" });
    }
    setStatus('idle');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setScannedImages([...scannedImages, ev.target.result as string]);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <VStack spacing={6} align="stretch" h="100%" py={6}>
      {!librariesLoaded && (
        <HStack><Spinner size="sm" /><Text fontSize="sm">Loading OCR...</Text></HStack>
      )}

      {/* Controls */}
      <Box>
        <HStack spacing={2}>
          {!cameraActive ? (
            <>
              <Button leftIcon={<Camera size={16} />} onClick={startCamera} colorScheme="blue" isLoading={cameraLoading}>Start Camera</Button>
              <Button leftIcon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()} variant="outline">Upload</Button>
            </>
          ) : (
            <Button onClick={stopCamera} colorScheme="red" size="sm">Stop Camera</Button>
          )}
          <Input type="file" accept="image/*" display="none" ref={fileInputRef} onChange={handleFileUpload} />
        </HStack>
      </Box>

      {/* Camera View */}
      {cameraActive && (
        <Box bg="black" borderRadius="xl" overflow="hidden" position="relative" w="100%" maxH="500px">
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {streamReady && (
            <Box position="absolute" bottom={4} left={0} right={0} display="flex" justifyContent="center">
              <Button onClick={capturePhoto} colorScheme="green" size="lg" rounded="full" w="60px" h="60px" border="4px solid white">
                <Camera size={24} />
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Scanned Images & Action */}
      {scannedImages.length > 0 && (
        <Box>
          <HStack overflowX="auto" spacing={3} pb={4}>
            {scannedImages.map((img, i) => (
              <Box key={i} flexShrink={0} position="relative" w="100px" h="140px" borderRadius="md" overflow="hidden" border="1px solid #E2E8F0">
                <ChakraImage src={img} w="100%" h="100%" objectFit="cover" />
                <Box position="absolute" top={1} right={1} bg="white" borderRadius="full" cursor="pointer" onClick={() => setScannedImages(scannedImages.filter((_, idx) => idx !== i))}>
                  <Trash2 size={14} color="red" style={{ margin: 4 }} />
                </Box>
              </Box>
            ))}
          </HStack>

          {status === 'idle' ? (
            <Button size="lg" w="full" colorScheme="green" onClick={processDocuments} leftIcon={<Sparkles size={20}/>}>
              Enhance & Extract ({scannedImages.length})
            </Button>
          ) : (
            <Box textAlign="center" py={4}>
              <Text mb={2} fontSize="sm" fontWeight="bold">
                {status === 'ocr' ? "Reading Text..." : "✨ AI Enhancing Notes..."}
              </Text>
              <Progress value={status === 'ocr' ? progress : 100} isIndeterminate={status === 'ai'} colorScheme={status === 'ocr' ? "blue" : "purple"} borderRadius="full" />
            </Box>
          )}
        </Box>
      )}

      <Box display="none"><canvas ref={canvasRef} /></Box>
    </VStack>
  );
}
