// src/routes/uploads.js
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

// Multer en mémoire
const upload = multer({ storage: multer.memoryStorage() })

// POST /api/upload/image
router.post('/image', authRequired, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })

    // Upload via stream
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'foodgo', resource_type: 'image' },
      (error, result) => {
        if (error) return res.status(400).json({ error: error.message || 'Cloudinary error' })
        return res.json({ url: result.secure_url })
      }
    )
    stream.end(req.file.buffer)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router
