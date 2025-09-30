import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // 🔴 UPDATED: Create a unique subdirectory for each upload
    const uploadId = `upload_${Date.now()}`
    const uploadSubDir = path.join(uploadsDir, uploadId)
    await mkdir(uploadSubDir, { recursive: true })

    // 🔴 UPDATED: Save image with original name in subdirectory
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const imagePath = path.join(uploadSubDir, image.name)
    await writeFile(imagePath, buffer)

    // Create animations directory if it doesn't exist
    const animationsDir = path.join(process.cwd(), 'public', 'animations')
    if (!existsSync(animationsDir)) {
      await mkdir(animationsDir, { recursive: true })
    }

    // 🔴 UPDATED: Create character annotation directory
    const charAnnoDir = path.join(uploadSubDir, 'char_annotations')

    // Output path for animation
    const outputFileName = `animation_${Date.now()}.gif`  // 🔴 CHANGED: Use .gif instead of .mp4
    const outputPath = path.join(animationsDir, outputFileName)

    // Path to AnimatedDrawings Python script
    const pythonScript = path.join(
      process.cwd(),
      'AnimatedDrawings',
      'examples',
      'image_to_animation.py'
    )

    // Use the conda environment Python path
    const pythonPath = '/Users/ravindusankalpa/miniconda3/envs/animated-drawings/bin/python'

    // 🔴 UPDATED: Motion and retarget config paths
    const motionCfgPath = path.join(
      process.cwd(),
      'AnimatedDrawings',
      'examples',
      'config',
      'motion',
      'dab.yaml'
    )

    const retargetCfgPath = path.join(
      process.cwd(),
      'AnimatedDrawings',
      'examples',
      'config',
      'retarget',
      'fair1_ppf.yaml'
    )

    // Execute Python script
    return new Promise((resolve) => {
      // 🔴 UPDATED: Correct arguments format
      const pythonProcess = spawn(pythonPath, [
        pythonScript,
        imagePath,           // Image file path
        charAnnoDir,         // Character annotation directory
        motionCfgPath,       // Motion config file
        retargetCfgPath,     // Retarget config file
        outputPath           // Output file path
      ])

      let errorOutput = ''
      let standardOutput = ''

      pythonProcess.stdout.on('data', (data) => {
        standardOutput += data.toString()
        console.log('Python stdout:', data.toString())
      })

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.log('Python stderr:', data.toString())
      })

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          const animationUrl = `/animations/${outputFileName}`
          resolve(NextResponse.json({ animationUrl }))
        } else {
          console.error('Python error:', errorOutput)
          resolve(
            NextResponse.json(
              { error: 'Animation processing failed', details: errorOutput },
              { status: 500 }
            )
          )
        }
      })
    })
  } catch (error) {
    console.error('Error processing animation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}