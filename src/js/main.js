// ==================== DARK MODE ====================
function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const body = document.body;

  if (localStorage.getItem('darkMode') === 'true') {
    body.classList.add('dark-mode');
    toggle.classList.add('active');
  }

  toggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    toggle.classList.toggle('active');
    localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
  });
}

// ==================== PROJECTS LOADER ====================
async function loadProjects() {
  const projectsList = document.getElementById('projectsList');
  if (!projectsList) return;

  try {
    // Legge da API invece che da file JSON
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.success || !data.projects) {
      throw new Error('Invalid API response');
    }
    
    data.projects.forEach(project => {
      const projectItem = document.createElement('a');
      projectItem.className = 'project-item';
      projectItem.href = `${project.slug}.html`;
      
      // Trova la prima immagine full-width nelle sezioni
      const firstImage = project.sections?.find(s => s.type === 'full-width-image')?.image;
      const imageUrl = firstImage ? (firstImage.includes('/') ? firstImage : '/images/uploads/' + firstImage) : '';
      
      projectItem.innerHTML = `
        <div class="project-content">
          <div class="project-name">${project.name}</div>
          <svg class="project-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
            <line x1="20" y1="50" x2="190" y2="50" stroke="currentColor" stroke-width="2"/>
            <line x1="190" y1="50" x2="140" y2="0" stroke="currentColor" stroke-width="2"/>
            <line x1="190" y1="50" x2="140" y2="100" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="project-image" style="background-image: url('${imageUrl}');"></div>
      `;
      
      projectsList.appendChild(projectItem);
    });
  } catch (error) {
    console.error('Error loading projects:', {
      message: error.message,
      stack: error.stack
    });
    
    projectsList.innerHTML = `
      <div style="padding: 60px; text-align: center;">
        <p>Errore nel caricamento dei progetti.</p>
        <p style="font-size: 14px; color: #666; margin-top: 10px;">
          Assicurati che il server sia in esecuzione su <code>http://localhost:3000</code>
        </p>
      </div>
    `;
  }
}

// ==================== INITIALIZATION ====================
initDarkMode();
loadProjects();