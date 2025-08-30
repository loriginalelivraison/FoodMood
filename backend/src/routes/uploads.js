// src/routes/uploads.js
import { Router } from "express"
import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { authRequired } from "../middleware/auth.js"

const router = Router()

// Vérif config Cloudinary
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

// Multer en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)
    cb(ok ? null : new Error("Format image non supporté"))
  },
})

/**
 * ✅ Route DEBUG : pour vérifier que multer reçoit bien un fichier
 * Pas d'auth, pas de Cloudinary
 */
router.post("/debug", upload.single("image"), (req, res) => {
  if (!req.file) {
    console.error("❌ DEBUG: req.file est vide")
    return res.status(400).json({ error: "Aucun fichier reçu (debug)" })
  }

  console.log("✅ DEBUG fichier reçu:", req.file.originalname, req.file.mimetype, req.file.size)
  return res.json({
    ok: true,
    name: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  })
})

/**
 * ✅ Route CLOUDINARY avec auth
 */
router.post("/image", authRequired, upload.single("image"), async (req, res) => {
  try {
    if (!HAS_CLOUDINARY) {
      return res.status(500).json({ error: "Cloudinary non configuré" })
    }

    if (!req.file) {
      console.error("❌ req.file est vide !")
      return res.status(400).json({ error: "Aucun fichier reçu" })
    }

    console.log("✅ Fichier reçu:", req.file.originalname, req.file.mimetype, req.file.size)

    const stream = cloudinary.uploader.upload_stream(
      { folder: "foodgo", resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary error:", error)
          return res.status(400).json({ error: error.message || "Cloudinary error" })
        }
        return res.json({ url: result.secure_url })
      }
    )

    stream.end(req.file.buffer)
  } catch (e) {
    console.error("❌ Upload route error:", e)
    res.status(500).json({ error: e.message || "Erreur serveur upload" })
  }
})

export default router
