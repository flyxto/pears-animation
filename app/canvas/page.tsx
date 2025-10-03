'use client'

import { useState, useRef } from 'react';
import Script from 'next/script';

export default function GifVideoRecorder() {
  const [gifFile, setGifFile] = useState(null);
  const [overlayFile, setOverlayFile] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [gifPreview, setGifPreview] = useState(null);
  const [overlayPreview, setOverlayPreview] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [customText, setCustomText] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(48);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('Upload files to start');
  const [videoUrl, setVideoUrl] = useState(null);
  const [giflerLoaded, setGiflerLoaded] = useState(false);

  const canvasRef = useRef(null);
  const overlayImgRef = useRef(null);
  const backgroundImgRef = useRef(null);
  const gifAnimationRef = useRef(null);

  const handleGifUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGifFile(file);
      setGifPreview(URL.createObjectURL(file));
      setVideoUrl(null);
    }
  };

  const handleOverlayUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOverlayFile(file);
      setOverlayPreview(URL.createObjectURL(file));
    }
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackgroundFile(file);
      setBackgroundPreview(URL.createObjectURL(file));
    }
  };

  const startRecording = async () => {
    if (!gifFile || !giflerLoaded) {
      alert('Upload a GIF first or wait for library to load');
      return;
    }

    setRecording(true);
    setStatus('Preparing...');

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const gifUrl = URL.createObjectURL(gifFile);

    let overlayImg = null;
    if (overlayFile) {
      overlayImg = document.createElement('img');
      overlayImg.src = overlayPreview;
      await new Promise(resolve => {
        if (overlayImg.complete) resolve();
        else overlayImg.onload = resolve;
      });
    }

    let backgroundImg = null;
    if (backgroundFile) {
      backgroundImg = document.createElement('img');
      backgroundImg.src = backgroundPreview;
      await new Promise(resolve => {
        if (backgroundImg.complete) resolve();
        else backgroundImg.onload = resolve;
      });
    }

    // Start recording
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
      setRecording(false);
      setStatus('Recording complete!');
    };

    setStatus('Recording... (10 seconds)');
    mediaRecorder.start();

    // Use gifler to animate
    let frameCount = 0;
    const startTime = Date.now();
    const recordDuration = 10000; // 10 seconds

    window.gifler(gifUrl).frames(canvas, (ctx, frame) => {
      canvas.width = frame.width;
      canvas.height = frame.height;

      // Draw background color
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background image
      if (backgroundImg) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
      }

      // Draw GIF frame
      ctx.drawImage(frame.buffer, 0, 0);

      // Draw overlay
      if (overlayImg) {
        ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
      }

      // Draw custom text
      if (customText) {
        ctx.font = `bold 80px Arial`;
        ctx.fillStyle = `#4E56C0`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(customText, canvas.width / 2, canvas.height - 120);
      }
 
      frameCount++;

      // Stop after duration
      if (Date.now() - startTime >= recordDuration) {
        mediaRecorder.stop();
      }
    });
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'animated-video.webm';
    a.click();
  };

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/gifler@0.1.0/gifler.min.js"
        onLoad={() => {
          setGiflerLoaded(true);
          setStatus('Ready - Upload a GIF to start');
        }}
      />

      <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
        <h1>GIF to Video Recorder</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div>
            <h3>1. Upload Animated GIF</h3>
            <input type="file" accept="image/gif" onChange={handleGifUpload} />
            {gifPreview && (
              <div style={{ marginTop: '10px', border: '2px solid #ddd', padding: '10px' }}>
                <img src={gifPreview} alt="GIF" style={{ maxWidth: '100%' }} />
              </div>
            )}
          </div>

          <div>
            <h3>2. Background Image (Optional)</h3>
            <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
            {backgroundPreview && (
              <div style={{ marginTop: '10px', border: '2px solid #ddd', padding: '10px' }}>
                <img ref={backgroundImgRef} src={backgroundPreview} alt="Background" style={{ maxWidth: '100%' }} />
              </div>
            )}
          </div>

          <div>
            <h3>3. Overlay (Optional)</h3>
            <input type="file" accept="image/*" onChange={handleOverlayUpload} />
            {overlayPreview && (
              <div style={{ marginTop: '10px', border: '2px solid #ddd', padding: '10px' }}>
                <img ref={overlayImgRef} src={overlayPreview} alt="Overlay" style={{ maxWidth: '100%' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Background Color: </label>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            style={{ marginLeft: '10px' }}
          />
        </div>

        <div style={{ marginBottom: '20px', padding: '20px', background: '#f9f9f9', border: '1px solid #ddd' }}>
          <h3>Text Overlay (Optional)</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>Text: </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter custom text"
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Text Color: </label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              style={{ marginLeft: '10px' }}
            />
          </div>
          <div>
            <label>Font Size: </label>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              min="10"
              max="200"
              style={{ marginLeft: '10px', padding: '5px', width: '80px' }}
            />
            <span style={{ marginLeft: '5px' }}>px</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={startRecording}
            disabled={!gifFile || recording || !giflerLoaded}
            style={{ padding: '15px 30px', fontSize: '16px', marginRight: '10px' }}
          >
            {recording ? 'Recording...' : '4. Record Video (10 sec)'}
          </button>

          <button
            onClick={downloadVideo}
            disabled={!videoUrl}
            style={{ padding: '15px 30px', fontSize: '16px' }}
          >
            5. Download Video
          </button>
        </div>

        <div style={{ padding: '15px', background: '#f0f0f0', marginBottom: '20px' }}>
          Status: {status}
        </div>

        {videoUrl && (
          <div>
            <h3>Preview:</h3>
            <video src={videoUrl} controls loop style={{ maxWidth: '100%', border: '2px solid #ddd' }} />
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </>
  );
}