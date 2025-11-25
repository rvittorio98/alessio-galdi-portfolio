require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connetti al database (rimosso chiamata top-level, gestito via middleware e start server)
// connectDB();

// Middleware per assicurare la connessione al DB
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error('Database connection failed:', error);
      res.status(500).json({ error: 'Database connection failed' });
    }
  } else {
    next();
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/upload', uploadRoutes);

// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, '../dist/admin')));

// Redirect /admin e /admin/ to index.html (login)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/admin/index.html'));
});

app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/admin/index.html'));
});


app.use(express.static(path.join(__dirname, '../dist')));

// Dynamic project pages
app.get('/:slug.html', async (req, res) => {
  try {
    const slug = req.params.slug;
    const templatePath = path.join(__dirname, '../src/templates/project-template.html');

    if (!fs.existsSync(templatePath)) {
      return res.status(404).send('Template not found');
    }

    const template = fs.readFileSync(templatePath, 'utf8');
    const html = template.replace(/\{\{PROJECT_NAME\}\}/g, slug.toUpperCase());

    res.send(html);
  } catch (error) {
    console.error('Error serving project page:', error);
    res.status(500).send('Error loading project page');
  }
});

// Fallback per SPA routing (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  (async () => {
    try {
      await connectDB();
      app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        console.log(`📱 Frontend: http://localhost:${PORT}`);
        console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
        console.log(`🔌 API: http://localhost:${PORT}/api\n`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })();
}

module.exports = app;