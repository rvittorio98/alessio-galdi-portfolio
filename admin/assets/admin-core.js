// ==================== AUTH CHECK ====================
const token = localStorage.getItem('adminToken');
if (!token) {
  window.location.href = '/admin/index.html';
}

// ==================== API HELPERS ====================
const API = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/index.html';
      throw new Error('Non autorizzato');
    }

    return response.json();
  },

  getProjects() {
    return this.request('/api/projects', { skipAuth: true });
  },

  createProject(projectData) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },

  updateProject(slug, projectData) {
    return this.request(`/api/projects/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  },

  deleteProject(slug) {
    return this.request(`/api/projects/${slug}`, {
      method: 'DELETE'
    });
  },

  async uploadImage(file) {
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (response.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/index.html';
      throw new Error('Non autorizzato');
    }

    return response.json();
  }
};

// ==================== STATE ====================
let projects = [];
let editingProject = null;

// ==================== DOM ELEMENTS ====================
const projectsList = document.getElementById('projectsList');
const newProjectBtn = document.getElementById('newProjectBtn');
const logoutBtn = document.getElementById('logoutBtn');
const viewSiteBtn = document.getElementById('viewSiteBtn');
const projectModal = document.getElementById('projectModal');
const closeModal = document.getElementById('closeModal');
const projectForm = document.getElementById('projectForm');
const cancelBtn = document.getElementById('cancelBtn');
const modalTitle = document.getElementById('modalTitle');
const addSectionBtn = document.getElementById('addSectionBtn');
const sectionsContainer = document.getElementById('sectionsContainer');

// ==================== LOAD PROJECTS ====================
async function loadProjects() {
  try {
    const data = await API.getProjects();
    projects = data.projects || [];
    renderProjects();
  } catch (error) {
    console.error('Error loading projects:', error);
    projectsList.innerHTML = '<div class="loading">Errore nel caricamento dei progetti</div>';
  }
}

// ==================== RENDER PROJECTS ====================
function renderProjects() {
  if (projects.length === 0) {
    projectsList.innerHTML = `
      <div class="empty-state">
        <h3>Nessun progetto</h3>
        <p>Inizia creando il tuo primo progetto</p>
        <button class="btn btn-primary" onclick="window.openModal()">+ Nuovo Progetto</button>
      </div>
    `;
    return;
  }

  projectsList.innerHTML = projects.map(project => `
    <div class="project-card" data-id="${project.slug}">
      <div class="project-card-header">
        <div class="drag-handle">⋮⋮</div>
        <div class="project-card-actions">
          <button class="btn btn-icon btn-sm" onclick="window.editProject('${project.slug}')">✏️</button>
          <button class="btn btn-icon btn-sm" onclick="window.deleteProject('${project.slug}')">🗑️</button>
        </div>
      </div>
      <h3>${project.name}</h3>
      <p>${project.hero?.description?.substring(0, 100)}...</p>
      <div class="project-meta">
        <span>Slug: /${project.slug}</span>
        <span>${project.sections?.length || 0} sezioni</span>
      </div>
    </div>
  `).join('');

  // Inizializza Sortable per i progetti
  if (projects.length > 0) {
    new Sortable(projectsList, {
      animation: 150,
      handle: '.drag-handle',
      onEnd: async function (evt) {
        const projectOrder = Array.from(projectsList.children)
          .map(el => el.dataset.id);

        try {
          const response = await fetch('/api/projects/reorder', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ order: projectOrder })
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.message || `Errore nel riordinamento dei progetti`);
          }

          // Aggiorna i progetti con quelli restituiti dal server
          if (result.projects) {
            projects = result.projects;
            renderProjects();
          }
        } catch (error) {
          console.error('Errore nel riordinamento:', error.message);
          alert('Errore nel riordinamento dei progetti');
          // In caso di errore, ricarica i progetti per ripristinare l'ordine corretto
          await loadProjects();
        }
      }
    });
  }
}

// ==================== MODAL MANAGEMENT ====================
window.openModal = function (project = null) {
  editingProject = project;

  if (project) {
    modalTitle.textContent = 'Modifica Progetto';
    populateForm(project);
  } else {
    modalTitle.textContent = 'Nuovo Progetto';
    projectForm.reset();
    document.getElementById('projectId').value = '';
    document.getElementById('projectSlug').value = '';
    document.getElementById('mainImage').value = '';
    sectionsContainer.innerHTML = '';
  }

  projectModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModalFn() {
  projectModal.classList.remove('active');
  document.body.style.overflow = '';
  editingProject = null;
}

function populateForm(project) {
  document.getElementById('projectId').value = project.slug;
  document.getElementById('projectName').value = project.name;
  document.getElementById('projectSlug').value = project.slug;
  document.getElementById('heroTitle').value = project.hero?.title || '';
  document.getElementById('heroDescription').value = project.hero?.description || '';
  document.getElementById('mainImage').value = project.mainImage || '';

  sectionsContainer.innerHTML = '';
  if (project.sections) {
    // Filtra le sezioni escludendo quelle di tipo projects-list poiché verranno aggiunte automaticamente
    const filteredSections = project.sections.filter(section => section.type !== 'projects-list');
    filteredSections.forEach((section, index) => {
      window.addSection(section, index);
    });
  }
}

// ==================== SECTIONS MANAGEMENT ====================
let sectionCounter = 0;

window.addSection = function (sectionData = null, index = null) {
  const sectionId = index !== null ? index : sectionCounter++;
  const sectionType = sectionData?.type || 'full-width-image';

  const sectionDiv = document.createElement('div');
  sectionDiv.className = 'section-item';
  sectionDiv.dataset.sectionId = sectionId;

  // Inizializza Sortable per le sezioni se non è già stato fatto
  if (!window.sectionsSortable) {
    window.sectionsSortable = new Sortable(sectionsContainer, {
      animation: 150,
      handle: '.sortable-handle',
      onEnd: function (evt) {
        // L'ordine verrà salvato quando si salva il progetto
        console.log('Sections reordered');
      }
    });
  }

  sectionDiv.innerHTML = `
    <div class="section-header">
      <div class="sortable-handle">⋮⋮</div>
      <select class="section-type" onchange="window.updateSectionFields(${sectionId}, this.value)">
        <option value="full-width-image" ${sectionType === 'full-width-image' ? 'selected' : ''}>Immagine Full Width</option>
        <option value="vimeo-video" ${sectionType === 'vimeo-video' ? 'selected' : ''}>Video Vimeo</option>
        <option value="two-column-text" ${sectionType === 'two-column-text' ? 'selected' : ''}>Testo Due Colonne</option>
      </select>
      <button type="button" class="btn btn-danger btn-sm" onclick="window.removeSection(${sectionId})">Rimuovi</button>
    </div>
    <div class="section-fields" id="fields-${sectionId}">
      ${renderSectionFields(sectionType, sectionData)}
    </div>
  `;

  sectionsContainer.appendChild(sectionDiv);
}

function renderSectionFields(type, data = null) {
  switch (type) {
    case 'full-width-image':
      return `
        <div class="form-group">
          <label>URL Immagine o Upload</label>
          <input type="text" class="section-field" name="image" value="${data?.image || ''}" placeholder="URL immagine o carica...">
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.uploadImageForSection(this)">📷 Upload Immagine</button>
        </div>
      `;

    case 'vimeo-video':
      return `
        <div class="form-group">
          <label>ID Video Vimeo</label>
          <input type="text" 
                 class="section-field" 
                 name="vimeoId" 
                 value="${data?.vimeoId || ''}" 
                 placeholder="Es: 123456789"
                 pattern="[0-9]+"
                 oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                 onpaste="setTimeout(() => this.value = this.value.replace(/[^0-9]/g, ''), 0)">
          <small style="display: block; margin-top: 5px; color: #666;">
            Prendi l'ID dall'URL Vimeo: https://vimeo.com/<strong>123456789</strong><br>
            Inserisci solo i numeri dell'ID, senza altri caratteri
          </small>
        </div>
        <div class="form-group">
          <label>Aspect Ratio</label>
          <select class="section-field" name="aspectRatio">
            <option value="16:9" ${data?.aspectRatio === '16:9' ? 'selected' : ''}>16:9 (Widescreen)</option>
            <option value="4:3" ${data?.aspectRatio === '4:3' ? 'selected' : ''}>4:3 (Standard)</option>
            <option value="21:9" ${data?.aspectRatio === '21:9' ? 'selected' : ''}>21:9 (Ultrawide)</option>
            <option value="1:1" ${data?.aspectRatio === '1:1' ? 'selected' : ''}>1:1 (Quadrato)</option>
          </select>
        </div>
      `;

    case 'two-column-text':
      // Genera ID univoci per gli editor Quill
      const leftEditorId = `quill-left-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const rightEditorId = `quill-right-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Schedula l'inizializzazione di Quill dopo che il DOM è stato aggiornato
      setTimeout(() => {
        const leftContainer = document.getElementById(leftEditorId);
        const rightContainer = document.getElementById(rightEditorId);

        if (leftContainer && !leftContainer.quillInitialized) {
          const leftQuill = new Quill(`#${leftEditorId}`, {
            theme: 'snow',
            modules: {
              toolbar: [
                ['bold', 'italic', 'underline'],
                ['link'],
                [{ 'header': [1, 2, 3, false] }],
                ['clean']
              ]
            },
            placeholder: 'Scrivi il contenuto...'
          });
          leftContainer.quillInitialized = true;
          leftContainer.quillInstance = leftQuill;
        }

        if (rightContainer && !rightContainer.quillInitialized) {
          const rightQuill = new Quill(`#${rightEditorId}`, {
            theme: 'snow',
            modules: {
              toolbar: [
                ['bold', 'italic', 'underline'],
                ['link'],
                [{ 'header': [1, 2, 3, false] }],
                ['clean']
              ]
            },
            placeholder: 'Scrivi il contenuto...'
          });
          rightContainer.quillInitialized = true;
          rightContainer.quillInstance = rightQuill;
        }
      }, 100);

      return `
        <div class="two-columns-editor">
          <div class="column">
            <div class="form-group">
              <label>Titolo Colonna Sinistra</label>
              <input type="text" class="section-field" name="leftTitle" value="${data?.leftTitle || ''}" placeholder="Es: Credits">
            </div>
            <div class="form-group">
              <label>Contenuto Colonna Sinistra</label>
              <div id="${leftEditorId}" class="quill-editor section-field-quill" data-name="leftContent" style="min-height: 150px;">${data?.leftContent || ''}</div>
            </div>
          </div>
          <div class="column">
            <div class="form-group">
              <label>Titolo Colonna Destra</label>
              <input type="text" class="section-field" name="rightTitle" value="${data?.rightTitle || ''}" placeholder="Es: Awards">
            </div>
            <div class="form-group">
              <label>Contenuto Colonna Destra</label>
              <div id="${rightEditorId}" class="quill-editor section-field-quill" data-name="rightContent" style="min-height: 150px;">${data?.rightContent || ''}</div>
            </div>
          </div>
        </div>
      `;

    case 'projects-list':
      return `<p>Questa sezione mostrerà automaticamente tutti gli altri progetti</p>`;

    default:
      return '';
  }
}

window.updateSectionFields = function (sectionId, type) {
  const fieldsContainer = document.getElementById(`fields-${sectionId}`);

  // Check if there's existing data that would be lost
  const existingFields = fieldsContainer.querySelectorAll('.section-field');
  let hasData = false;
  existingFields.forEach(field => {
    if (field.value && field.value.trim()) {
      hasData = true;
    }
  });

  if (hasData) {
    if (!confirm('Cambiando tipo sezione, i dati esistenti verranno persi. Continuare?')) {
      // Revert the select to the previous value
      const sectionEl = document.querySelector(`[data-section-id="${sectionId}"]`);
      const typeSelect = sectionEl.querySelector('.section-type');
      // Find the type from existing fields
      const imageField = fieldsContainer.querySelector('[name="image"]');
      const vimeoField = fieldsContainer.querySelector('[name="vimeoId"]');
      const leftTitleField = fieldsContainer.querySelector('[name="leftTitle"]');

      if (imageField) typeSelect.value = 'full-width-image';
      else if (vimeoField) typeSelect.value = 'vimeo-video';
      else if (leftTitleField) typeSelect.value = 'two-column-text';
      return;
    }
  }

  fieldsContainer.innerHTML = renderSectionFields(type);
}

window.removeSection = function (sectionId) {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (section) {
    section.remove();
  }
}

// ==================== IMAGE UPLOAD ====================
window.uploadImageForSection = async function (button) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const originalText = button.textContent;
    button.textContent = '⏳ Caricamento...';
    button.disabled = true;

    try {
      console.log('Uploading file:', file.name); // Debug
      const result = await API.uploadImage(file);
      console.log('Upload result:', result); // Debug

      if (result.success) {
        const inputField = button.previousElementSibling;
        // Usiamo l'URL completo di Cloudinary
        inputField.value = result.url;
        console.log('✅ VERSIONE 3 - URL COMPLETO:', result.url); // Debug

        // Verifichiamo che l'immagine sia accessibile
        const img = new Image();
        img.onload = () => console.log('Image loaded successfully:', result.url);
        img.onerror = () => console.error('Failed to load image:', result.url);
        img.src = result.url;

        alert('Immagine caricata con successo!');
      } else {
        alert('Errore: ' + result.message);
      }
    } catch (error) {
      alert('Errore caricamento immagine');
      console.error(error);
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  };

  input.click();
}

// ==================== FORM SUBMISSION ====================
projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Salvataggio...';

  try {
    // DEBUG: Vediamo i valori del form
    console.log('🔍 DEBUG FORM:');
    console.log('Nome:', document.getElementById('projectName').value);
    console.log('Slug:', document.getElementById('projectSlug').value);
    console.log('Titolo Hero:', document.getElementById('heroTitle').value);
    console.log('Desc Hero:', document.getElementById('heroDescription').value);

    console.log('EditingProject:', editingProject);

    const slugValue = document.getElementById('projectSlug').value.trim();
    const nameValue = document.getElementById('projectName').value.trim();
    const heroTitleValue = document.getElementById('heroTitle').value.trim();
    const heroDescValue = document.getElementById('heroDescription').value.trim();

    // Validazione base
    if (!nameValue) {
      alert('Il nome è obbligatorio!');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salva Progetto';
      return;
    }

    if (!slugValue) {
      alert('Lo slug è obbligatorio!');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salva Progetto';
      return;
    }



    const mainImageValue = document.getElementById('mainImage').value.trim();

    const projectData = {
      name: nameValue,
      slug: slugValue,
      color: '#000000', // Colore predefinito
      mainImage: mainImageValue,
      hero: {
        title: heroTitleValue,
        description: heroDescValue
      },
      sections: []
    };



    const sectionElements = sectionsContainer.querySelectorAll('.section-item');
    const validationErrors = [];

    sectionElements.forEach((sectionEl, index) => {
      const typeSelect = sectionEl.querySelector('.section-type');
      const type = typeSelect.value;

      const section = { type };

      // Raccolta campi standard (input, select)
      const fields = sectionEl.querySelectorAll('.section-field');
      fields.forEach(field => {
        if (field.value && field.value.trim()) {
          section[field.name] = field.value.trim();
        }
      });

      // Raccolta campi Quill (editor rich text)
      const quillEditors = sectionEl.querySelectorAll('.section-field-quill');
      quillEditors.forEach(editorDiv => {
        const fieldName = editorDiv.dataset.name;
        if (editorDiv.quillInstance) {
          const htmlContent = editorDiv.quillInstance.root.innerHTML;
          // Salva solo se c'è contenuto (non vuoto o solo tag vuoti)
          if (htmlContent && htmlContent !== '<p><br></p>' && htmlContent.trim() !== '') {
            section[fieldName] = htmlContent;
          }
        }
      });

      // Validate section has required content based on type
      let isValid = true;
      switch (type) {
        case 'full-width-image':
          if (!section.image) {
            validationErrors.push(`Sezione ${index + 1} (Immagine): manca l'URL dell'immagine`);
            isValid = false;
          }
          break;
        case 'vimeo-video':
          if (!section.vimeoId) {
            validationErrors.push(`Sezione ${index + 1} (Video): manca l'ID del video Vimeo`);
            isValid = false;
          }
          break;
        case 'two-column-text':
          if (!section.leftTitle && !section.leftContent && !section.rightTitle && !section.rightContent) {
            validationErrors.push(`Sezione ${index + 1} (Testo): inserisci almeno un contenuto`);
            isValid = false;
          }
          break;
      }

      if (isValid) {
        projectData.sections.push(section);
      }
    });

    // Show validation errors if any
    if (validationErrors.length > 0) {
      const proceed = confirm(`Attenzione! Alcune sezioni non sono complete e verranno ignorate:\n\n${validationErrors.join('\n')}\n\nVuoi continuare comunque?`);
      if (!proceed) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salva Progetto';
        return;
      }
    }

    // Aggiungi sempre la sezione projects-list alla fine
    projectData.sections.push({
      type: 'projects-list'
    });

    console.log('📦 Project Data da inviare:', JSON.stringify(projectData, null, 2));

    let result;
    if (editingProject) {
      console.log('→ UPDATE progetto:', slugValue);
      result = await API.updateProject(slugValue, projectData);
    } else {
      console.log('→ CREATE nuovo progetto');
      result = await API.createProject(projectData);
    }

    console.log('✅ Risposta server:', result);

    if (result.success) {
      alert(editingProject ? 'Progetto aggiornato!' : 'Progetto creato!');
      closeModalFn();
      loadProjects();
    } else {
      alert('Errore: ' + result.message);
    }
  } catch (error) {
    console.error('❌ Errore completo:', error);
    alert('Errore nel salvataggio del progetto');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Salva Progetto';
  }
});

// ==================== EDIT PROJECT ====================
window.editProject = function (projectSlug) {
  const project = projects.find(p => p.slug === projectSlug);
  if (project) {
    window.openModal(project);
  } else {
    console.error('Project not found:', projectSlug);
    alert('Progetto non trovato');
  }
}

// ==================== DELETE PROJECT ====================
window.deleteProject = async function (projectSlug) {
  if (!confirm('Sei sicuro di voler eliminare questo progetto?')) {
    return;
  }

  try {
    const result = await API.deleteProject(projectSlug);
    if (result.success) {
      alert('Progetto eliminato!');
      loadProjects();
    } else {
      alert('Errore: ' + result.message);
    }
  } catch (error) {
    alert('Errore nell\'eliminazione del progetto');
    console.error(error);
  }
}

// ==================== EVENT LISTENERS ====================
newProjectBtn.addEventListener('click', () => window.openModal());
closeModal.addEventListener('click', closeModalFn);
cancelBtn.addEventListener('click', closeModalFn);
addSectionBtn.addEventListener('click', () => window.addSection());

// Upload handler for mainImage
document.getElementById('uploadMainImageBtn').addEventListener('click', async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btn = document.getElementById('uploadMainImageBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Caricamento...';
    btn.disabled = true;

    try {
      const result = await API.uploadImage(file);
      if (result.success) {
        document.getElementById('mainImage').value = result.url;
        alert('Immagine principale caricata!');
      } else {
        alert('Errore: ' + result.message);
      }
    } catch (error) {
      alert('Errore caricamento immagine');
      console.error(error);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  };

  input.click();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  window.location.href = '/admin/index.html';
});

viewSiteBtn.addEventListener('click', () => {
  window.open('/', '_blank');
});

projectModal.addEventListener('click', (e) => {
  if (e.target === projectModal) {
    closeModalFn();
  }
});

// ==================== INIT ====================
loadProjects();