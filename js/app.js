/**
 * OmniDoc Studio - Main Application Controller
 * Coordina la vista previa, generación de PDF, exportación y distribución (WhatsApp, Drive, OneDrive, Email, Imprimir).
 */

class OmniDocApp {
  constructor() {
    this.activeTab = 'open';
    this.uploadedImages = [];
    this.zoomLevel = 1.0;
    this.documentTitle = 'Documento_OmniDoc';
    this.activePdfBlob = null;

    this.initElements();
    this.initTheme();
    this.initTabNavigation();
    this.initGlobalOpener();
    this.initGlobalDragAndDrop();
    this.initImagesModule();
    this.initPreviewControls();
    this.initActionButtons();
    this.initModals();
    this.initShortcuts();

    // Actualizar fecha por defecto en encabezado
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const headerDateText = document.getElementById('headerDateText');
    if (headerDateText) headerDateText.textContent = `Fecha: ${today}`;
  }

  // ==========================================
  // APERTURA GLOBAL DE DOCUMENTOS (PDF, DOCX, XLSX, TXT)
  // ==========================================
  initGlobalOpener() {
    const openGlobalDocBtn = document.getElementById('openGlobalDocBtn');
    const globalDocFileInput = document.getElementById('globalDocFileInput');

    if (openGlobalDocBtn && globalDocFileInput) {
      openGlobalDocBtn.addEventListener('click', () => {
        globalDocFileInput.click();
      });

      globalDocFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          if (window.pdfViewer) {
            window.pdfViewer.handleUniversalFile(e.target.files[0]);
          }
        }
      });
    }
  }

  triggerOpenFileDialog() {
    const globalDocFileInput = document.getElementById('globalDocFileInput');
    if (globalDocFileInput) {
      globalDocFileInput.click();
    }
  }

  initGlobalDragAndDrop() {
    const overlay = document.getElementById('globalDropOverlay');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
      }
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (overlay) {
          overlay.classList.add('hidden');
          overlay.classList.remove('flex');
        }
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
      }
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        if (window.pdfViewer) {
          window.pdfViewer.handleUniversalFile(e.dataTransfer.files[0]);
        }
      }
    });
  }

  initElements() {
    // Visor y Preview
    this.printableArea = document.getElementById('pdfPrintableArea');
    this.previewBody = document.getElementById('previewBodyContent');
    this.previewMainTitle = document.getElementById('previewMainTitle');
    this.docTitlePreviewContainer = document.getElementById('docTitlePreviewContainer');
    this.docHeaderPreview = document.getElementById('docHeaderPreview');
    this.docFooterPreview = document.getElementById('docFooterPreview');
    this.headerBrandText = document.getElementById('headerBrandText');
    this.footerCustomText = document.getElementById('footerCustomText');
    this.docFileNameInput = document.getElementById('docFileName');
    this.docOrientationSelect = document.getElementById('docOrientation');
    this.docFormatSelect = document.getElementById('docFormat');

    // Escuchar cambios de nombre de documento
    if (this.docFileNameInput) {
      this.docFileNameInput.addEventListener('input', (e) => {
        this.documentTitle = e.target.value.trim() || 'Documento_OmniDoc';
        if (this.previewMainTitle && this.activeTab !== 'notes') {
          this.previewMainTitle.textContent = this.documentTitle;
        }
      });
    }

    // Escuchar cambio de orientación
    if (this.docOrientationSelect) {
      this.docOrientationSelect.addEventListener('change', () => {
        this.updatePageOrientation();
      });
    }
  }

  // ==========================================
  // TEMA (OSCURO / CLARO)
  // ==========================================
  initTheme() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('omnidoc_theme');

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('omnidoc_theme', isDark ? 'dark' : 'light');
      });
    }
  }

  // ==========================================
  // NAVEGACIÓN POR PESTAÑAS
  // ==========================================
  initTabNavigation() {
    const tabButtons = document.querySelectorAll('#sourceTabs .tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabKey) {
    this.activeTab = tabKey;

    // Actualizar botones de pestaña
    document.querySelectorAll('#sourceTabs .tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Ocultar todos los paneles y mostrar el activo
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.add('hidden');
    });

    const activePanel = document.getElementById(`tab-panel-${tabKey}`);
    if (activePanel) {
      activePanel.classList.remove('hidden');
    }

    // Refrescar visor según pestaña
    if (tabKey === 'open') {
      if (window.pdfViewer && window.pdfViewer.pdfDoc) {
        window.pdfViewer.renderPdfView();
      } else if (window.pdfViewer && window.pdfViewer.activeDocumentType === 'text') {
        window.pdfViewer.renderTextContent(window.pdfViewer.currentFile.name, window.pdfViewer.extractedText);
      }
    } else if (tabKey === 'images') {
      this.refreshImagesPreview();
    }
  }

  // ==========================================
  // MÓDULO DE IMÁGENES
  // ==========================================
  initImagesModule() {
    const imageDropZone = document.getElementById('imageDropZone');
    const imageInput = document.getElementById('imageInput');
    const imgFitMode = document.getElementById('imgFitMode');
    const imgMargin = document.getElementById('imgMargin');

    if (imageDropZone && imageInput) {
      imageDropZone.addEventListener('click', () => imageInput.click());
      imageInput.addEventListener('change', (e) => this.handleImageFiles(e.target.files));

      imageDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageDropZone.classList.add('dragover');
      });
      imageDropZone.addEventListener('dragleave', () => {
        imageDropZone.classList.remove('dragover');
      });
      imageDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageDropZone.classList.remove('dragover');
        if (e.dataTransfer.files) {
          this.handleImageFiles(e.dataTransfer.files);
        }
      });
    }

    if (imgFitMode) {
      imgFitMode.addEventListener('change', () => this.refreshImagesPreview());
    }
    if (imgMargin) {
      imgMargin.addEventListener('change', () => this.refreshImagesPreview());
    }
  }

  handleImageFiles(files) {
    if (!files || files.length === 0) return;

    let loadedCount = 0;
    const totalFiles = Array.from(files).filter(f => f.type.startsWith('image/')).length;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImages.push({
          id: Date.now() + Math.random().toString(36).substring(2, 7),
          name: file.name,
          dataUrl: e.target.result
        });

        loadedCount++;
        if (loadedCount === totalFiles) {
          this.updateImagesGallery();
          this.refreshImagesPreview();
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `${totalFiles} imagen(es) añadida(s)`,
            showConfirmButton: false,
            timer: 1800
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }

  updateImagesGallery() {
    const imagesList = document.getElementById('imagesList');
    const noImagesPlaceholder = document.getElementById('noImagesPlaceholder');
    const imgCountBadge = document.getElementById('imgCountBadge');

    if (!imagesList) return;

    if (this.uploadedImages.length === 0) {
      imagesList.innerHTML = '';
      if (noImagesPlaceholder) noImagesPlaceholder.classList.remove('hidden');
      if (imgCountBadge) imgCountBadge.textContent = '0 fotos';
      return;
    }

    if (noImagesPlaceholder) noImagesPlaceholder.classList.add('hidden');
    if (imgCountBadge) imgCountBadge.textContent = `${this.uploadedImages.length} fotos`;

    imagesList.innerHTML = '';
    this.uploadedImages.forEach((imgObj, idx) => {
      const card = document.createElement('div');
      card.className = 'relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 aspect-square flex items-center justify-center';
      card.innerHTML = `
        <img src="${imgObj.dataUrl}" alt="${imgObj.name}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
          <button class="delete-img-btn w-6 h-6 rounded bg-rose-600 text-white text-xs hover:bg-rose-700 flex items-center justify-center" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <span class="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded font-mono">${idx + 1}</span>
      `;

      card.querySelector('.delete-img-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.uploadedImages.splice(idx, 1);
        this.updateImagesGallery();
        this.refreshImagesPreview();
      });

      imagesList.appendChild(card);
    });
  }

  addCroppedSnippet(dataUrl) {
    this.uploadedImages.push({
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      name: 'Recorte_' + new Date().toLocaleTimeString(),
      dataUrl: dataUrl
    });
    this.updateImagesGallery();
    this.switchTab('images');
    this.refreshImagesPreview();
  }

  refreshImagesPreview() {
    if (this.activeTab !== 'images' && this.activeTab !== 'crop') return;

    this.docHeaderPreview.classList.add('hidden');
    this.docFooterPreview.classList.add('hidden');
    this.docTitlePreviewContainer.classList.remove('hidden');
    this.previewMainTitle.textContent = this.documentTitle;

    if (this.uploadedImages.length === 0) {
      this.previewBody.innerHTML = `
        <div class="text-center py-20 text-slate-400">
          <i class="fa-regular fa-image text-5xl mb-3 opacity-40"></i>
          <p class="font-medium text-base text-slate-600">No hay imágenes seleccionadas</p>
          <p class="text-xs text-slate-400 mt-1">Sube imágenes en el panel izquierdo o pega capturas con Ctrl+V.</p>
        </div>
      `;
      return;
    }

    const fitMode = document.getElementById('imgFitMode')?.value || 'single';
    const marginMode = document.getElementById('imgMargin')?.value || 'normal';

    let paddingClass = 'p-0';
    if (marginMode === 'normal') paddingClass = 'p-4';
    if (marginMode === 'compact') paddingClass = 'p-2';

    let html = '';

    if (fitMode === 'grid2') {
      html += `<div class="grid grid-cols-2 gap-4 ${paddingClass}">`;
      this.uploadedImages.forEach((img) => {
        html += `
          <div class="rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
            <img src="${img.dataUrl}" alt="${img.name}" class="w-full h-auto object-contain block">
          </div>
        `;
      });
      html += `</div>`;
    } else {
      // 1 por página o fit
      this.uploadedImages.forEach((img, idx) => {
        const pageBreakClass = (idx > 0 && fitMode === 'single') ? 'html2pdf__page-break pt-8 mt-8 border-t border-slate-200' : 'mb-6';
        html += `
          <div class="${pageBreakClass} ${paddingClass} text-center">
            <img src="${img.dataUrl}" alt="${img.name}" class="max-w-full h-auto mx-auto rounded shadow-sm border border-slate-100 object-contain max-h-[850px]">
            ${img.name ? `<p class="text-[11px] text-slate-400 mt-2 font-mono">${img.name}</p>` : ''}
          </div>
        `;
      });
    }

    this.previewBody.innerHTML = html;
  }

  // ==========================================
  // RENDERIZADO DE WORD
  // ==========================================
  renderWordContent(htmlContent) {
    this.docHeaderPreview.classList.add('hidden');
    this.docFooterPreview.classList.remove('hidden');
    this.docTitlePreviewContainer.classList.remove('hidden');
    this.previewMainTitle.textContent = this.documentTitle;

    this.previewBody.innerHTML = `
      <div class="word-doc-content prose max-w-none text-slate-800">
        ${htmlContent}
      </div>
    `;
  }

  // ==========================================
  // RENDERIZADO DE EXCEL
  // ==========================================
  renderExcelContent(sheetName, htmlTable) {
    this.docHeaderPreview.classList.remove('hidden');
    this.headerBrandText.textContent = `HOJA: ${sheetName.toUpperCase()}`;
    this.docFooterPreview.classList.remove('hidden');
    this.docTitlePreviewContainer.classList.remove('hidden');
    this.previewMainTitle.textContent = `${this.documentTitle} - [${sheetName}]`;

    this.previewBody.innerHTML = `
      <div class="mb-4">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <i class="fa-solid fa-table-cells"></i> Vista de Datos: ${sheetName}
        </span>
      </div>
      <div class="preview-table-container">
        ${htmlTable}
      </div>
    `;

    // Estilizar la tabla generada por SheetJS
    const table = this.previewBody.querySelector('table');
    if (table) {
      table.classList.add('preview-table');
    }
  }

  // ==========================================
  // RENDERIZADO DE NOTAS RÁPIDAS
  // ==========================================
  renderNoteContent({ title, content, header, footer }) {
    if (header) {
      this.docHeaderPreview.classList.remove('hidden');
      this.headerBrandText.textContent = header;
    } else {
      this.docHeaderPreview.classList.add('hidden');
    }

    if (footer) {
      this.docFooterPreview.classList.remove('hidden');
      this.footerCustomText.textContent = footer;
    } else {
      this.docFooterPreview.classList.add('hidden');
    }

    if (title && title.trim()) {
      this.docTitlePreviewContainer.classList.remove('hidden');
      this.previewMainTitle.textContent = title;
      this.documentTitle = title;
      if (this.docFileNameInput) this.docFileNameInput.value = title.replace(/\s+/g, '_');
    } else {
      this.docTitlePreviewContainer.classList.add('hidden');
    }

    // Convertir saltos de línea y formateo básico de markdown/texto a HTML
    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/g, '<u>$1</u>')
      .replace(/\n/g, '<br>');

    this.previewBody.innerHTML = `
      <div class="font-sans leading-relaxed text-slate-800 text-sm whitespace-pre-wrap">
        ${formatted || '<p class="text-slate-400 italic">Escribe en el panel izquierdo para ver tu documento redactado...</p>'}
      </div>
    `;
  }

  clearPreview() {
    this.previewBody.innerHTML = `
      <div class="text-center py-20 text-slate-400">
        <i class="fa-regular fa-file-lines text-5xl mb-3 opacity-40"></i>
        <p class="font-medium text-base text-slate-600">El lienzo está listo</p>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Selecciona una imagen, realiza un recorte, carga un Word/Excel o escribe una nota para ver el resultado en tiempo real.
        </p>
      </div>
    `;
    this.docHeaderPreview.classList.add('hidden');
    this.docFooterPreview.classList.add('hidden');
  }

  setDocumentTitle(title) {
    this.documentTitle = title;
    if (this.docFileNameInput) {
      this.docFileNameInput.value = title.replace(/\s+/g, '_');
    }
    if (this.previewMainTitle) {
      this.previewMainTitle.textContent = title;
    }
  }

  updatePageOrientation() {
    const orientation = this.docOrientationSelect?.value || 'portrait';
    if (orientation === 'landscape') {
      this.printableArea.style.width = '297mm';
      this.printableArea.style.minHeight = '210mm';
    } else {
      this.printableArea.style.width = '210mm';
      this.printableArea.style.minHeight = '297mm';
    }
  }

  // ==========================================
  // CONTROLES DE ZOOM EN VISTA PREVIA
  // ==========================================
  initPreviewControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomLevelText = document.getElementById('zoomLevelText');

    const updateZoom = () => {
      if (this.printableArea) {
        this.printableArea.style.transform = `scale(${this.zoomLevel})`;
      }
      if (zoomLevelText) {
        zoomLevelText.textContent = `${Math.round(this.zoomLevel * 100)}%`;
      }
    };

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (this.zoomLevel < 1.6) {
          this.zoomLevel += 0.1;
          updateZoom();
        }
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (this.zoomLevel > 0.5) {
          this.zoomLevel -= 0.1;
          updateZoom();
        }
      });
    }

    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        Swal.fire({
          title: '¿Crear nuevo documento?',
          text: 'Se limpiarán los documentos, imágenes y textos actuales.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#4f46e5',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Sí, limpiar todo',
          cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (result.isConfirmed) {
            this.uploadedImages = [];
            this.activePdfBlob = null;
            if (window.pdfViewer) window.pdfViewer.clear();
            this.updateImagesGallery();
            this.clearPreview();
            const noteContentInput = document.getElementById('noteContentInput');
            if (noteContentInput) noteContentInput.value = '';
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'info',
              title: 'Lienzo restablecido',
              showConfirmButton: false,
              timer: 1500
            });
          }
        });
      });
    }

    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        Swal.fire({
          title: 'OmniDoc Studio PRO',
          html: `
            <div class="text-left text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <p><strong>🎯 ¿Cómo funciona?</strong></p>
              <ul class="list-disc pl-4 space-y-1">
                <li><strong>📂 Abrir Documento (Ctrl+O):</strong> Abre directamente cualquier archivo PDF, Word, Excel o Texto para leerlo, navegar páginas o extraer su texto.</li>
                <li><strong>Imágenes:</strong> Sube fotos sueltas o múltiples y ordénalas como gustes.</li>
                <li><strong>Recorte & Captura:</strong> Usa <em>Win+Shift+S</em> para recortar algo en Windows y luego presiona <em>Ctrl+V</em> aquí para pegarlo al instante.</li>
                <li><strong>Word & Excel:</strong> Convierte archivos .docx o libros de cálculo a PDF sin salir del navegador.</li>
                <li><strong>Notas:</strong> Genera memorándums, recibos o cartas con firmas y membretes formales.</li>
                <li><strong>🖱️ Arrastrar y Soltar:</strong> Suelta cualquier archivo desde Windows en la ventana para abrirlo al instante.</li>
              </ul>
              <p class="pt-2"><strong>⚡ Botones de Acción:</strong></p>
              <ul class="list-disc pl-4 space-y-1">
                <li>🖨️ <strong>Imprimir:</strong> Salida a impresora física o Microsoft Print to PDF.</li>
                <li>📥 <strong>Descargar:</strong> Generación instantánea en alta resolución.</li>
                <li>🔗 <strong>Compartir:</strong> Menú nativo del sistema (Android / Windows / iOS).</li>
                <li>💬 <strong>WhatsApp & Correo:</strong> Envío ágil con un solo clic.</li>
                <li>☁️ <strong>Drive & OneDrive:</strong> Exportación a tu nube favorita.</li>
              </ul>
            </div>
          `,
          icon: 'info',
          confirmButtonText: 'Entendido'
        });
      });
    }
  }

  // ==========================================
  // ATAJOS DE TECLADO
  // ==========================================
  initShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl + O: Abrir Documento
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.triggerOpenFileDialog();
      }
      // Ctrl + P: Imprimir
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const fullPreview = document.getElementById('fullPreviewModal');
        if (fullPreview && !fullPreview.classList.contains('hidden')) {
          this.printFromFullPreview();
        } else {
          this.printDocument();
        }
      }
      // Ctrl + S: Guardar/Descargar PDF
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.generateAndDownloadPDF();
      }
    });
  }

  // ==========================================
  // GENERADOR DE PDF (HTML2PDF O BLOB DIRECTO)
  // ==========================================
  async getPdfBlob() {
    if (this.activePdfBlob) {
      return this.activePdfBlob;
    }

    const element = this.printableArea;
    const orientation = this.docOrientationSelect?.value || 'portrait';
    const format = this.docFormatSelect?.value || 'a4';

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `${this.documentTitle}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: format, orientation: orientation }
    };

    return html2pdf().set(opt).from(element).outputPdf('blob');
  }

  async generateAndDownloadPDF() {
    // Si ya es un PDF abierto, descargar el archivo original con fidelidad perfecta
    if (this.activePdfBlob) {
      const url = URL.createObjectURL(this.activePdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.documentTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Swal.fire({
        icon: 'success',
        title: '¡PDF Descargado con Éxito!',
        text: `Guardado como ${this.documentTitle}.pdf`,
        timer: 2000,
        showConfirmButton: false
      });
      return true;
    }

    Swal.fire({
      title: 'Generando PDF...',
      text: 'Procesando tu documento con máxima resolución',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const element = this.printableArea;
      const orientation = this.docOrientationSelect?.value || 'portrait';
      const format = this.docFormatSelect?.value || 'a4';

      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `${this.documentTitle}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: format, orientation: orientation }
      };

      await html2pdf().set(opt).from(element).save();

      Swal.fire({
        icon: 'success',
        title: '¡PDF Descargado con Éxito!',
        text: `Guardado como ${this.documentTitle}.pdf`,
        timer: 2000,
        showConfirmButton: false
      });
      return true;
    } catch (err) {
      console.error('Error generando PDF:', err);
      Swal.fire('Error', 'No se pudo generar el archivo PDF.', 'error');
      return false;
    }
  }

  // ==========================================
  // BOTONES DE ACCIÓN (Imprimir, Compartir, WhatsApp, Email, Drive, OneDrive)
  // ==========================================
  initActionButtons() {
    // 1. IMPRIMIR
    const actionPrintBtn = document.getElementById('actionPrintBtn');
    if (actionPrintBtn) {
      actionPrintBtn.addEventListener('click', () => this.printDocument());
    }

    // 2. DESCARGAR PDF
    const actionDownloadBtn = document.getElementById('actionDownloadBtn');
    if (actionDownloadBtn) {
      actionDownloadBtn.addEventListener('click', () => this.generateAndDownloadPDF());
    }

    // 3. COMPARTIR (Web Share API)
    const actionShareBtn = document.getElementById('actionShareBtn');
    if (actionShareBtn) {
      actionShareBtn.addEventListener('click', () => this.shareDocument());
    }

    // 4. WHATSAPP
    const actionWhatsAppBtn = document.getElementById('actionWhatsAppBtn');
    if (actionWhatsAppBtn) {
      actionWhatsAppBtn.addEventListener('click', () => this.openWhatsAppModal());
    }

    // 5. CORREO
    const actionEmailBtn = document.getElementById('actionEmailBtn');
    if (actionEmailBtn) {
      actionEmailBtn.addEventListener('click', () => this.openEmailModal());
    }

    // 6. GOOGLE DRIVE
    const actionDriveBtn = document.getElementById('actionDriveBtn');
    if (actionDriveBtn) {
      actionDriveBtn.addEventListener('click', () => this.openCloudModal('drive'));
    }

    // 7. ONEDRIVE
    const actionOneDriveBtn = document.getElementById('actionOneDriveBtn');
    if (actionOneDriveBtn) {
      actionOneDriveBtn.addEventListener('click', () => this.openCloudModal('onedrive'));
    }

    // 8. ACTUALIZAR VISTA PREVIA
    const actionCopyPreviewBtn = document.getElementById('actionCopyPreviewBtn');
    if (actionCopyPreviewBtn) {
      actionCopyPreviewBtn.addEventListener('click', () => {
        if (this.activeTab === 'images') this.refreshImagesPreview();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Vista previa actualizada',
          showConfirmButton: false,
          timer: 1500
        });
      });
    }

    // 9. VER TODO / IMPRIMIR (Full Preview)
    const actionFullPreviewBtn = document.getElementById('actionFullPreviewBtn');
    if (actionFullPreviewBtn) {
      actionFullPreviewBtn.addEventListener('click', () => this.openFullPreview());
    }
  }

  // ==========================================
  // ACCIÓN: IMPRIMIR
  // ==========================================
  printDocument() {
    // Disparar la impresión nativa del navegador con las reglas @media print de styles.css
    window.print();
  }

  // ==========================================
  // ACCIÓN: COMPARTIR (WEB SHARE API)
  // ==========================================
  async shareDocument() {
    try {
      if (navigator.share) {
        Swal.fire({
          title: 'Preparando archivo...',
          text: 'Empaquetando documento PDF para compartir',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const blob = await this.getPdfBlob();
        const file = new File([blob], `${this.documentTitle}.pdf`, { type: 'application/pdf' });

        Swal.close();

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: this.documentTitle,
            text: 'Te comparto este documento en PDF generado con OmniDoc Studio.',
            files: [file]
          });
        } else {
          await navigator.share({
            title: this.documentTitle,
            text: `Documento PDF: ${this.documentTitle}`
          });
        }
      } else {
        // Fallback si el navegador de escritorio no soporta navigator.share
        Swal.fire({
          title: 'Compartir Documento',
          text: 'Tu navegador no cuenta con el menú nativo de compartir móvil. Puedes descargarlo o enviarlo directo por WhatsApp y Correo con los botones contiguos.',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Descargar PDF ahora',
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed) {
            this.generateAndDownloadPDF();
          }
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error al compartir:', err);
      }
    }
  }

  // ==========================================
  // ACCIÓN: MODALES (EMAIL, WHATSAPP, NUBE)
  // ==========================================
  initModals() {
    // Cerrar cualquier modal
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#emailModal, #whatsappModal, #cloudModal').forEach(m => m.classList.add('hidden'));
      });
    });

    // Elegir WhatsApp Web o un número específico.
    const whatsappDestinationSelect = document.getElementById('whatsappDestinationSelect');
    if (whatsappDestinationSelect) {
      whatsappDestinationSelect.addEventListener('change', () => {
        const phoneField = document.getElementById('whatsappPhoneField');
        if (phoneField) phoneField.classList.toggle('hidden', whatsappDestinationSelect.value !== 'phone');
      });
    }

    // Enviar Correo Confirmación a Gmail
    const sendEmailConfirmBtn = document.getElementById('sendEmailConfirmBtn');
    if (sendEmailConfirmBtn) {
      sendEmailConfirmBtn.addEventListener('click', async () => {
        const to = document.getElementById('emailToInput').value.trim();
        const subject = encodeURIComponent(document.getElementById('emailSubjectInput').value.trim());
        const body = encodeURIComponent(document.getElementById('emailBodyInput').value.trim());

        if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
          Swal.fire('Correo no válido', 'Escribe una dirección de correo válida o deja el campo vacío.', 'warning');
          return;
        }

        // Gmail solicita inicio de sesión en su propio sitio si aún no hay una cuenta activa.
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${subject}&body=${body}`;
        const gmailWindow = window.open(gmailUrl, '_blank');
        document.getElementById('emailModal').classList.add('hidden');

        // Gmail no acepta adjuntos desde un enlace web: el usuario añade el PDF descargado.
        const generated = await this.generateAndDownloadPDF();
        if (!generated && gmailWindow) gmailWindow.close();
      });
    }

    // Enviar WhatsApp Confirmación
    const sendWhatsAppConfirmBtn = document.getElementById('sendWhatsAppConfirmBtn');
    if (sendWhatsAppConfirmBtn) {
      sendWhatsAppConfirmBtn.addEventListener('click', async () => {
        const destination = document.getElementById('whatsappDestinationSelect').value;
        const phone = document.getElementById('whatsappNumberInput').value.replace(/[^0-9]/g, '');
        const message = encodeURIComponent(document.getElementById('whatsappMessageInput').value.trim());

        if (destination === 'phone' && (phone.length < 8 || phone.length > 15)) {
          Swal.fire('Número no válido', 'Escribe el número completo con código de país (de 8 a 15 dígitos).', 'warning');
          return;
        }

        // WhatsApp solicita vincular/iniciar sesión en su sitio oficial si hace falta.
        let waUrl = 'https://web.whatsapp.com/';
        if (destination === 'phone') {
          waUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;
        } else if (message) {
          waUrl = `https://web.whatsapp.com/send?text=${message}`;
        }
        const whatsAppWindow = window.open(waUrl, '_blank');
        document.getElementById('whatsappModal').classList.add('hidden');

        // WhatsApp requiere que el usuario adjunte el PDF descargado manualmente.
        const generated = await this.generateAndDownloadPDF();
        if (!generated && whatsAppWindow) whatsAppWindow.close();
      });
    }
  }

  openEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
      const subjectInput = document.getElementById('emailSubjectInput');
      if (subjectInput) subjectInput.value = `Envío de Documento: ${this.documentTitle}`;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  openWhatsAppModal() {
    const modal = document.getElementById('whatsappModal');
    if (modal) {
      const msgInput = document.getElementById('whatsappMessageInput');
      const destinationSelect = document.getElementById('whatsappDestinationSelect');
      const phoneField = document.getElementById('whatsappPhoneField');
      if (msgInput) msgInput.value = `Hola! Te comparto el documento "${this.documentTitle}" en formato PDF.`;
      if (destinationSelect) destinationSelect.value = 'web';
      if (phoneField) phoneField.classList.add('hidden');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  // ==========================================
  // ACCIÓN: VER DOCUMENTO COMPLETO + IMPRIMIR
  // ==========================================
  async openFullPreview() {
    const modal     = document.getElementById('fullPreviewModal');
    const body      = document.getElementById('fullPreviewBody');
    const placeholder = document.getElementById('fullPreviewPlaceholder');
    const titleEl   = document.getElementById('fullPreviewDocTitle');
    const countEl   = document.getElementById('fullPreviewPageCount');
    const zoomLvl   = document.getElementById('fpZoomLevel');

    if (!modal) return;

    // ---- 1. Mostrar el modal con spinner ----
    body.innerHTML = '';                     // limpiar renders anteriores
    body.appendChild(placeholder);
    placeholder.classList.remove('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    titleEl.textContent = this.documentTitle || 'Documento';

    // ---- 2. Variables de zoom ----
    let fpZoom = 1.0;
    const FP_ZOOM_STEP = 0.15;
    const FP_ZOOM_MIN  = 0.4;
    const FP_ZOOM_MAX  = 2.5;

    const applyZoom = () => {
      zoomLvl.textContent = Math.round(fpZoom * 100) + '%';
      document.querySelectorAll('.fp-page-wrapper').forEach(w => {
        w.style.width = (w.dataset.baseW * fpZoom) + 'px';
      });
    };

    // ---- 3. Renderizar páginas ----
    try {
      const hasPdf = window.pdfViewer && window.pdfViewer.pdfDoc;
      const hasBlob = this.activePdfBlob instanceof Blob;

      if (hasPdf || hasBlob) {
        // — Modo PDF: re-renderizar todas las páginas a alta res —
        let pdfDoc = null;

        if (hasPdf) {
          pdfDoc = window.pdfViewer.pdfDoc;
        } else {
          // Cargar desde el blob
          const url = URL.createObjectURL(this.activePdfBlob);
          pdfDoc = await pdfjsLib.getDocument(url).promise;
        }

        const total = pdfDoc.numPages;
        countEl.textContent = `${total} página${total !== 1 ? 's' : ''}`;
        placeholder.classList.add('hidden');

        const RENDER_SCALE = 1.8;  // Alta resolución
        const BASE_WIDTH   = 680;  // px a zoom 1.0

        for (let pageNum = 1; pageNum <= total; pageNum++) {
          const page      = await pdfDoc.getPage(pageNum);
          const viewport  = page.getViewport({ scale: RENDER_SCALE });

          const canvas    = document.createElement('canvas');
          canvas.width    = viewport.width;
          canvas.height   = viewport.height;

          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Proporción real de la página
          const ratio   = viewport.height / viewport.width;
          const baseH   = Math.round(BASE_WIDTH * ratio);

          const wrapper = document.createElement('div');
          wrapper.className = 'fp-page-wrapper';
          wrapper.dataset.baseW = BASE_WIDTH;
          wrapper.style.width  = (BASE_WIDTH * fpZoom) + 'px';

          canvas.style.width  = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';

          const label = document.createElement('span');
          label.className = 'fp-page-label';
          label.textContent = `Pág. ${pageNum} / ${total}`;

          wrapper.appendChild(canvas);
          wrapper.appendChild(label);
          body.appendChild(wrapper);
        }

      } else {
        // — Modo No-PDF: mostrar el área de impresión actual —
        const printable = document.getElementById('pdfPrintableArea');
        placeholder.classList.add('hidden');

        if (printable) {
          const clone = printable.cloneNode(true);
          const wrapper = document.createElement('div');
          wrapper.className = 'fp-page-wrapper bg-white p-8';
          wrapper.dataset.baseW = 680;
          wrapper.style.width = (680 * fpZoom) + 'px';
          wrapper.style.minHeight = '900px';
          wrapper.appendChild(clone);
          body.appendChild(wrapper);
          countEl.textContent = '1 página';
        } else {
          countEl.textContent = 'Sin documento';
          const msg = document.createElement('p');
          msg.className = 'text-slate-400 text-sm mt-8';
          msg.textContent = 'Abre un documento primero para poder ver la vista completa.';
          body.appendChild(msg);
        }
      }

    } catch (err) {
      console.error('openFullPreview error:', err);
      placeholder.classList.add('hidden');
      const errMsg = document.createElement('p');
      errMsg.className = 'text-rose-400 text-sm mt-8';
      errMsg.textContent = 'Error al cargar la vista completa: ' + err.message;
      body.appendChild(errMsg);
    }

    // ---- 4. Botones de zoom ----
    const fpZoomIn  = document.getElementById('fpZoomIn');
    const fpZoomOut = document.getElementById('fpZoomOut');

    // Clonar para eliminar listeners antiguos
    if (fpZoomIn) {
      const newIn = fpZoomIn.cloneNode(true);
      fpZoomIn.parentNode.replaceChild(newIn, fpZoomIn);
      newIn.addEventListener('click', () => {
        fpZoom = Math.min(FP_ZOOM_MAX, fpZoom + FP_ZOOM_STEP);
        applyZoom();
      });
    }
    if (fpZoomOut) {
      const newOut = fpZoomOut.cloneNode(true);
      fpZoomOut.parentNode.replaceChild(newOut, fpZoomOut);
      newOut.addEventListener('click', () => {
        fpZoom = Math.max(FP_ZOOM_MIN, fpZoom - FP_ZOOM_STEP);
        applyZoom();
      });
    }

    // ---- 5. Botón Imprimir ----
    const fpPrintBtn = document.getElementById('fpPrintBtn');
    if (fpPrintBtn) {
      const newPrint = fpPrintBtn.cloneNode(true);
      fpPrintBtn.parentNode.replaceChild(newPrint, fpPrintBtn);
      newPrint.addEventListener('click', () => this.printFromFullPreview());
    }

    // ---- 6. Botón Cerrar ----
    const fpCloseBtn = document.getElementById('fpCloseBtn');
    if (fpCloseBtn) {
      const newClose = fpCloseBtn.cloneNode(true);
      fpCloseBtn.parentNode.replaceChild(newClose, fpCloseBtn);
      newClose.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });
    }

    // ---- 7. Tecla Escape ----
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ==========================================
  // IMPRIMIR DESDE LA VISTA COMPLETA
  // ==========================================
  async printFromFullPreview() {
    // Si hay un PDF blob, abrirlo en una pestaña/iframe y llamar print()
    // para impresión nativa limpia sin UI de la app
    if (this.activePdfBlob instanceof Blob) {
      const blobUrl = URL.createObjectURL(this.activePdfBlob);

      // Creamos un iframe temporal oculto para no abrir pestaña nueva
      let iframe = document.getElementById('_fp_print_iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = '_fp_print_iframe';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
        document.body.appendChild(iframe);
      }

      iframe.src = blobUrl;
      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          // Fallback: ventana nueva
          const win = window.open(blobUrl, '_blank');
          if (win) {
            win.onload = () => { win.focus(); win.print(); };
          }
        }
        // Liberar el blob URL después de un momento
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      };

    } else if (window.pdfViewer && window.pdfViewer.pdfDoc) {
      // PDF cargado desde pdfViewer pero sin blob: usar window.print()
      window.print();
    } else {
      // Documento no-PDF: imprimir via window.print()
      window.print();
    }
  }

  openCloudModal(service) {
    const modal = document.getElementById('cloudModal');
    const title = document.getElementById('cloudModalTitle');
    const icon = document.getElementById('cloudModalIcon');
    const instructions = document.getElementById('cloudModalInstructions');
    const fileName = document.getElementById('cloudModalFileName');
    const actionBtn = document.getElementById('cloudModalActionBtn');

    if (!modal) return;

    fileName.textContent = `${this.documentTitle}.pdf`;

    if (service === 'drive') {
      title.querySelector('span').textContent = 'Guardar en Google Drive';
      icon.className = 'fa-brands fa-google-drive text-amber-500 text-xl';
      instructions.innerHTML = `
        <div class="space-y-2">
          <p class="font-semibold text-slate-800 dark:text-white">Abrir Google Drive e iniciar sesión:</p>
          <ol class="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300">
            <li>Al hacer clic abajo, se descargará <strong>${this.documentTitle}.pdf</strong> automáticamente.</li>
            <li>Se abrirá <strong>Google Drive</strong>. Inicia sesión si te lo solicita.</li>
            <li>Solo arrastra el archivo descargado a tu Drive o haz clic en <em>"Nuevo > Subir archivo"</em>.</li>
          </ol>
        </div>
      `;
      actionBtn.onclick = async () => {
        const cloudWindow = window.open('https://drive.google.com/drive/my-drive', '_blank');
        modal.classList.add('hidden');
        const generated = await this.generateAndDownloadPDF();
        if (!generated && cloudWindow) cloudWindow.close();
      };
    } else {
      title.querySelector('span').textContent = 'Guardar en Microsoft OneDrive';
      icon.className = 'fa-solid fa-cloud text-sky-500 text-xl';
      instructions.innerHTML = `
        <div class="space-y-2">
          <p class="font-semibold text-slate-800 dark:text-white">Abrir OneDrive e iniciar sesión:</p>
          <ol class="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300">
            <li>Se descargará <strong>${this.documentTitle}.pdf</strong> en tu carpeta de Descargas.</li>
            <li>Se abrirá <strong>OneDrive</strong>. Inicia sesión si te lo solicita.</li>
            <li>Arrastra el PDF a tus carpetas en la nube de Microsoft.</li>
          </ol>
        </div>
      `;
      actionBtn.onclick = async () => {
        const cloudWindow = window.open('https://onedrive.live.com/', '_blank');
        modal.classList.add('hidden');
        const generated = await this.generateAndDownloadPDF();
        if (!generated && cloudWindow) cloudWindow.close();
      };
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

// Inicialización de la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  window.docApp = new OmniDocApp();
});
