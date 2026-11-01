/**
 * OmniDoc Studio - PDF Merger & Page Organizer Module
 * Permite:
 * - Unir múltiples archivos PDF externos en un solo documento en el orden deseado.
 * - Añadir nuevas hojas en blanco a un PDF existente.
 * - Insertar otro PDF externo dentro del documento actual.
 * - Borrar y reorganizar páginas mediante un Gestor Visual de Páginas.
 */

class PdfMergerModule {
  constructor() {
    this.mergeQueue = []; // Lista de archivos PDF en cola para unir

    // Referencias al panel de Unir PDFs
    this.mergeDropZone = document.getElementById('mergeDropZone');
    this.mergeFileInput = document.getElementById('mergeFileInput');
    this.mergeFilesList = document.getElementById('mergeFilesList');
    this.mergeFilesCountBadge = document.getElementById('mergeFilesCountBadge');
    this.mergeActionBtn = document.getElementById('mergeActionBtn');
    this.clearMergeQueueBtn = document.getElementById('clearMergeQueueBtn');
    this.noMergeFilesPlaceholder = document.getElementById('noMergeFilesPlaceholder');

    // Botones de acción rápida en el visor y editor
    this.addBlankPageBtn = document.getElementById('addBlankPageBtn');
    this.appendExternalPdfBtn = document.getElementById('appendExternalPdfBtn');
    this.appendExternalPdfInput = document.getElementById('appendExternalPdfInput');
    this.openPageOrganizerBtn = document.getElementById('openPageOrganizerBtn');

    // Botones de la barra de edición superior
    this.toolbarAddBlankPageBtn = document.getElementById('toolbarAddBlankPageBtn');
    this.toolbarAppendPdfBtn = document.getElementById('toolbarAppendPdfBtn');
    this.toolbarOrganizePagesBtn = document.getElementById('toolbarOrganizePagesBtn');

    // Modal organizador
    this.pageOrganizerModal = document.getElementById('pageOrganizerModal');
    this.pageOrganizerGrid = document.getElementById('pageOrganizerGrid');

    this.init();
  }

  init() {
    this.initMergePanelHandlers();
    this.initDocumentPageHandlers();
    this.initOrganizerModalHandlers();
  }

  // ==========================================
  // PANEL: UNIR MÚLTIPLES PDFS EXTERNOS
  // ==========================================
  initMergePanelHandlers() {
    if (this.mergeDropZone && this.mergeFileInput) {
      this.mergeDropZone.addEventListener('click', () => this.mergeFileInput.click());

      this.mergeFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleQueueFiles(e.target.files);
        }
      });

      this.mergeDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.mergeDropZone.classList.add('dragover');
      });
      this.mergeDropZone.addEventListener('dragleave', () => {
        this.mergeDropZone.classList.remove('dragover');
      });
      this.mergeDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.mergeDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleQueueFiles(e.dataTransfer.files);
        }
      });
    }

    if (this.mergeActionBtn) {
      this.mergeActionBtn.addEventListener('click', () => this.executeMerge());
    }

    if (this.clearMergeQueueBtn) {
      this.clearMergeQueueBtn.addEventListener('click', () => this.clearQueue());
    }
  }

  async handleQueueFiles(files) {
    if (!window.PDFLib) {
      Swal.fire('Error', 'Motor PDFLib no disponible.', 'error');
      return;
    }

    Swal.fire({
      title: 'Analizando archivos PDF...',
      text: 'Calculando páginas y tamaño...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith('.pdf')) continue;

        const arrayBuffer = await file.arrayBuffer();
        let pageCount = 1;
        try {
          const doc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          pageCount = doc.getPageCount();
        } catch (e) {
          console.warn('Error leyendo páginas del PDF:', e);
        }

        this.mergeQueue.push({
          id: 'pdf-' + Date.now() + Math.random().toString(36).substring(2, 6),
          file: file,
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2),
          pageCount: pageCount,
          arrayBuffer: arrayBuffer
        });
      }

      Swal.close();
      this.renderQueueUi();

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${files.length} PDF(s) añadido(s) a la lista`,
        showConfirmButton: false,
        timer: 1800
      });

    } catch (err) {
      console.error('Error procesando archivos para unir:', err);
      Swal.close();
      Swal.fire('Error', 'No se pudieron procesar algunos archivos PDF.', 'error');
    }
  }

  renderQueueUi() {
    if (!this.mergeFilesList) return;

    if (this.mergeQueue.length === 0) {
      this.mergeFilesList.innerHTML = '';
      if (this.noMergeFilesPlaceholder) this.noMergeFilesPlaceholder.classList.remove('hidden');
      if (this.mergeFilesCountBadge) this.mergeFilesCountBadge.textContent = '0 archivos';
      if (this.mergeActionBtn) this.mergeActionBtn.disabled = true;
      return;
    }

    if (this.noMergeFilesPlaceholder) this.noMergeFilesPlaceholder.classList.add('hidden');
    if (this.mergeFilesCountBadge) this.mergeFilesCountBadge.textContent = `${this.mergeQueue.length} archivos`;
    if (this.mergeActionBtn) this.mergeActionBtn.disabled = this.mergeQueue.length < 2;

    this.mergeFilesList.innerHTML = '';

    let totalPages = 0;
    this.mergeQueue.forEach((item, index) => {
      totalPages += item.pageCount;
      const card = document.createElement('div');
      card.className = 'flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition hover:border-primary-400 group';
      card.innerHTML = `
        <div class="flex items-center gap-3 truncate">
          <span class="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
            ${index + 1}
          </span>
          <i class="fa-solid fa-file-pdf text-rose-500 text-xl flex-shrink-0"></i>
          <div class="truncate">
            <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${item.name}</p>
            <p class="text-[10px] text-slate-400 font-mono">${item.pageCount} pág. • ${item.size} MB</p>
          </div>
        </div>

        <div class="flex items-center gap-1 flex-shrink-0">
          <button class="move-up-btn w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition disabled:opacity-30" title="Subir orden" ${index === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-up text-xs"></i>
          </button>
          <button class="move-down-btn w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition disabled:opacity-30" title="Bajar orden" ${index === this.mergeQueue.length - 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-down text-xs"></i>
          </button>
          <button class="delete-item-btn w-7 h-7 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500 hover:text-rose-700 flex items-center justify-center transition ml-1" title="Quitar de la lista">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      `;

      card.querySelector('.move-up-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (index > 0) {
          const temp = this.mergeQueue[index];
          this.mergeQueue[index] = this.mergeQueue[index - 1];
          this.mergeQueue[index - 1] = temp;
          this.renderQueueUi();
        }
      });

      card.querySelector('.move-down-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (index < this.mergeQueue.length - 1) {
          const temp = this.mergeQueue[index];
          this.mergeQueue[index] = this.mergeQueue[index + 1];
          this.mergeQueue[index + 1] = temp;
          this.renderQueueUi();
        }
      });

      card.querySelector('.delete-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.mergeQueue.splice(index, 1);
        this.renderQueueUi();
      });

      this.mergeFilesList.appendChild(card);
    });

    if (this.mergeActionBtn) {
      this.mergeActionBtn.innerHTML = `
        <i class="fa-solid fa-layer-group text-sm"></i>
        <span>Unir ${this.mergeQueue.length} PDFs (${totalPages} páginas totales)</span>
      `;
    }
  }

  clearQueue() {
    this.mergeQueue = [];
    if (this.mergeFileInput) this.mergeFileInput.value = '';
    this.renderQueueUi();
  }

  async executeMerge() {
    if (this.mergeQueue.length < 2) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona al menos 2 PDFs',
        text: 'Por favor añade 2 o más archivos PDF para poder combinarlos en un solo documento.'
      });
      return;
    }

    Swal.fire({
      title: 'Uniendo Documentos PDF...',
      text: 'Fusionando páginas y conservando máxima resolución...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const mergedDoc = await window.PDFLib.PDFDocument.create();

      for (const item of this.mergeQueue) {
        const doc = await window.PDFLib.PDFDocument.load(item.arrayBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach(p => mergedDoc.addPage(p));
      }

      const mergedBytes = await mergedDoc.save();
      const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
      const totalPages = mergedDoc.getPageCount();

      // Nombrar el documento fusionado
      const defaultName = `PDF_Unificado_${this.mergeQueue.length}_documentos`;
      const mergedFile = new File([mergedBlob], `${defaultName}.pdf`, { type: 'application/pdf' });

      // Actualizar en el visor principal
      if (window.docApp) {
        window.docApp.activePdfBlob = mergedBlob;
        window.docApp.setDocumentTitle(defaultName);
        window.docApp.switchTab('open');
      }
      if (window.pdfViewer) {
        await window.pdfViewer.loadPdfFile(mergedFile);
      }

      Swal.close();

      Swal.fire({
        title: '¡Documentos Unidos con Éxito!',
        html: `Se han combinado los <strong>${this.mergeQueue.length} archivos</strong> en un solo PDF de <strong>${totalPages} páginas</strong>. Ya puedes leerlo, editarlo, imprimirlo o descargarlo.`,
        icon: 'success',
        confirmButtonText: 'Ver Documento en el Visor',
        confirmButtonColor: '#4f46e5'
      });

    } catch (err) {
      console.error('Error al unir PDFs:', err);
      Swal.close();
      Swal.fire('Error', 'No se pudieron unir los archivos PDF. Asegúrate de que no tengan restricciones de seguridad.', 'error');
    }
  }

  // ==========================================
  // GESTIÓN DE PÁGINAS DEL DOCUMENTO ACTIVO
  // ==========================================
  initDocumentPageHandlers() {
    // Añadir hoja en blanco al PDF actual
    const addBlankAction = () => this.addBlankPageToCurrentDoc();
    if (this.addBlankPageBtn) this.addBlankPageBtn.addEventListener('click', addBlankAction);
    if (this.toolbarAddBlankPageBtn) this.toolbarAddBlankPageBtn.addEventListener('click', addBlankAction);

    // Unir / Insertar otro PDF externo al PDF actual
    const triggerAppendFile = () => {
      if (this.appendExternalPdfInput) this.appendExternalPdfInput.click();
    };
    if (this.appendExternalPdfBtn) this.appendExternalPdfBtn.addEventListener('click', triggerAppendFile);
    if (this.toolbarAppendPdfBtn) this.toolbarAppendPdfBtn.addEventListener('click', triggerAppendFile);

    if (this.appendExternalPdfInput) {
      this.appendExternalPdfInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          await this.appendExternalPdfToCurrentDoc(e.target.files[0]);
          this.appendExternalPdfInput.value = '';
        }
      });
    }

    // Abrir modal organizador de páginas
    const openOrganizerAction = () => this.openPageOrganizerModal();
    if (this.openPageOrganizerBtn) this.openPageOrganizerBtn.addEventListener('click', openOrganizerAction);
    if (this.toolbarOrganizePagesBtn) this.toolbarOrganizePagesBtn.addEventListener('click', openOrganizerAction);
  }

  /**
   * Añade una hoja en blanco A4 al documento actual
   */
  async addBlankPageToCurrentDoc(insertIndex = -1) {
    if (!window.docApp || !window.docApp.activePdfBlob) {
      // Si no hay un PDF cargado, crear uno nuevo en blanco
      await this.createNewBlankPdfDoc();
      return;
    }

    Swal.fire({
      title: 'Añadiendo hoja en blanco...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const buffer = await window.docApp.activePdfBlob.arrayBuffer();
      const doc = await window.PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });

      // Dimensiones A4 estándar en puntos
      const a4Width = 595.28;
      const a4Height = 841.89;

      if (insertIndex === -1 || insertIndex >= doc.getPageCount()) {
        doc.addPage([a4Width, a4Height]);
      } else {
        doc.insertPage(insertIndex, [a4Width, a4Height]);
      }

      const newBytes = await doc.save();
      const newBlob = new Blob([newBytes], { type: 'application/pdf' });
      const currentName = window.docApp.documentTitle || 'Documento';
      const updatedFile = new File([newBlob], `${currentName}.pdf`, { type: 'application/pdf' });

      window.docApp.activePdfBlob = newBlob;
      if (window.pdfViewer) {
        await window.pdfViewer.loadPdfFile(updatedFile);
      }

      Swal.close();

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Hoja en blanco añadida',
        showConfirmButton: false,
        timer: 1600
      });

    } catch (err) {
      console.error('Error añadiendo hoja en blanco:', err);
      Swal.close();
      Swal.fire('Error', 'No se pudo añadir la hoja en blanco al PDF.', 'error');
    }
  }

  /**
   * Crea un nuevo documento PDF en blanco desde cero si no había ninguno abierto
   */
  async createNewBlankPdfDoc() {
    try {
      const doc = await window.PDFLib.PDFDocument.create();
      doc.addPage([595.28, 841.89]);
      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const file = new File([blob], 'Documento_Nuevo.pdf', { type: 'application/pdf' });

      if (window.docApp) {
        window.docApp.activePdfBlob = blob;
        window.docApp.setDocumentTitle('Documento_Nuevo');
        window.docApp.switchTab('open');
      }
      if (window.pdfViewer) {
        await window.pdfViewer.loadPdfFile(file);
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Inserta todas las páginas de un PDF externo al final del PDF actual
   */
  async appendExternalPdfToCurrentDoc(externalFile) {
    if (!window.docApp || !window.docApp.activePdfBlob) {
      // Si no había ningún PDF abierto, abrir este directamente
      if (window.pdfViewer) {
        await window.pdfViewer.loadPdfFile(externalFile);
      }
      return;
    }

    Swal.fire({
      title: 'Insertando páginas externas...',
      text: `Añadiendo "${externalFile.name}" al documento actual...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const currentBuffer = await window.docApp.activePdfBlob.arrayBuffer();
      const currentDoc = await window.PDFLib.PDFDocument.load(currentBuffer, { ignoreEncryption: true });

      const extBuffer = await externalFile.arrayBuffer();
      const extDoc = await window.PDFLib.PDFDocument.load(extBuffer, { ignoreEncryption: true });

      const copiedPages = await currentDoc.copyPages(extDoc, extDoc.getPageIndices());
      copiedPages.forEach(p => currentDoc.addPage(p));

      const newBytes = await currentDoc.save();
      const newBlob = new Blob([newBytes], { type: 'application/pdf' });
      const currentName = window.docApp.documentTitle || 'Documento';
      const updatedFile = new File([newBlob], `${currentName}.pdf`, { type: 'application/pdf' });

      window.docApp.activePdfBlob = newBlob;
      if (window.pdfViewer) {
        await window.pdfViewer.loadPdfFile(updatedFile);
      }

      Swal.close();

      Swal.fire({
        icon: 'success',
        title: '¡PDF Insertado con Éxito!',
        text: `Se añadieron ${copiedPages.length} página(s) de "${externalFile.name}" a este documento. Total actual: ${currentDoc.getPageCount()} páginas.`,
        confirmButtonColor: '#4f46e5'
      });

    } catch (err) {
      console.error('Error insertando PDF externo:', err);
      Swal.close();
      Swal.fire('Error', 'No se pudo insertar el archivo PDF externo.', 'error');
    }
  }

  // ==========================================
  // MODAL: ORGANIZADOR VISUAL DE PÁGINAS
  // ==========================================
  initOrganizerModalHandlers() {
    const closeBtns = document.querySelectorAll('.organizer-close-btn');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.pageOrganizerModal) this.pageOrganizerModal.classList.add('hidden');
      });
    });

    const modalAddBlankBtn = document.getElementById('modalAddBlankBtn');
    if (modalAddBlankBtn) {
      modalAddBlankBtn.addEventListener('click', async () => {
        await this.addBlankPageToCurrentDoc();
        this.openPageOrganizerModal(); // refrescar
      });
    }

    const modalAppendPdfBtn = document.getElementById('modalAppendPdfBtn');
    if (modalAppendPdfBtn) {
      modalAppendPdfBtn.addEventListener('click', () => {
        if (this.appendExternalPdfInput) this.appendExternalPdfInput.click();
      });
    }
  }

  openPageOrganizerModal() {
    if (!window.docApp || !window.docApp.activePdfBlob) {
      Swal.fire({
        icon: 'info',
        title: 'No hay ningún PDF abierto',
        text: 'Abre primero un archivo PDF para poder organizar, añadir o borrar sus hojas.'
      });
      return;
    }

    if (!this.pageOrganizerModal || !this.pageOrganizerGrid) return;

    this.renderOrganizerGrid();
    this.pageOrganizerModal.classList.remove('hidden');
    this.pageOrganizerModal.classList.add('flex');
  }

  renderOrganizerGrid() {
    const pageCards = document.querySelectorAll('.pdf-page-card');
    this.pageOrganizerGrid.innerHTML = '';

    if (pageCards.length === 0) {
      this.pageOrganizerGrid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
          <i class="fa-regular fa-file-lines text-4xl mb-2 opacity-50 block"></i>
          No hay páginas para mostrar.
        </div>
      `;
      return;
    }

    pageCards.forEach((card, idx) => {
      const pageNum = parseInt(card.getAttribute('data-page') || (idx + 1), 10);
      const canvas = card.querySelector('.pdf-page-canvas');
      const thumbUrl = canvas ? canvas.toDataURL('image/jpeg', 0.6) : '';

      const tile = document.createElement('div');
      tile.className = 'bg-white dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col group relative';
      tile.innerHTML = `
        <div class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between border-b border-slate-200 dark:border-slate-600">
          <span>Pág. ${idx + 1}</span>
          <div class="flex items-center gap-1">
            <button class="tile-rotate-btn text-slate-500 hover:text-primary-600 p-1" title="Rotar 90°">
              <i class="fa-solid fa-rotate-right text-xs"></i>
            </button>
            <button class="tile-delete-btn text-rose-500 hover:text-rose-700 p-1" title="Borrar esta hoja">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>

        <div class="p-2 aspect-[1/1.4] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
          ${thumbUrl ? `<img src="${thumbUrl}" class="max-w-full max-h-full object-contain shadow-sm border border-slate-200 rounded" alt="Miniatura Pág ${idx + 1}">` : '<i class="fa-regular fa-file-pdf text-3xl text-slate-400"></i>'}
        </div>

        <div class="px-2 py-1.5 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-700">
          <button class="tile-move-left-btn px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30" title="Mover antes" ${idx === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left text-[10px]"></i>
          </button>
          <span class="text-[10px] text-slate-400 font-mono">#${idx + 1}</span>
          <button class="tile-move-right-btn px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30" title="Mover después" ${idx === pageCards.length - 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      `;

      // Borrar página
      tile.querySelector('.tile-delete-btn').addEventListener('click', async () => {
        if (window.pdfEditor) {
          await window.pdfEditor.deletePage(pageNum);
          this.renderOrganizerGrid();
        }
      });

      // Rotar página
      tile.querySelector('.tile-rotate-btn').addEventListener('click', () => {
        if (window.pdfEditor) {
          window.pdfEditor.rotatePage(pageNum);
          this.renderOrganizerGrid();
        }
      });

      // Reordenar páginas
      tile.querySelector('.tile-move-left-btn').addEventListener('click', async () => {
        if (idx > 0) {
          await this.swapPagesInDocument(idx, idx - 1);
          this.renderOrganizerGrid();
        }
      });

      tile.querySelector('.tile-move-right-btn').addEventListener('click', async () => {
        if (idx < pageCards.length - 1) {
          await this.swapPagesInDocument(idx, idx + 1);
          this.renderOrganizerGrid();
        }
      });

      this.pageOrganizerGrid.appendChild(tile);
    });
  }

  /**
   * Intercambia dos páginas de posición en el documento
   */
  async swapPagesInDocument(idxA, idxB) {
    if (!window.docApp || !window.docApp.activePdfBlob) return;

    try {
      const buffer = await window.docApp.activePdfBlob.arrayBuffer();
      const doc = await window.PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });

      const count = doc.getPageCount();
      const indices = Array.from({ length: count }, (_, i) => i);
      const temp = indices[idxA];
      indices[idxA] = indices[idxB];
      indices[idxB] = temp;

      const newDoc = await window.PDFLib.PDFDocument.create();
      const copiedPages = await newDoc.copyPages(doc, indices);
      copiedPages.forEach(p => newDoc.addPage(p));

      const newBytes = await newDoc.save();
      const newBlob = new Blob([newBytes], { type: 'application/pdf' });
      const currentName = window.docApp.documentTitle || 'Documento';
      const updatedFile = new File([newBlob], `${currentName}.pdf`, { type: 'application/pdf' });

      window.docApp.activePdfBlob = newBlob;
      if (window.pdfViewer) {
        await window.pdfViewer.loadPdfFile(updatedFile);
      }
    } catch (e) {
      console.error('Error intercambiando páginas:', e);
    }
  }
}

// Inicializar globalmente
window.pdfMerger = new PdfMergerModule();
