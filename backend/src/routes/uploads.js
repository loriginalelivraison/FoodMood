import { Router } from "express"
import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { authRequired } from "../middleware/auth.js"

const router = Router()

// Cloudinary
const HAS_CLOUDINARY =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET

if (HAS_CLOUDINARY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

// Multer (mémoire)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// 🚨 middleware chain : multer -> auth -> handler
router.post(
  "/image",
  upload.single("image"),  // multer parse d'abord le FormData
  authRequired,            // ensuite on vérifie le token
  async (req, res) => {
    try {
      if (!req.file) {
        console.error("❌ req.file est vide !")
        return res.status(400).json({ error: "Aucun fichier reçu" })
      }

      console.log("✅ Fichier reçu:", req.file.originalname)

      const stream = cloudinary.uploader.upload_stream(
        { folder: "foodgo", resource_type: "image" },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary error:", error)
            return res.status(400).json({ error: error.message })
          }
          return res.json({ url: result.secure_url })
        }
      )

      stream.end(req.file.buffer)
    } catch (e) {
      console.error("❌ Upload error:", e)
      res.status(500).json({ error: e.message })
    }
  }
)

export default router
