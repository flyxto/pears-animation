/** @format */

"use client";

import { useState, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";

type Step = "upload" | "animate";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [animationUrl, setAnimationUrl] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // crop states
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);

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
    }
  };

  const handleAnimate = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("animationType", "dance");

    try {
      const response = await fetch("/api/animate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Animation generation failed");
      }

      const data = await response.json();
      setAnimationUrl(data.animationUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate animation"
      );
    } finally {
      setLoading(false);
    }
  };

  // Draw the animated GIF with logo and name on canvas
  useEffect(() => {
    if (!animationUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gifImg = new Image();
    gifImg.crossOrigin = "anonymous";
    gifImg.src = animationUrl;

    const logoImg = new Image();
    logoImg.src = "/images/logo.png";

    let imagesLoaded = 0;
    const totalImages = 2;

    const checkImagesLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        startAnimation();
      }
    };

    gifImg.onload = checkImagesLoaded;
    logoImg.onload = checkImagesLoaded;

    const startAnimation = () => {
      const draw = () => {
        if (!ctx || !canvas) return;

        canvas.width = gifImg.width || 500;
        canvas.height = gifImg.height || 500;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(gifImg, 0, 0, canvas.width, canvas.height);

        if (logoImg.complete) {
          const logoWidth = 80;
          const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
          const logoPadding = 15;
          ctx.drawImage(
            logoImg,
            canvas.width - logoWidth - logoPadding,
            logoPadding,
            logoWidth,
            logoHeight
          );
        }

        if (userName) {
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
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    };

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationUrl, userName]);

  const downloadCanvas = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `animated-${userName || "character"}.png`;
    link.href = canvasRef.current.toDataURL();
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
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full object-contain"
                />
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
                disabled={loading}
                className={`bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition mb-4 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}>
                {loading ? "Generating Animation..." : "🎬 Animate"}
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
                    setUserName("");
                  }}
                  className="flex-1 bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition">
                  Start Over
                </button>
                {animationUrl && (
                  <button
                    onClick={downloadCanvas}
                    className="flex-1 bg-blue-400 text-white py-4 rounded-xl font-semibold hover:bg-blue-500 transition text-center">
                    Download
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
