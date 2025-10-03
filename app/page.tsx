/** @format */

"use client";

import { useState, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type Step = "upload" | "animate";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [animationUrl, setAnimationUrl] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [processedGifUrl, setProcessedGifUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  // crop states
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Load FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on("log", ({ message }) => {
          console.log(message);
        });

        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript"
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm"
          ),
        });

        setFfmpegLoaded(true);
        console.log("FFmpeg loaded successfully");
      } catch (err) {
        console.error("Failed to load FFmpeg:", err);
        setError(
          "Failed to load video processing library. Please refresh the page."
        );
      }
    };

    loadFFmpeg();
  }, []);

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createCroppedImage = async () => {
    if (!previewUrl || !croppedAreaPixels) return null;

    const image = new Image();
    image.src = previewUrl;

    return new Promise<File>((resolve) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        ctx?.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], "cropped-image.png", {
              type: "image/png",
            });
            resolve(croppedFile);
          }
        });
      };
    });
  };

  const handleCropConfirm = async () => {
    const croppedFile = await createCroppedImage();
    if (croppedFile) {
      setSelectedImage(croppedFile);
      setPreviewUrl(URL.createObjectURL(croppedFile));
      setShowCropper(false);
      setCurrentStep("animate");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowCropper(true);
      setError("");
      setAnimationUrl("");
      setProcessedGifUrl("");
    }
  };

  const handleAnimate = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("animationType", "dance");

    // try {
    //   const response = await fetch("/api/animate", {
    //     method: "POST",
    //     body: formData,
    //   });

    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.error || "Animation generation failed");
    //   }

    //   const data = await response.json();
    //   setAnimationUrl(data.animationUrl);
    // } catch (err) {
    //   setError(
    //     err instanceof Error ? err.message : "Failed to generate animation"
    //   );
    // } finally {
    //   setLoading(false);
    // }
    try {
      // For testing - use file from public folder
      setAnimationUrl("/video.gif");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate animation"
      );
    } finally {
      setLoading(false);
    }
  };

  const processGifWithOverlay = async () => {
    if (!ffmpegRef.current || !ffmpegLoaded || !animationUrl) {
      console.log("FFmpeg not ready:", { ffmpegLoaded, animationUrl });
      return;
    }

    if (!userName) {
      setProcessedGifUrl("");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const ffmpeg = ffmpegRef.current;

      console.log("Starting video processing...");

      // Write the input GIF to FFmpeg's virtual file system
      const gifData = await fetchFile(animationUrl);
      await ffmpeg.writeFile("input.gif", gifData);
      console.log("Input GIF written to FFmpeg");

      // Convert GIF to MP4
      console.log("Converting GIF to MP4...");
      await ffmpeg.exec([
        "-i",
        "input.gif",
        "-t",
        "8",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-movflags",
        "+faststart",
        "-y",
        "output.mp4",
      ]);

      console.log("Video conversion complete, reading output...");

      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      console.log("Now processing canvas overlay...");

      // Create canvas overlay
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Canvas context failed");

      // Setup MediaRecorder to capture canvas
      const stream = canvas.captureStream(25);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8",
        videoBitsPerSecond: 2500000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: "video/webm" });
        const finalUrl = URL.createObjectURL(finalBlob);
        setProcessedGifUrl(finalUrl);
        setIsProcessing(false);
        console.log("Final video with overlay created");
      };

      // Start recording
      mediaRecorder.start();
      video.play();

      const drawFrame = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop();
          return;
        }

        // Draw background color
        ctx.fillStyle = "#FF0000"; // Change this to any color you want
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw text overlay
        ctx.font = "bold 24px Arial";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const textX = canvas.width / 2;
        const textY = canvas.height - 20;

        ctx.strokeText(userName, textX, textY);
        ctx.fillText(userName, textX, textY);

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
    } catch (err) {
      console.error("Error processing video:", err);
      setError(
        `Failed to process video: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setIsProcessing(false);
    }
  };

  // Trigger processing when animation URL or username changes
  useEffect(() => {
    if (animationUrl && ffmpegLoaded && userName) {
      processGifWithOverlay();
    } else if (animationUrl && !userName) {
      // Clear processed video if username is removed
      setProcessedGifUrl("");
    }
  }, [animationUrl, userName, ffmpegLoaded]);

  // Display the GIF on canvas (for preview)
  useEffect(() => {
    if (!processedGifUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gifImg = new Image();
    gifImg.crossOrigin = "anonymous";
    gifImg.src = processedGifUrl;

    gifImg.onload = () => {
      canvas.width = gifImg.naturalWidth || 500;
      canvas.height = gifImg.naturalHeight || 500;
      ctx.drawImage(gifImg, 0, 0);
    };
  }, [processedGifUrl]);

  const downloadGif = () => {
    if (!processedGifUrl && !animationUrl) return;

    const link = document.createElement("a");
    if (processedGifUrl && userName) {
      link.download = `animated-${userName || "character"}.webm`;
      link.href = processedGifUrl;
    } else {
      link.download = `animated-${userName || "character"}.gif`;
      link.href = animationUrl;
    }
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-100 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col">
            <h1 className="text-4xl font-bold text-blue-900 mb-6 text-center">
              {currentStep === "upload" ? "UPLOAD A DRAWING" : "ADD ANIMATION"}
            </h1>

            {currentStep === "animate" && (
              <>
                <p className="text-gray-700 mb-6 text-center">
                  Click the button below to animate your character!
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Enter Name (optional)
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Character name..."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none"
                  />
                </div>
              </>
            )}

            <div className="flex-1 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 min-h-[500px] relative overflow-hidden">
              {showCropper && previewUrl ? (
                <div className="absolute inset-0">
                  <Cropper
                    image={previewUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
              ) : currentStep === "animate" && animationUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {isProcessing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-50 z-10">
                      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
                      <p className="text-white font-semibold text-lg">
                        Processing Video...
                      </p>
                    </div>
                  )}
                  {userName && processedGifUrl ? (
                    <video
                      src={processedGifUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <img
                      src={animationUrl}
                      alt="Animated GIF"
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <p className="text-xl mb-2">No image uploaded</p>
                  <p className="text-sm">Upload an image to get started</p>
                </div>
              )}
            </div>

            {showCropper && previewUrl && (
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <label className="text-sm font-semibold mb-2 block">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowCropper(false);
                      setPreviewUrl("");
                      setSelectedImage(null);
                    }}
                    className="flex-1 border-2 border-gray-300 py-2 rounded-lg font-semibold hover:border-blue-900 transition">
                    Cancel
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    className="flex-1 bg-blue-900 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition">
                    Crop & Continue
                  </button>
                </div>
              </div>
            )}

            {currentStep === "animate" && !showCropper && !animationUrl && (
              <button
                onClick={handleAnimate}
                disabled={loading || !ffmpegLoaded}
                className={`bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition mb-4 ${
                  loading || !ffmpegLoaded
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}>
                {!ffmpegLoaded
                  ? "Loading..."
                  : loading
                  ? "Generating Animation..."
                  : "🎬 Animate"}
              </button>
            )}

            {!showCropper && currentStep === "upload" && !previewUrl && (
              <label className="bg-blue-900 text-white py-4 rounded-xl font-semibold text-center cursor-pointer hover:bg-blue-800 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                📷 Upload Photo
              </label>
            )}

            {currentStep === "animate" && !showCropper && (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCurrentStep("upload");
                    setSelectedImage(null);
                    setPreviewUrl("");
                    setAnimationUrl("");
                    setProcessedGifUrl("");
                    setUserName("");
                  }}
                  className="flex-1 bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition">
                  Start Over
                </button>
                {processedGifUrl && userName && (
                  <button
                    onClick={downloadGif}
                    className="flex-1 bg-blue-400 text-white py-4 rounded-xl font-semibold hover:bg-blue-500 transition text-center">
                    Download Video
                  </button>
                )}
                {!userName && animationUrl && (
                  <button
                    onClick={downloadGif}
                    className="flex-1 bg-blue-400 text-white py-4 rounded-xl font-semibold hover:bg-blue-500 transition text-center">
                    Download GIF
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
