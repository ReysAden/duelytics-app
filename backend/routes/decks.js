const express = require('express')
const multer = require('multer')
const { supabaseAdmin } = require('../config/database')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
})

// Get all decks
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('decks')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) return res.status(400).json({ error: error.message })
  res.json({ decks: data })
})

// Create deck
router.post('/', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  const { name } = req.body
  
  if (!name) return res.status(400).json({ error: 'Name required' })

  try {
    let imageUrl = null
    let imageFilename = null

    // Upload image if provided
    if (req.file) {
      imageFilename = `${Date.now()}-${req.file.originalname}`
      const { error: uploadError } = await supabaseAdmin.storage
        .from('deck-images')
        .upload(imageFilename, req.file.buffer, {
          contentType: req.file.mimetype
        })

      if (uploadError) throw uploadError

      const { data } = supabaseAdmin.storage
        .from('deck-images')
        .getPublicUrl(imageFilename)
      
      imageUrl = data.publicUrl
    }

    // Create deck
    const { data, error } = await supabaseAdmin
      .from('decks')
      .insert({
        name,
        image_url: imageUrl,
        image_filename: imageFilename,
        created_by: req.user.discord_id
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ deck: data })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update deck
router.patch('/:deckId', authenticate, requireAdmin, async (req, res) => {
  const { name } = req.body
  const updates = {}
  
  if (name !== undefined) updates.name = name

  const { data, error } = await supabaseAdmin
    .from('decks')
    .update(updates)
    .eq('id', req.params.deckId)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ deck: data })
})

// Delete deck
router.delete('/:deckId', authenticate, requireAdmin, async (req, res) => {
  // Check if used in duels
  const { data: duels } = await supabaseAdmin
    .from('duels')
    .select('id')
    .or(`player_deck_id.eq.${req.params.deckId},opponent_deck_id.eq.${req.params.deckId}`)
    .limit(1)

  if (duels?.length > 0) {
    return res.status(400).json({ error: 'Deck is used in duels' })
  }

  // Get image info before delete
  const { data: deck } = await supabaseAdmin
    .from('decks')
    .select('image_filename')
    .eq('id', req.params.deckId)
    .single()

  // Delete image from storage
  if (deck?.image_filename) {
    await supabaseAdmin.storage
      .from('deck-images')
      .remove([deck.image_filename])
  }

  // Delete deck
  const { error } = await supabaseAdmin
    .from('decks')
    .delete()
    .eq('id', req.params.deckId)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

// Get deck stats
router.get('/:deckId/stats', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .rpc('get_deck_stats', { deck_id: req.params.deckId })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ stats: data })
})

module.exports = router
