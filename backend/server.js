require('dotenv').config({ path: '../.env' })
const express = require('express')
const cors = require('cors')
const { connectDatabase } = require('./config/database')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/admin', require('./routes/admin'))

// Session routes (split into logical modules)
app.use('/api/sessions', require('./routes/sessions.base'))
app.use('/api/sessions', require('./routes/sessions.participation'))
app.use('/api/sessions', require('./routes/sessions.leaderboard'))
app.use('/api/sessions', require('./routes/sessions.stats'))
app.use('/api/sessions', require('./routes/sessions.matchups'))

app.use('/api/duels', require('./routes/duels'))
app.use('/api/decks', require('./routes/decks'))
app.use('/api/backgrounds', require('./routes/backgrounds'))
app.use('/api/ladder-tiers', require('./routes/ladder-tiers'))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Start server
async function startServer() {
  try {
    // Debug environment variables
    console.log('🔍 Environment variables check:')
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing')
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing')
    console.log('DISCORD_GUILD_ID:', process.env.DISCORD_GUILD_ID)
    console.log('DISCORD_ADMIN_ROLE_ID:', process.env.DISCORD_ADMIN_ROLE_ID)
    console.log('DISCORD_SUPPORTER_ROLE_ID:', process.env.DISCORD_SUPPORTER_ROLE_ID)
    console.log('DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? 'Set' : 'Missing')
    
    await connectDatabase()
    
    app.listen(PORT, () => {
      console.log(`🚀 Duelytics API server running on port ${PORT}`)
      console.log(`📈 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🔗 Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()