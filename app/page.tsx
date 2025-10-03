'use client'

import { useState, useRef } from 'react'
import Script from 'next/script'
import type { Point, Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [animationUrl, setAnimationUrl] = useState<string>('')
  
  // Canvas customization states
  const [userName, setUserName] = useState('')
  const [fileCode, setFileCode] = useState('')
  const [giflerLoaded, setGiflerLoaded] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('')

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Hardcoded image paths (place your images in public folder)
  const BACKGROUND_IMAGE = '/background.png'
  const OVERLAY_IMAGE = '/overlay.png'

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError('')
      setAnimationUrl('')
      setProcessedVideoUrl('')
      setShowCropper(true);
    }
  }

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
    }
  };

  const handleAnimate = async () => {
    if (!selectedImage) return
    
    if (!userName.trim()) {
      alert('Please enter your name')
      return
    }

    if (!fileCode.trim()) {
      alert('Please enter a file code')
      return
    }
    
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('image', selectedImage)

    try {
      const response = await fetch('/api/animate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Animation generation failed')
      }

      const data = await response.json()
      setAnimationUrl(data.animationUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate animation')
    } finally {
      setLoading(false)
    }
  }

  const processWithCanvas = async () => {
    if (!animationUrl || !giflerLoaded) {
      alert('Animation not ready or library not loaded')
      return
    }

    setProcessing(true)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Load hardcoded overlay image
    const overlayImg = document.createElement('img')
    overlayImg.src = OVERLAY_IMAGE
    await new Promise((resolve) => {
      overlayImg.onload = resolve
      overlayImg.onerror = () => {
        console.warn('Overlay image not found, continuing without it')
        resolve(null)
      }
    })

    // Load hardcoded background image
    const backgroundImg = document.createElement('img')
    backgroundImg.src = BACKGROUND_IMAGE
    await new Promise((resolve) => {
      backgroundImg.onload = resolve
      backgroundImg.onerror = () => {
        console.warn('Background image not found, continuing without it')
        resolve(null)
      }
    })

    // Start recording
    const stream = canvas.captureStream(30)
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      setProcessedVideoUrl(URL.createObjectURL(blob))
      setProcessing(false)
    }

    mediaRecorder.start()

    const startTime = Date.now()
    const recordDuration = 10000 // 10 seconds

    // @ts-ignore - gifler is loaded via CDN
    window.gifler(animationUrl).frames(canvas, (ctx: CanvasRenderingContext2D, frame: any) => {
      canvas.width = frame.width
      canvas.height = frame.height

      // Draw background image (if loaded)
      if (backgroundImg.complete && backgroundImg.naturalWidth > 0) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)
      } else {
        // Fallback to white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Draw GIF frame
      ctx.drawImage(frame.buffer, 0, 0)

      // Draw overlay image (if loaded)
      if (overlayImg.complete && overlayImg.naturalWidth > 0) {
        ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height)
      }

      // Draw text: "Hi I'm {userName}"
      ctx.font = 'bold 80px Arial'
      ctx.fillStyle = '#4E56C0'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Hi I'm ${userName}`, canvas.width / 2, canvas.height - 120)

      // Stop after duration
      if (Date.now() - startTime >= recordDuration) {
        mediaRecorder.stop()
      }
    })
  }

  const handleDownload = async () => {
    const urlToDownload = processedVideoUrl || animationUrl
    if (!urlToDownload) return
    
    try {
      const response = await fetch(urlToDownload)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Use fileCode as filename for processed video, or default name for GIF
      const fileName = processedVideoUrl 
        ? `${fileCode || 'animated-video'}.webm` 
        : `animation-${Date.now()}.gif`
      
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to download')
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setPreviewUrl('')
    setAnimationUrl('')
    setProcessedVideoUrl('')
    setError('')
    setUserName('')
    setFileCode('')
  }

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/gifler@0.1.0/gifler.min.js"
        onLoad={() => setGiflerLoaded(true)}
      />

      <div className="min-h-screen flex items-center bg-gradient-to-br from-purple-200 via-purple-100 to-blue-100 relative">
        {/* Loader Overlay */}
        {(loading || processing) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4">
              <div className="mb-4">
                <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-2">
                {loading ? 'Creating Animation...' : 'Processing Video...'}
              </h3>
              <p className="text-gray-600">
                {loading 
                  ? 'Please wait while we bring your character to life' 
                  : 'Adding effects and generating your final video (10 seconds)'}
              </p>
              {processing && (
                <div className="mt-4 bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">This may take a moment...</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            
            <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
              <h1 className="text-4xl font-bold text-blue-900 mb-6 text-center">
                Dream Big With Pears 2025
              </h1>
              <p className="text-gray-700 mb-8 text-center">
                Upload a drawing of a character and watch it come to life!
              </p>


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Preview Area */}
                <div>
                  <div className="bg-gray-100 rounded-2xl flex items-center justify-center mb-6 min-h-[400px] p-4">
                    {processedVideoUrl ? (
                      <video 
                        src={processedVideoUrl} 
                        controls 
                        loop 
                        autoPlay
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : animationUrl ? (
                      <img 
                        src={animationUrl} 
                        alt="Animation" 
                        className="max-w-full max-h-full object-contain"
                        key={animationUrl}
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

                  {/* Action Buttons */}
                  {!previewUrl && (
                    <label className="block bg-blue-900 text-white py-4 rounded-xl font-semibold text-center cursor-pointer hover:bg-blue-800 transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      Upload Photo
                    </label>
                  )}

                  {previewUrl && !animationUrl && (
                    <div className="flex gap-4">
                      <button
                        onClick={handleReset}
                        className="flex-1 border-2 border-gray-300 py-4 rounded-xl font-semibold hover:border-blue-900 transition"
                      >
                        Change Image
                      </button>
                      <button
                        onClick={handleAnimate}
                        disabled={loading}
                        className="flex-1 bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition disabled:bg-gray-400"
                      >
                        {loading ? 'Animating...' : 'Animate'}
                      </button>
                    </div>
                  )}

                  {animationUrl && !processedVideoUrl && (
                    <button
                      onClick={processWithCanvas}
                      disabled={processing || !giflerLoaded}
                      className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700 transition disabled:bg-gray-400"
                    >
                      {processing ? 'Processing... (10 sec)' : 'Create Final Video'}
                    </button>
                  )} 

                 {processedVideoUrl && (
  <div className="flex gap-4">
    <button
      onClick={() => window.location.reload()}
      className="flex-1 bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition"
    >
      Start Over
    </button>
    <button
      onClick={handleDownload}
      className="flex-1 bg-blue-400 text-white py-4 rounded-xl font-semibold hover:bg-blue-500 transition"
    >
      Download
    </button>
  </div>
)}
                  
                </div>

                {/* Input Panel */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-blue-900">Enter User Details</h2>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enter Your Name
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your name"
                      disabled={!!animationUrl}
                      className="w-full px-4 text-black py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Your animation will show: "Hi I'm {userName || 'Your Name'}"
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enter File Code
                    </label>
                    <input
                      type="text"
                      value={fileCode}
                      onChange={(e) => setFileCode(e.target.value)}
                      placeholder="File code (e.g., ABC123)"
                      disabled={!!animationUrl}
                      className="w-full px-4 py-3 text-lg border-2 text-black border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Output file will be named: {fileCode || 'your-code'}.webm
                    </p>
                  </div>

                  {!animationUrl && (
                    <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                      <p className="font-semibold mb-2">Steps:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Enter your name and file code</li>
                        <li>Upload your character drawing</li>
                        <li>Click Animate to generate animation</li>
                        <li>Click Create Final Video to add effects</li>
                        <li>Download your customized video</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Cropper Modal */}
{showCropper && previewUrl && (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative">
      <h2 className="text-lg font-semibold mb-4">Crop Your Image</h2>
      
      <div className="relative w-full h-80 bg-gray-200">
        <Cropper
          image={previewUrl}
          crop={crop}
          zoom={zoom}
          aspect={1} // square crop
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Zoom Slider */}
      <div className="mt-4">
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={() => setShowCropper(false)}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleCropConfirm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Crop & Save
        </button>
      </div>
    </div>
  </div>
)}

      </div>
    </>
  )
}