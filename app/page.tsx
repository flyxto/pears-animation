'use client'

import { useState } from 'react'

type Step = 'upload' | 'detect' | 'segment' | 'joints' | 'animate'
type AnimationType = 'dab' | 'jumping' | 'wave' | 'zombie' | 'dance' | 'running'

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType | null>(null)
  const [animationUrl, setAnimationUrl] = useState<string>('')

  const animations = [
    { id: 'dab', label: 'Dab', category: 'FUNNY' },
    { id: 'jumping', label: 'Jumping', category: 'JUMPING' },
    { id: 'wave', label: 'Wave', category: 'FUNNY' },
    { id: 'zombie', label: 'Zombie', category: 'WALKING' },
    { id: 'dance', label: 'Dance', category: 'DANCE' },
    { id: 'running', label: 'Running', category: 'WALKING' }
  ]

  const [filterCategory, setFilterCategory] = useState<string>('ALL')

  const filteredAnimations = animations.filter(anim => 
    filterCategory === 'ALL' || anim.category === filterCategory
  )

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError('')
      setAnimationUrl('') // Clear previous animation
      setSelectedAnimation(null) // Clear previous selection
    }
  }

  const handleNext = () => {
    // Just navigate through steps without processing
    if (currentStep === 'upload' && selectedImage) {
      setCurrentStep('detect')
    } else if (currentStep === 'detect') {
      setCurrentStep('segment')
    } else if (currentStep === 'segment') {
      setCurrentStep('joints')
    } else if (currentStep === 'joints') {
      setCurrentStep('animate')
    }
  }

  const handlePrevious = () => {
    if (currentStep === 'detect') setCurrentStep('upload')
    else if (currentStep === 'segment') setCurrentStep('detect')
    else if (currentStep === 'joints') setCurrentStep('segment')
    else if (currentStep === 'animate') setCurrentStep('joints')
  }

  const handleAnimationSelect = async (animationType: AnimationType) => {
    if (!selectedImage) return
    
    setSelectedAnimation(animationType)
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('image', selectedImage)
    formData.append('animationType', animationType)

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
      setSelectedAnimation(null)
    } finally {
      setLoading(false)
    }
  }

  const getStepNumber = () => {
    const steps = { upload: 1, detect: 2, segment: 3, joints: 4, animate: 4 }
    return steps[currentStep]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-100 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          {/* Left Panel - Instructions */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-600 mb-2">
                STEP {getStepNumber()}/4
              </p>
              <div className="flex gap-2 mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-2 flex-1 rounded-full ${
                      step <= getStepNumber() ? 'bg-blue-900' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {currentStep === 'upload' && (
              <>
                <h1 className="text-4xl font-bold text-blue-900 mb-6">
                  UPLOAD A DRAWING
                </h1>
                <p className="text-gray-700 mb-6">
                  Upload a drawing of <strong>ONE</strong> character, where the arms
                  and legs don't overlap the body (see examples).
                </p>
                
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  START WITH AN EXAMPLE
                </h3>
                <p className="text-gray-600 mb-6">
                  Feel free to try the demo by clicking on one of the following example images.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-blue-500 cursor-pointer">
                    <div className="aspect-square bg-gray-100 rounded-lg"></div>
                  </div>
                  <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-blue-500 cursor-pointer">
                    <div className="aspect-square bg-gray-100 rounded-lg"></div>
                  </div>
                  <div className="border-2 border-gray-300 rounded-xl p-4 hover:border-blue-500 cursor-pointer">
                    <div className="aspect-square bg-gray-100 rounded-lg"></div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-4">CHECKLIST</h3>
                <div className="space-y-2 text-gray-700">
                  <p className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Make sure the character is drawn on a white piece of paper without lines, wrinkles, or tears.</span>
                  </p>
                </div>
              </>
            )}

            {currentStep === 'detect' && (
              <>
                <h1 className="text-4xl font-bold text-blue-900 mb-6">
                  FIND THE CHARACTER
                </h1>
                <p className="text-gray-700 mb-6">
                  We've identified the character, and put a box around it.
                </p>
                
                <h3 className="text-lg font-bold text-gray-800 mb-4">CHECKLIST</h3>
                <p className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Resize the box to ensure it tightly fits one character.</span>
                </p>
              </>
            )}

            {currentStep === 'segment' && (
              <>
                <h1 className="text-4xl font-bold text-blue-900 mb-6">
                  HIGHLIGHT THE CHARACTER
                </h1>
                <p className="text-gray-700 mb-6">
                  We've separated the character from the background, and highlighted it.
                </p>
                
                <h3 className="text-lg font-bold text-gray-800 mb-4">CHECKLIST</h3>
                <p className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>If the body parts of your character are not highlighted, use the pen and eraser tools to fix it.</span>
                </p>
              </>
            )}

            {currentStep === 'joints' && (
              <>
                <h1 className="text-4xl font-bold text-blue-900 mb-6">
                  MARK THE CHARACTER'S JOINTS
                </h1>
                <p className="text-gray-700 mb-6">
                  Here are your character's joints! Here's an example of what it should look like:
                </p>
                
                <div className="bg-gray-100 rounded-xl p-8 mb-6">
                  <div className="aspect-square bg-gray-200 rounded-lg"></div>
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-4">CHECKLIST</h3>
                <p className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>If your character doesn't have any arms, drag the elbows and wrist joints far away from the character and it can still be animated.</span>
                </p>
              </>
            )}

            {currentStep === 'animate' && (
              <>
                <h1 className="text-4xl font-bold text-blue-900 mb-6">
                  ADD ANIMATION
                </h1>
                <p className="text-gray-700 mb-6">
                  Choose one of the motions below to see your character perform it!
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {['ALL', 'DANCE', 'FUNNY', 'JUMPING', 'WALKING'].map(category => (
                    <button
                      key={category}
                      onClick={() => setFilterCategory(category)}
                      className={`px-4 py-2 rounded-full font-semibold ${
                        filterCategory === category
                          ? 'bg-blue-900 text-white'
                          : 'border-2 border-gray-300 hover:border-blue-900'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {filteredAnimations.map((anim) => (
                    <button
                      key={anim.id}
                      onClick={() => handleAnimationSelect(anim.id as AnimationType)}
                      disabled={loading}
                      className={`border-2 rounded-xl p-4 hover:border-blue-500 cursor-pointer transition ${
                        selectedAnimation === anim.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                        <span className="text-2xl">🎭</span>
                      </div>
                      <p className="text-sm font-semibold text-center">{anim.label}</p>
                    </button>
                  ))}
                </div>

                {loading && (
                  <div className="mt-4 text-center text-blue-900 font-semibold">
                    Generating {selectedAnimation} animation...
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Panel - Canvas/Preview */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col">
            <div className="flex-1 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 min-h-[400px]">
              {currentStep === 'animate' && animationUrl ? (
                <img 
                  src={animationUrl} 
                  alt="Animation" 
                  className="max-w-full max-h-full object-contain"
                  key={animationUrl} // Force re-render when URL changes
                />
              ) : previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-400 text-center">
                  <p className="text-xl mb-2">No image uploaded</p>
                  <p className="text-sm">Upload an image to get started</p>
                </div>
              )}
            </div>

            {currentStep === 'upload' && !previewUrl && (
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

            {currentStep === 'upload' && previewUrl && (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedImage(null)
                    setPreviewUrl('')
                    setAnimationUrl('')
                    setSelectedAnimation(null)
                  }}
                  className="flex-1 border-2 border-gray-300 py-4 rounded-xl font-semibold hover:border-blue-900 transition"
                >
                  Retake
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex-1 bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition disabled:bg-gray-400"
                >
                  Next →
                </button>
              </div>
            )}

            {currentStep !== 'upload' && currentStep !== 'animate' && (
              <div className="flex gap-4">
                <button
                  onClick={handlePrevious}
                  className="flex-1 border-2 border-gray-300 py-4 rounded-xl font-semibold hover:border-blue-900 transition"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition"
                >
                  Next →
                </button>
              </div>
            )}

            {currentStep === 'animate' && (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCurrentStep('upload')
                    setSelectedImage(null)
                    setPreviewUrl('')
                    setAnimationUrl('')
                    setSelectedAnimation(null)
                  }}
                  className="flex-1 bg-blue-900 text-white py-4 rounded-xl font-semibold hover:bg-blue-800 transition"
                >
                  Start Over
                </button>
                {animationUrl && (
                  <>
                    <a
                      href={animationUrl}
                      download
                      className="flex-1 bg-blue-400 text-white py-4 rounded-xl font-semibold hover:bg-blue-500 transition text-center"
                    >
                      Download
                    </a>
                    <button
                      onClick={handlePrevious}
                      className="flex-1 border-2 border-gray-300 py-4 rounded-xl font-semibold hover:border-blue-900 transition"
                    >
                      Edit
                    </button>
                  </>
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
  )
}