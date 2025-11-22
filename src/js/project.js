// ==================== PROJECT PAGE LOGIC ====================

// Ottieni il nome del progetto dall'URL
const projectSlug = window.location.pathname.replace('.html', '').replace('/', '');

// ==================== LOAD PROJECT DATA ====================
async function loadProjectContent() {
  try {
    // Fetch dati progetto dal server
    const response = await fetch(`/api/projects/${projectSlug}`);
    const data = await response.json();

    if (!data.success) {
      console.error('Project not found');
      document.getElementById('hero').innerHTML = '<h1>Progetto non trovato</h1>';
      return;
    }

    const project = data.project;

    // Imposta colore tema
    if (project.color) {
      document.documentElement.style.setProperty('--project-color', project.color);
    }

    // Popola Hero Section
    const heroSection = document.getElementById('hero');
    if (heroSection && project.hero) {
      heroSection.innerHTML = `
        <div class="hero-content">
          <h1 class="hero-title">${project.hero.title || project.name}</h1>
          <p class="hero-description">${project.hero.description || ''}</p>
        </div>
      `;
    }

    // Popola Project Content
    const contentSection = document.getElementById('project-content');
    if (contentSection && project.sections && project.sections.length > 0) {
      contentSection.innerHTML = project.sections.map(section => renderSection(section)).join('');
    }

    // Aggiorna title della pagina
    document.title = `${project.name} - Alessio Galdi Portfolio`;

  } catch (error) {
    console.error('Error loading project:', error);
    document.getElementById('hero').innerHTML = '<h1>Errore nel caricamento del progetto</h1>';
  }
}

// ==================== RENDER SECTIONS ====================
function renderSection(section) {
  switch (section.type) {
    case 'full-width-image':
      if (!section.image) {
        console.error('Missing image in full-width-image section:', section);
        return `
          <div class="section-image">
            <p>Immagine non disponibile</p>
          </div>
        `;
      }
      const imgSrc = section.image.includes('/') ? section.image : '/images/uploads/' + section.image;
      console.log('Rendering image with src:', imgSrc); // Debug
      return `
        <div class="section-image">
          <img src="${imgSrc}" alt="Project image" class="project-image" onerror="console.error('Failed to load image:', this.src)">
        </div>
      `;
    
    case 'vimeo-video':
      const aspectRatio = section.aspectRatio || '16:9';
      const paddingMap = {
        '16:9': '56.25%',
        '4:3': '75%',
        '21:9': '42.86%',
        '1:1': '100%'
      };
      const padding = paddingMap[aspectRatio] || '56.25%';
      
      // Pulisci l'ID del video da eventuali caratteri non necessari
      const videoId = section.vimeoId ? section.vimeoId.trim().replace(/\D/g, '') : '';
      
      if (!videoId) {
        console.error('ID video Vimeo mancante o non valido:', section.vimeoId);
        return `
          <div class="section-video">
            <div class="vimeo-container" style="padding: 20px; text-align: center; background: #f5f5f5;">
              ID Video Vimeo non valido
            </div>
          </div>
        `;
      }
      
      return `
        <div class="section-video">
          <div class="vimeo-container" style="position: relative; padding-bottom: ${padding}; height: 0; overflow: hidden; max-width: 100%; margin: 3rem auto; background: #000; border-radius: 8px;">
            <iframe 
              src="https://player.vimeo.com/video/${videoId}?autoplay=1&loop=1&background=1&muted=1" 
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" 
              frameborder="0" 
              allow="autoplay; fullscreen; picture-in-picture" 
              allowfullscreen="true"
            ></iframe>
          </div>
        </div>
      `;
    
    case 'two-column-text':
      return `
        <div class="section-text-columns">
          <div class="text-column">
            ${section.leftTitle ? `<h3>${section.leftTitle}</h3>` : ''}
            <p>${section.leftContent || ''}</p>
          </div>
          <div class="text-column">
            ${section.rightTitle ? `<h3>${section.rightTitle}</h3>` : ''}
            <p>${section.rightContent || ''}</p>
          </div>
        </div>
      `;
    
    case 'projects-list':
      return `<div class="section-projects-list">
        <div id="other-projects-container" class="projects-section"></div>
      </div>`;
    
    default:
      console.warn('Unknown section type:', section.type);
      return '';
  }
}

// ==================== LOAD OTHER PROJECTS ====================
async function loadOtherProjects() {
  try {
    const response = await fetch('/api/projects');
    const data = await response.json();

    if (!data.success) {
      console.error('Error loading projects');
      return;
    }

    // Filtra il progetto corrente
    const otherProjects = data.projects.filter(p => p.slug !== projectSlug);

    const container = document.getElementById('other-projects-container');
    if (container && otherProjects.length > 0) {
      // Aggiungi tutti i progetti in una volta sola
      const projectsHTML = otherProjects.map(project => {
        // Trova la prima immagine full-width nelle sezioni o usa l'immagine principale
        const firstImage = project.sections?.find(s => s.type === 'full-width-image')?.image || project.mainImage;
        const imageUrl = firstImage ? (firstImage.includes('/') ? firstImage : '/images/uploads/' + firstImage) : '';

        return `
          <a href="/${project.slug}.html" class="project-item">
            <div class="project-content">
              <div class="project-name">${project.name}</div>
              <svg class="project-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
                <line x1="20" y1="50" x2="190" y2="50" stroke="currentColor" stroke-width="2"/>
                <line x1="190" y1="50" x2="140" y2="0" stroke="currentColor" stroke-width="2"/>
                <line x1="190" y1="50" x2="140" y2="100" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="project-image" style="background-image: url('${imageUrl}')"></div>
          </a>
        `;
      }).join('');

      container.innerHTML = projectsHTML;
    }
  } catch (error) {
    console.error('Error loading other projects:', error);
  }
}

// ==================== BACK BUTTON ====================
const backButton = document.querySelector('.back-button');
if (backButton) {
  backButton.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Se c'è una history, torna indietro
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Altrimenti vai alla homepage
      window.location.href = '/';
    }
  });
}

// ==================== DARK MODE ====================
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

// Carica preferenza salvata
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  body.classList.add('dark-mode');
  if (darkModeToggle) darkModeToggle.classList.add('active');
}

// Toggle dark mode
if (darkModeToggle) {
  darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    darkModeToggle.classList.toggle('active');
    
    // Salva preferenza
    const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
  });
}

// ==================== SMOOTH SCROLL ====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadProjectContent().then(() => {
    // Se c'è una sezione "projects-list", carica gli altri progetti
    if (document.getElementById('other-projects-container')) {
      loadOtherProjects();
    }
  });
});