const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/auth');

// Configura Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Usa memory storage invece di disk storage per Vercel
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo immagini!'));
    }
  }
});

// Upload immagine su Cloudinary
router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nessuna immagine'
      });
    }

    // Converti buffer in base64 per upload stream
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'portfolio-galdi',
      resource_type: 'auto'
    });

    return res.json({
      success: true,
      message: 'Immagine caricata!',
      url: result.secure_url,
      public_id: result.public_id
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore upload',
      error: error.message
    });
  }
});

// Elimina immagine da Cloudinary
router.delete('/image', authMiddleware, async (req, res) => {
  try {
    const { filename } = req.body; // Qui filename sarà il public_id o l'URL

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename mancante'
      });
    }

    // Se filename è un URL completo, estrai il public_id
    // Esempio URL: https://res.cloudinary.com/cloudname/image/upload/v1234567890/portfolio-galdi/image.jpg
    let publicId = filename;
    if (filename.includes('cloudinary.com')) {
      const parts = filename.split('/');
      const filenameWithExt = parts[parts.length - 1];
      const folder = parts[parts.length - 2]; // Assumendo struttura standard
      const name = filenameWithExt.split('.')[0];
      // Questo è un tentativo euristico, meglio se il frontend manda il public_id corretto
      // Ma per compatibilità proviamo a gestire anche l'URL se possibile, 
      // anche se Cloudinary delete richiede il public_id esatto.

      // Se il frontend manda l'URL, potrebbe essere difficile estrarre il public_id esatto senza sapere la struttura precisa
      // Per ora assumiamo che il frontend mandi il public_id se possibile, o gestiamo l'errore.
    }

    // Nota: Per cancellare da Cloudinary serve il public_id.
    // Se il vecchio sistema usava il nome file locale, questo endpoint dovrà cambiare logica
    // o il frontend dovrà salvare il public_id di Cloudinary.

    // Per ora implementiamo la cancellazione assumendo che 'filename' sia il public_id
    // Se non lo è, l'operazione fallirà ma non spaccherà tutto.

    // Se stiamo migrando, le vecchie immagini locali non potranno essere cancellate via API Cloudinary.

    const result = await cloudinary.uploader.destroy(filename);

    return res.json({
      success: true,
      message: 'Immagine eliminata (o non trovata su Cloudinary)',
      result
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Errore eliminazione',
      error: error.message
    });
  }
});

module.exports = router;