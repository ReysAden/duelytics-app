const express = require('express')
const multer = require('multer')
const { supabaseAdmin } = require('../config/database')
const { authenticate, requireSupporter } = require('../middleware/auth')
const { backgroundUploadLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// Configure multer with file size limit (5MB)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
})

// Get user's backgrounds (default + their uploads)
router.get('/', authenticate, requireSupporter, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('backgrounds')
    .select('*')
    .or(`uploaded_by.is.null,uploaded_by.eq.${req.user.discord_id}`)
    .order('name', { ascending: true })
  
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// Multer error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        message: 'Image must be smaller than 5MB'
      })
    }
    return res.status(400).json({ error: err.message })
  } else if (err) {
    return res.status(400).json({ error: err.message })
  }
  next()
}

// Upload background
router.post('/', authenticate, requireSupporter, backgroundUploadLimiter, upload.single('image'), handleUploadError, async (req, res) => {
  const { name } = req.body
  
  if (!name || !req.file) {
    return res.status(400).json({ error: 'Name and image required' })
  }

  try {
    // Check how many backgrounds user already has (max 10)
    const { data: existingBackgrounds, error: countError } = await supabaseAdmin
      .from('backgrounds')
      .select('id', { count: 'exact' })
      .eq('uploaded_by', req.user.discord_id)
    
    if (countError) throw countError
    
    if (existingBackgrounds.length >= 10) {
      return res.status(400).json({ 
        error: 'Background limit reached',
        message: 'You can only upload up to 10 custom backgrounds. Delete some to upload more.'
      })
    }

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${req.file.originalname}`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('backgrounds')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('backgrounds')
      .getPublicUrl(fileName)

    // Save to database
    const { data, error } = await supabaseAdmin
      .from('backgrounds')
      .insert({
        name,
        image_url: publicUrl,
        image_filename: fileName,
        uploaded_by: req.user.discord_id
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Set selected background
router.put('/select/:backgroundId', authenticate, requireSupporter, async (req, res) => {
  const { backgroundId } = req.params
  
  const backgroundId_value = backgroundId === 'default' ? null : backgroundId

  const { error } = await supabaseAdmin
    .from('users')
    .update({ selected_background_id: backgroundId_value })
    .eq('discord_id', req.user.discord_id)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

// Get current background
router.get('/current', authenticate, requireSupporter, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('selected_background_id, backgrounds(*)')
    .eq('discord_id', req.user.discord_id)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ background: data.backgrounds })
})

// Get user's background preference
router.get('/preference', authenticate, requireSupporter, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_preferences')
    .select('background_url')
    .eq('user_id', req.user.discord_id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return res.status(400).json({ error: error.message })
  }

  res.json(data || {})
})

// Set user's background preference
router.put('/preference', authenticate, requireSupporter, async (req, res) => {
  const { background_url } = req.body

  const { error } = await supabaseAdmin
    .from('user_preferences')
    .upsert({
      user_id: req.user.discord_id,
      background_url
    }, {
      onConflict: 'user_id'
    })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

// Delete background
router.delete('/:backgroundId', authenticate, requireSupporter, async (req, res) => {
  const { backgroundId } = req.params

  // Get background info
  const { data: background } = await supabaseAdmin
    .from('backgrounds')
    .select('image_filename')
    .eq('id', backgroundId)
    .eq('uploaded_by', req.user.discord_id)
    .single()

  if (!background) return res.status(404).json({ error: 'Background not found' })

  // Delete from storage
  await supabaseAdmin.storage
    .from('backgrounds')
    .remove([background.image_filename])

  // Delete from database
  const { error } = await supabaseAdmin
    .from('backgrounds')
    .delete()
    .eq('id', backgroundId)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

module.exports = router
