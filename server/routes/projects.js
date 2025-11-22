const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Project } = require('../db');
const authMiddleware = require('../middleware/auth');

// PUT /api/projects/reorder - Riordina progetti (protetto)
router.put('/reorder', authMiddleware, async (req, res) => {
  try {
    const { order } = req.body;    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'order è richiesto nel body della richiesta'
      });
    }
    
    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: 'order deve essere un array di slug'
      });
    }

    // Verifica che ci siano elementi nell'array
    if (order.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'L\'array order non può essere vuoto'
      });
    }

    try {
      // Prima verifichiamo quali progetti esistono
      const existingProjects = await Project.find({}, 'slug order');
      console.log('Existing projects:', existingProjects);

      // Verifica che tutti gli slug esistano
      const existingSlugs = existingProjects.map(p => p.slug);
      const missingProjects = order.filter(slug => !existingSlugs.includes(slug));
      
      if (missingProjects.length > 0) {
        console.error('Missing projects:', missingProjects);
        return res.status(400).json({
          success: false,
          message: `Progetti non trovati: ${missingProjects.join(', ')}`
        });
      }

      // Usa una transazione per assicurarsi che tutti gli aggiornamenti avvengano o nessuno
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Verifica che tutti i progetti esistano prima dell'aggiornamento
        const projectsToUpdate = await Project.find({ slug: { $in: order } }).session(session);
        
        if (projectsToUpdate.length !== order.length) {
          throw new Error(`Alcuni progetti non sono stati trovati`);
        }

        // Aggiorna l'ordine di tutti i progetti
        const updatePromises = order.map((slug, index) => 
          Project.findOneAndUpdate(
            { slug },
            { $set: { order: index } },
            { new: true, session }
          ).then(doc => {
            if (!doc) {
              throw new Error(`Progetto non trovato: ${slug}`);
            }
            return doc;
          })
        );

        await Promise.all(updatePromises);
        await session.commitTransaction();
        session.endSession();
      } catch (error) {
        console.error('Error during transaction:', error);
        await session.abortTransaction();
        session.endSession();
        throw error;
      }

      // Restituisci i progetti aggiornati
      const updatedProjects = await Project.find().sort({ order: 1 });
      console.log('Final project order:', updatedProjects.map(p => ({ slug: p.slug, order: p.order })));

      return res.json({
        success: true,
        message: 'Ordine progetti aggiornato',
        projects: updatedProjects
      });
    } catch (error) {
      console.error('Detailed error:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  } catch (error) {
    console.error('Error reordering projects:', {
      error: error,
      stack: error.stack,
      message: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'Errore nel riordinamento dei progetti',
      error: error.message,
      details: error.stack
    });
  }
});

// GET /api/projects - Tutti i progetti (pubblico)
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ order: 1, createdAt: -1 });
    return res.json({
      success: true,
      projects
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei progetti',
      error: error.message
    });
  }
});

// GET /api/projects/:slug - Singolo progetto (pubblico)
router.get('/:slug', async (req, res) => {
  try {
    const project = await Project.findOne({ slug: req.params.slug });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Progetto non trovato'
      });
    }

    return res.json({
      success: true,
      project
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Errore nel recupero del progetto',
      error: error.message
    });
  }
});

// POST /api/projects - Crea nuovo progetto (protetto)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const projectData = req.body;

    // Genera slug dal nome se non fornito
    if (!projectData.slug) {
      projectData.slug = projectData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    // Trova il massimo ordine attuale e aggiungi 1
    const lastProject = await Project.findOne().sort({ order: -1 });
    projectData.order = lastProject ? (lastProject.order || 0) + 1 : 0;

    const project = new Project(projectData);
    await project.save();

    return res.status(201).json({
      success: true,
      message: 'Progetto creato con successo',
      project
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Esiste già un progetto con questo slug'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Errore nella creazione del progetto',
      error: error.message
    });
  }
});

// PUT /api/projects/:slug - Aggiorna progetto (protetto)
router.put('/:slug', authMiddleware, async (req, res) => {
  try {
    const projectData = req.body;
    projectData.updatedAt = new Date();

    const project = await Project.findOneAndUpdate(
      { slug: req.params.slug },
      projectData,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Progetto non trovato'
      });
    }

    return res.json({
      success: true,
      message: 'Progetto aggiornato con successo',
      project
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del progetto',
      error: error.message
    });
  }
});

// DELETE /api/projects/:slug - Elimina progetto (protetto)
router.delete('/:slug', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ slug: req.params.slug });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Progetto non trovato'
      });
    }

    return res.json({
      success: true,
      message: 'Progetto eliminato con successo'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del progetto',
      error: error.message
    });
  }
});

module.exports = router;