/**
 * OmniDoc Studio - PDF & Universal Document Viewer Module
 * Maneja la apertura, renderizado con PDF.js, navegación de páginas,
 * extracción de texto y visualización de PDFs y documentos de texto (.pdf, .txt, .md, .html).
 */

class PdfViewerModule {
  constructor() {
    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.scale = 1.35; // Factor de resolución nítido para canvas
    this.viewMode = 'all'; // 'all' (scroll continuo) o 'single' (página a página)
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfBlob = null;
    this.isRendering = false;
    this.activeDocumentType = null; // 'pdf' | 'text' | null
    this.extractedText = '';

    // Elementos de la interfaz del visor de documentos
    this.openDocDropZone = document.getElementById('openDocDropZone');
    this.openDocFileInput = document.getElementById('openDocFileInput');
    this.openDocStatus = document.getElementById('openDocStatus');
    this.openDocIcon = document.getElementById('openDocIcon');
    this.openDocName = document.getElementById('openDocName');
    this.openDocMeta = document.getElementById('openDocMeta');
    this.removeOpenDocBtn = document.getElementById('removeOpenDocBtn');

    // Controles específicos de PDF
    this.pdfControlsWrapper = document.getElementById('pdfControlsWrapper');
    this.prevPdfPageBtn = document.getElementById('prevPdfPageBtn');
    this.nextPdfPageBtn = document.getElementById('nextPdfPageBtn');
    this.pdfPageNumInput = document.getElementById('pdfPageNumInput');
    this.pdfTotalPagesText = document.getElementById('pdfTotalPagesText');
    this.pdfViewModeSelect = document.getElementById('pdfViewModeSelect');
    this.extractPdfTextBtn = document.getElementById('extractPdfTextBtn');
    this.openInNotesBtn = document.getElementById('openInNotesBtn');

    this.initPdfJs();
    this.initHandlers();
  }

  initPdfJs() {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  initHandlers() {
    // Zona de arrastrar y soltar
    if (this.openDocDropZone && this.openDocFileInput) {
      this.openDocDropZone.addEventListener('click', () => this.openDocFileInput.click());
      this.openDocFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleUniversalFile(e.target.files[0]);
        }
      });

      this.openDocDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.openDocDropZone.classList.add('dragover');
      });
      this.openDocDropZone.addEventListener('dragleave', () => {
        this.openDocDropZone.classList.remove('dragover');
      });
      this.openDocDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.openDocDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleUniversalFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Botón para quitar el documento cargado
    if (this.removeOpenDocBtn) {
      this.removeOpenDocBtn.addEventListener('click', () => {
        this.clear();
      });
    }

    // Controles de navegación de páginas en PDF
    if (this.prevPdfPageBtn) {
      this.prevPdfPageBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          if (this.viewMode === 'single') {
            this.renderSinglePage(this.currentPage);
          } else {
            this.scrollToPage(this.currentPage);
          }
          this.updatePageIndicator();
        }
      });
    }

    if (this.nextPdfPageBtn) {
      this.nextPdfPageBtn.addEventListener('click', () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          if (this.viewMode === 'single') {
            this.renderSinglePage(this.currentPage);
          } else {
            this.scrollToPage(this.currentPage);
          }
          this.updatePageIndicator();
        }
      });
    }

    if (this.pdfPageNumInput) {
      this.pdfPageNumInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) val = 1;
        if (val < 1) val = 1;
        if (val > this.totalPages) val = this.totalPages;
        this.currentPage = val;
        if (this.viewMode === 'single') {
          this.renderSinglePage(this.currentPage);
        } else {
          this.scrollToPage(this.currentPage);
        }
        this.updatePageIndicator();
      });
    }

    // Selector de modo de vista: Todas las páginas vs Una por una
    if (this.pdfViewModeSelect) {
      this.pdfViewModeSelect.addEventListener('change', (e) => {
        this.viewMode = e.target.value;
        if (this.pdfDoc) {
          this.renderPdfView();
        }
      });
    }

    // Botón para extraer texto
    if (this.extractPdfTextBtn) {
      this.extractPdfTextBtn.addEventListener('click', () => {
        this.promptExtractText();
      });
    }

    // Botón para transferir a Notas
    if (this.openInNotesBtn) {
      this.openInNotesBtn.addEventListener('click', () => {
        this.transferToNotes();
      });
    }
  }

  /**
   * Procesa cualquier tipo de archivo que el usuario abra
   */
  async handleUniversalFile(file) {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf('.'));

    // 1. Si es PDF
    if (ext === '.pdf') {
      await this.loadPdfFile(file);
      return;
    }

    // 2. Si es Word (.docx)
    if (ext === '.docx') {
      if (window.docApp) window.docApp.switchTab('word');
      if (window.docConverters) window.docConverters.processWordFile(file);
      return;
    }

    // 3. Si es una presentación PowerPoint (.pptx), reconstruir PDF básico desde el texto.
    if (ext === '.pptx') {
      if (window.officeConverters) await window.officeConverters.processPowerPointFile(file);
      return;
    }

    // 4. Si es Excel (.xlsx, .xls, .csv)
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      if (window.docApp) window.docApp.switchTab('excel');
      if (window.docConverters) window.docConverters.processExcelFile(file);
      return;
    }

    // 4. Si es documento de Texto plano o código (.txt, .md, .log, .json, .html, .htm, .rtf)
    if (['.txt', '.md', '.log', '.json', '.html', '.htm', '.rtf'].includes(ext)) {
      await this.loadTextFile(file);
      return;
    }

    // 5. Si es imagen
    if (file.type.startsWith('image/')) {
      if (window.docApp) {
        window.docApp.switchTab('images');
        window.docApp.handleImageFiles([file]);
      }
      return;
    }

    // Formato no reconocido
    Swal.fire({
      icon: 'question',
      title: 'Formato no reconocido',
      text: `El archivo "${file.name}" no es compatible directamente. Formatos soportados: PDF, Word (.docx), Excel (.xlsx, .csv), PowerPoint (.pptx), Texto (.txt, .md) e Imágenes.`
    });
  }

  /**
   * Carga y renderiza un archivo PDF
   */
  async loadPdfFile(file, password = '') {
    if (!window.pdfjsLib) {
      Swal.fire('Error', 'El motor PDF.js no está disponible en este momento.', 'error');
      return;
    }

    Swal.fire({
      title: 'Abriendo Documento PDF...',
      text: `Cargando "${file.name}"`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.pdfBytes = arrayBuffer;
      this.pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
      this.currentFile = file;
      this.activeDocumentType = 'pdf';

      // Compartir el Blob con la app principal para descargas y envíos instantáneos
      if (window.docApp) {
        window.docApp.activePdfBlob = this.pdfBlob;
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        window.docApp.setDocumentTitle(cleanName);
      }

      // Cargar documento en PDF.js
      const loadingTask = window.pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        password: password
      });

      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;

      Swal.close();

      // Actualizar UI del panel izquierdo
      this.updateFileInfoUi(file, `${this.totalPages} página(s) • ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      if (this.pdfControlsWrapper) this.pdfControlsWrapper.classList.remove('hidden');
      if (this.pdfTotalPagesText) this.pdfTotalPagesText.textContent = `de ${this.totalPages}`;
      if (this.pdfPageNumInput) {
        this.pdfPageNumInput.value = 1;
        this.pdfPageNumInput.max = this.totalPages;
      }

      // Cambiar a la pestaña "open" si no está activa
      if (window.docApp && window.docApp.activeTab !== 'open') {
        window.docApp.switchTab('open');
      }

      // Renderizar páginas
      await this.renderPdfView();

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `PDF abierto (${this.totalPages} páginas)`,
        showConfirmButton: false,
        timer: 1800
      });

    } catch (err) {
      console.error('Error abriendo PDF:', err);
      Swal.close();

      // Manejo de contraseña requerida
      if (err.name === 'PasswordException') {
        const { value: enteredPassword } = await Swal.fire({
          title: 'PDF Protegido',
          text: 'Este archivo PDF requiere una contraseña para abrirse:',
          input: 'password',
          inputPlaceholder: 'Ingresa la contraseña...',
          showCancelButton: true,
          confirmButtonText: 'Abrir PDF',
          cancelButtonText: 'Cancelar'
        });

        if (enteredPassword) {
          await this.loadPdfFile(file, enteredPassword);
        }
        return;
      }

      Swal.fire('Error', 'No se pudo leer el archivo PDF. Asegúrate de que el archivo no esté dañado.', 'error');
    }
  }

  /**
   * Renderiza el visor según el modo seleccionado (Continuo o Página única)
   */
  async renderPdfView() {
    if (!this.pdfDoc || this.isRendering) return;
    this.isRendering = true;

    const previewBody = document.getElementById('previewBodyContent');
    if (!previewBody) return;

    // Configurar encabezado del visor
    const docHeaderPreview = document.getElementById('docHeaderPreview');
    const docFooterPreview = document.getElementById('docFooterPreview');
    const docTitlePreviewContainer = document.getElementById('docTitlePreviewContainer');
    const headerBrandText = document.getElementById('headerBrandText');

    if (docHeaderPreview) {
      docHeaderPreview.classList.remove('hidden');
      if (headerBrandText) headerBrandText.textContent = `DOCUMENTO PDF: ${this.currentFile ? this.currentFile.name : ''}`;
    }
    if (docFooterPreview) docFooterPreview.classList.add('hidden');
    if (docTitlePreviewContainer) docTitlePreviewContainer.classList.add('hidden');

    if (this.viewMode === 'all') {
      // Modo Continuo: renderiza todas las páginas
      previewBody.innerHTML = `
        <div id="pdfContinuousContainer" class="flex flex-col items-center space-y-6 w-full">
          <div id="pdfRenderProgress" class="text-xs text-slate-500 font-mono py-2">
            <i class="fa-solid fa-spinner fa-spin mr-1.5 text-primary-500"></i> Renderizando páginas...
          </div>
        </div>
      `;

      const container = document.getElementById('pdfContinuousContainer');
      const progressEl = document.getElementById('pdfRenderProgress');

      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        if (progressEl) {
          progressEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5 text-primary-500"></i> Renderizando página ${pageNum} de ${this.totalPages}...`;
        }

        const pageCard = await this.createPageCard(pageNum);
        container.appendChild(pageCard);
      }

      if (progressEl) progressEl.remove();

    } else {
      // Modo Página Individual
      await this.renderSinglePage(this.currentPage);
    }

    this.isRendering = false;
  }

  /**
   * Crea y renderiza la tarjeta de una página específica en un elemento Canvas
   */
  async createPageCard(pageNum) {
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });

    const card = document.createElement('div');
    card.id = `pdf-page-${pageNum}`;
    card.className = 'pdf-page-card w-full max-w-full bg-white rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-center relative';

    // Barra de número de página
    const bar = document.createElement('div');
    bar.className = 'bg-slate-100 dark:bg-slate-800 px-4 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-300 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 print:hidden';
    bar.innerHTML = `
      <span class="font-bold flex items-center gap-1.5">
        <i class="fa-regular fa-file-lines text-primary-500"></i> Página ${pageNum} de ${this.totalPages}
      </span>
      <span class="text-[10px] text-slate-400 font-sans truncate max-w-[200px]">${this.currentFile ? this.currentFile.name : ''}</span>
    `;
    card.appendChild(bar);

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page-canvas mx-auto block max-w-full h-auto';
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const context = canvas.getContext('2d');
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    card.setAttribute('data-page', pageNum);
    card.appendChild(canvas);
    await page.render(renderContext).promise;

    // Acoplar capa interactiva de edición (borrador blanco, texto, firmas)
    if (window.pdfEditor) {
      window.pdfEditor.attachPageEditLayers(card, pageNum);
    }

    return card;
  }

  /**
   * Renderiza una sola página en la vista previa
   */
  async renderSinglePage(pageNum) {
    const previewBody = document.getElementById('previewBodyContent');
    if (!previewBody || !this.pdfDoc) return;

    previewBody.innerHTML = `
      <div id="pdfSingleContainer" class="flex flex-col items-center w-full">
        <div class="text-xs text-slate-500 font-mono py-2">
          <i class="fa-solid fa-spinner fa-spin mr-1.5 text-primary-500"></i> Cargando página ${pageNum}...
        </div>
      </div>
    `;

    const container = document.getElementById('pdfSingleContainer');
    const pageCard = await this.createPageCard(pageNum);
    container.innerHTML = '';
    container.appendChild(pageCard);

    this.updatePageIndicator();
  }

  scrollToPage(pageNum) {
    const target = document.getElementById(`pdf-page-${pageNum}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  updatePageIndicator() {
    if (this.pdfPageNumInput) this.pdfPageNumInput.value = this.currentPage;
    if (this.prevPdfPageBtn) this.prevPdfPageBtn.disabled = this.currentPage <= 1;
    if (this.nextPdfPageBtn) this.nextPdfPageBtn.disabled = this.currentPage >= this.totalPages;
  }

  /**
   * Carga y muestra un archivo de texto plano o Markdown (.txt, .md, .log, .json, .html)
   */
  async loadTextFile(file) {
    Swal.fire({
      title: 'Abriendo documento de texto...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const text = await file.text();
      this.currentFile = file;
      this.activeDocumentType = 'text';
      this.extractedText = text;

      // Compartir con la aplicación
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      if (window.docApp) {
        window.docApp.setDocumentTitle(cleanName);
        window.docApp.activePdfBlob = null;
      }

      this.updateFileInfoUi(file, `${text.length} caracteres • ${(file.size / 1024).toFixed(1)} KB`);
      if (this.pdfControlsWrapper) this.pdfControlsWrapper.classList.add('hidden');

      // Cambiar a la pestaña "open" si no está activa
      if (window.docApp && window.docApp.activeTab !== 'open') {
        window.docApp.switchTab('open');
      }

      // Renderizar el contenido de texto en el visor
      this.renderTextContent(file.name, text);

      Swal.close();

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Documento abierto: ${file.name}`,
        showConfirmButton: false,
        timer: 1800
      });

    } catch (err) {
      console.error('Error leyendo archivo de texto:', err);
      Swal.fire('Error', 'No se pudo leer el archivo de texto.', 'error');
    }
  }

  renderTextContent(fileName, text) {
    const previewBody = document.getElementById('previewBodyContent');
    const docHeaderPreview = document.getElementById('docHeaderPreview');
    const docFooterPreview = document.getElementById('docFooterPreview');
    const docTitlePreviewContainer = document.getElementById('docTitlePreviewContainer');
    const headerBrandText = document.getElementById('headerBrandText');
    const previewMainTitle = document.getElementById('previewMainTitle');

    if (docHeaderPreview) {
      docHeaderPreview.classList.remove('hidden');
      if (headerBrandText) headerBrandText.textContent = `DOCUMENTO DE TEXTO: ${fileName.toUpperCase()}`;
    }
    if (docFooterPreview) docFooterPreview.classList.remove('hidden');
    if (docTitlePreviewContainer) {
      docTitlePreviewContainer.classList.remove('hidden');
      if (previewMainTitle) previewMainTitle.textContent = fileName.replace(/\.[^/.]+$/, '');
    }

    if (previewBody) {
      // Escapar HTML seguro
      const safeText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      previewBody.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-750 text-xs">
            <span class="text-slate-600 dark:text-slate-300 font-medium">
              <i class="fa-solid fa-file-lines text-primary-500 mr-1.5"></i> Vista de lectura de documento
            </span>
            <button id="textToNotesQuickBtn" class="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition">
              <i class="fa-solid fa-pen-to-square"></i> Editar como Nota
            </button>
          </div>
          <div class="text-doc-viewer whitespace-pre-wrap leading-relaxed font-mono text-xs bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 max-h-[800px] overflow-y-auto">
${safeText}
          </div>
        </div>
      `;

      const textToNotesQuickBtn = document.getElementById('textToNotesQuickBtn');
      if (textToNotesQuickBtn) {
        textToNotesQuickBtn.addEventListener('click', () => this.transferToNotes());
      }
    }
  }

  /**
   * Extrae el texto de todo el PDF usando PDF.js
   */
  async promptExtractText() {
    if (!this.pdfDoc) return;

    Swal.fire({
      title: 'Extrayendo texto del PDF...',
      text: 'Procesando todas las páginas...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      let fullText = '';
      for (let i = 1; i <= this.totalPages; i++) {
        const page = await this.pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items.map(item => item.str).join(' ');
        fullText += `--- PÁGINA ${i} ---\n\n${pageStrings}\n\n`;
      }

      this.extractedText = fullText;
      Swal.close();

      const { value: action } = await Swal.fire({
        title: 'Texto Extraído con Éxito',
        html: `
          <div class="text-left text-xs space-y-2">
            <p class="text-slate-500">Se han procesado ${this.totalPages} página(s). ¿Qué deseas hacer con el texto?</p>
            <textarea readonly class="w-full h-40 p-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600">${fullText}</textarea>
          </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Copiar al Portapapeles',
        denyButtonText: 'Editar en Notas',
        cancelButtonText: 'Cerrar'
      });

      if (action) {
        navigator.clipboard.writeText(fullText);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Texto copiado al portapapeles',
          showConfirmButton: false,
          timer: 2000
        });
      } else if (action === false) {
        this.transferToNotes();
      }

    } catch (err) {
      console.error('Error extrayendo texto:', err);
      Swal.fire('Error', 'No se pudo extraer el texto de este PDF (podría tratarse de un PDF escaneado sólo como imágenes).', 'error');
    }
  }

  /**
   * Transfiere el texto del documento al panel de Redactar Notas para poder editarlo
   */
  transferToNotes() {
    if (!this.extractedText && !this.currentFile) return;

    const noteTitleInput = document.getElementById('noteTitleInput');
    const noteContentInput = document.getElementById('noteContentInput');

    if (noteTitleInput && this.currentFile) {
      noteTitleInput.value = this.currentFile.name.replace(/\.[^/.]+$/, '');
    }
    if (noteContentInput) {
      noteContentInput.value = this.extractedText;
      noteContentInput.dispatchEvent(new Event('input'));
    }

    if (window.docApp) {
      window.docApp.switchTab('notes');
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Documento cargado en el editor de notas',
      showConfirmButton: false,
      timer: 2000
    });
  }

  updateFileInfoUi(file, metaText) {
    if (this.openDocStatus) this.openDocStatus.classList.remove('hidden');
    if (this.openDocDropZone) this.openDocDropZone.classList.add('hidden');
    if (this.openDocName) this.openDocName.textContent = file.name;
    if (this.openDocMeta) this.openDocMeta.textContent = metaText;

    if (this.openDocIcon) {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (ext === '.pdf') {
        this.openDocIcon.className = 'fa-solid fa-file-pdf text-rose-500 text-2xl';
      } else if (ext === '.docx') {
        this.openDocIcon.className = 'fa-solid fa-file-word text-blue-500 text-2xl';
      } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
        this.openDocIcon.className = 'fa-solid fa-file-excel text-emerald-500 text-2xl';
      } else {
        this.openDocIcon.className = 'fa-solid fa-file-lines text-amber-500 text-2xl';
      }
    }
  }

  clear() {
    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfBlob = null;
    this.activeDocumentType = null;
    this.extractedText = '';

    if (this.openDocFileInput) this.openDocFileInput.value = '';
    if (this.openDocStatus) this.openDocStatus.classList.add('hidden');
    if (this.openDocDropZone) this.openDocDropZone.classList.remove('hidden');
    if (this.pdfControlsWrapper) this.pdfControlsWrapper.classList.add('hidden');

    if (window.docApp) {
      window.docApp.activePdfBlob = null;
      window.docApp.clearPreview();
    }
  }
}

// Inicializar en el ámbito global
window.pdfViewer = new PdfViewerModule();
