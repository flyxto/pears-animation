'use client'

import { useState } from 'react'

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [animationUrl, setAnimationUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
      setAnimationUrl('')
      setError('')
    }
  }

  const handleAnimate = async () => {
    if (!selectedImage) return

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
        throw new Error('Animation failed')
      }

      const data = await response.json()
      setAnimationUrl(data.animationUrl)
    } catch (err) {
      setError('Failed to animate drawing. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-5xl font-bold text-center mb-2 text-gray-800">
          Animated Drawings
        </h1>
        <p className="text-center text-gray-600 mb-12">
          Upload a drawing and watch it come to life!
        </p>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <label className="block mb-4">
              <span className="text-lg font-semibold text-gray-700">
                Upload Your Drawing
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="block w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </label>
          </div>

          {previewUrl && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Preview
              </h3>
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-md mx-auto rounded-lg shadow-md"
              />
            </div>
          )}

          <button
            onClick={handleAnimate}
            disabled={!selectedImage || loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Animating...' : 'Animate Drawing'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {animationUrl && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Animated Result
              </h3>
              <video
                src={animationUrl}
                controls
                className="max-w-md mx-auto rounded-lg shadow-md"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}