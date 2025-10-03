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

    // Create a unique subdirectory for each upload
    const uploadId = `upload_${Date.now()}`
    const uploadSubDir = path.join(uploadsDir, uploadId)
    await mkdir(uploadSubDir, { recursive: true })

    // Save image with original name in subdirectory
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const imagePath = path.join(uploadSubDir, image.name)
    await writeFile(imagePath, buffer)

    // Create character annotation directory
    const charAnnoDir = path.join(uploadSubDir, 'char_annotations')

    // Path to AnimatedDrawings Python script
    const pythonScript = path.join(
      process.cwd(),
      'AnimatedDrawings',
      'examples',
      'image_to_animation.py'
    )

    // Use the conda environment Python path
    const pythonPath = '/opt/anaconda3/envs/animated_drawings/bin/python'

    // Motion and retarget config paths
    const motionCfgPath = path.join(
      process.cwd(),
      'AnimatedDrawings',
      'examples',
      'config',
      'motion',
      'wave_hello.yaml'
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
      const pythonProcess = spawn(pythonPath, [
        pythonScript,
        imagePath,           // Image file path
        charAnnoDir,         // Character annotation directory
        motionCfgPath,       // Motion config file
        retargetCfgPath      // Retarget config file
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
          // The video.gif is generated in char_annotations folder
          const videoPath = path.join(charAnnoDir, 'video.gif')
          
          // Copy to public directory for serving
          const publicAnimationsDir = path.join(process.cwd(), 'public', 'animations')
          if (!existsSync(publicAnimationsDir)) {
            mkdir(publicAnimationsDir, { recursive: true })
          }
          
          const outputFileName = `animation_${uploadId}.gif`
          const publicVideoPath = path.join(publicAnimationsDir, outputFileName)
          
          // Copy file to public directory
          const fs = require('fs')
          fs.copyFile(videoPath, publicVideoPath, (err: any) => {
            if (err) {
              console.error('Error copying file:', err)
              resolve(
                NextResponse.json(
                  { error: 'Failed to copy animation file', details: err.message },
                  { status: 500 }
                )
              )
            } else {
              const animationUrl = `/animations/${outputFileName}`
              resolve(NextResponse.json({ animationUrl, uploadId }))
            }
          })
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