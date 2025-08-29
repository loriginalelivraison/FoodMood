import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { authRequired } from '../middleware/auth.js'

const router = Router()

// ⚙️ Cloudinary (variables d'env requises)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Multer en mémoire (option: limite 10 Mo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// POST /api/upload/image  (champ: "image")
router.post('/image', authRequired, upload.single('image'), async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary non configuré. Définis CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET.' })
    }

    if (!req.file) return res.status(400).json({ error: 'No file' })
    if (!req.file.mimetype?.startsWith?.('image/')) {
      return res.status(400).json({ error: 'Format non supporté (image requise)' })
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: 'foodgo', resource_type: 'image' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary error:', error)
          return res.status(400).json({ error: error.message || 'Cloudinary error' })
        }
        return res.json({ url: result.secure_url })
      }
    )

    stream.end(req.file.buffer)
  } catch (e) {
    console.error('Upload route error:', e)
    res.status(400).json({ error: e.message || 'Upload failed' })
  }
})

export default router
