/**
 * OmniDoc Studio - PDF Editor Module
 * Permite editar documentos PDF:
 * - Borrar / Tapar contenido (Whiteout / Recuadro blanco o censor negro)
 * - Añadir texto nuevo con tipografía y color
 * - Dibujar y firmar a mano alzada
 * - Resaltador translúcido
 * - Insertar sellos rápidos (Aprobado, Pagado, Anulado, etc.)
 * - Eliminar y rotar páginas
 * - Deshacer / Rehacer (Ctrl+Z)
 * - Guardado y exportación de alta fidelidad con PDFLib
 */

class PdfEditorModule {
  constructor() {
    this.isEditorActive = false;
    this.activeTool = 'pan'; // 'pan' | 'whiteout' | 'text' | 'draw' | 'highlighter' | 'stamp'
    this.currentColor = '#ffffff'; // Por defecto blanco para borrador
    this.currentSize = 8;
    this.currentFontSize = 16;
    this.activeStampType = 'APROBADO';

    // Almacén de ediciones por página:
    // pageNum => { history: [], redoList: [], textElements: [], rotation: 0, deleted: false }
    this.pageEdits = {};

    // Estado del cursor de dibujo
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.currentPath = [];
    this.activeDrawingPage = null;

    // Referencias al DOM
    this.toolbar = document.getElementById('pdfEditorToolbar');
    this.toggleBtn = document.getElementById('togglePdfEditorModeBtn');
    this.colorPicker = document.getElementById('pdfToolColorPicker');
    this.sizePicker = document.getElementById('pdfToolSizePicker');
    this.sizeSelect = document.getElementById('pdfToolSizeSelect');
    this.undoBtn = document.getElementById('pdfUndoBtn');
    this.redoBtn = document.getElementById('pdfRedoBtn');
    this.saveEditsBtn = document.getElementById('pdfSaveEditsBtn');

    this.init();
  }

  init() {
    this.initToolbarHandlers();
    this.initKeyboardShortcuts();
  }

  initToolbarHandlers() {
    // Botón para alternar modo edición en el panel izquierdo
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.toggleEditorMode();
      });
    }

    // Botones de herramientas del toolbar
    const toolButtons = document.querySelectorAll('#pdfToolGroup .pdf-edit-tool-btn');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        this.setTool(tool);
      });
    });

    // Paleta de colores
    const colorButtons = document.querySelectorAll('.pdf-color-btn');
    colorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        this.setColor(color);
      });
    });

    // Selector de grosor / tamaño
    if (this.sizeSelect) {
      this.sizeSelect.addEventListener('change', (e) => {
        this.currentSize = parseInt(e.target.value, 10) || 4;
      });
    }

    // Deshacer / Rehacer
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => this.undo());
    }
    if (this.redoBtn) {
      this.redoBtn.addEventListener('click', () => this.redo());
    }

    // Guardar PDF editado
    if (this.saveEditsBtn) {
      this.saveEditsBtn.addEventListener('click', () => this.saveEditedPdf());
    }
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!this.isEditorActive) return;

      // Ctrl + Z: Deshacer
      if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        // Si no está escribiendo en un input
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          this.undo();
        }
      }
      // Ctrl + Y o Ctrl + Shift + Z: Rehacer
      if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          this.redo();
        }
      }
    });
  }

  /**
   * Activa o desactiva la barra de herramientas de edición
   */
  toggleEditorMode(forceState = null) {
    if (forceState !== null) {
      this.isEditorActive = forceState;
    } else {
      this.isEditorActive = !this.isEditorActive;
    }

    if (this.toolbar) {
      if (this.isEditorActive) {
        this.toolbar.classList.remove('hidden');
        this.toolbar.classList.add('flex');
        // Por defecto activar la herramienta de Borrador / Tapar
        this.setTool('whiteout');
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'Modo Edición Activado',
          text: 'Selecciona "Borrar / Tapar" para eliminar texto o "Añadir Texto" para escribir.',
          showConfirmButton: false,
          timer: 2500
        });
      } else {
        this.toolbar.classList.add('hidden');
        this.toolbar.classList.remove('flex');
        this.setTool('pan');
      }
    }

    if (this.toggleBtn) {
      if (this.isEditorActive) {
        this.toggleBtn.innerHTML = `
          <i class="fa-solid fa-check text-sm text-emerald-300"></i>
          <span>Modo Edición Activado (Cerrar)</span>
        `;
        this.toggleBtn.classList.add('ring-2', 'ring-emerald-400');
      } else {
        this.toggleBtn.innerHTML = `
          <i class="fa-solid fa-pen-ruler text-sm"></i>
          <span>Editar PDF (Borrar, Añadir Texto, Firmar)</span>
        `;
        this.toggleBtn.classList.remove('ring-2', 'ring-emerald-400');
      }
    }

    // Actualizar cursores de las páginas
    this.updateCanvasCursors();
  }

  /**
   * Cambia la herramienta activa
   */
  setTool(toolName) {
    this.activeTool = toolName;

    // Actualizar clases activas en los botones de herramienta
    document.querySelectorAll('#pdfToolGroup .pdf-edit-tool-btn').forEach(btn => {
      if (btn.getAttribute('data-tool') === toolName) {
        btn.classList.add('active', 'bg-primary-600', 'text-white');
      } else {
        btn.classList.remove('active', 'bg-primary-600', 'text-white');
      }
    });

    // Ajustar color por defecto según la herramienta
    if (toolName === 'whiteout') {
      this.setColor('#ffffff'); // Blanco para borrar
    } else if (toolName === 'highlighter') {
      this.setColor('#f59e0b'); // Amarillo ámbar
      this.setSize(20);
    } else if (toolName === 'draw') {
      if (this.currentColor === '#ffffff') this.setColor('#2563eb'); // Azul para firmas
      this.setSize(3);
    } else if (toolName === 'text') {
      if (this.currentColor === '#ffffff') this.setColor('#000000'); // Negro para texto
    } else if (toolName === 'stamp') {
      this.promptSelectStamp();
    }

    this.updateCanvasCursors();
  }

  setColor(hex) {
    this.currentColor = hex;
    document.querySelectorAll('.pdf-color-btn').forEach(btn => {
      if (btn.getAttribute('data-color').toLowerCase() === hex.toLowerCase()) {
        btn.classList.add('ring-2', 'ring-primary-400', 'scale-110');
      } else {
        btn.classList.remove('ring-2', 'ring-primary-400', 'scale-110');
      }
    });
  }

  setSize(size) {
    this.currentSize = size;
    if (this.sizeSelect) {
      this.sizeSelect.value = size.toString();
    }
  }

  async promptSelectStamp() {
    const { value: stamp } = await Swal.fire({
      title: 'Selecciona un Sello para Insertar',
      input: 'select',
      inputOptions: {
        'APROBADO': '✅ APROBADO (Verde)',
        'PAGADO': '💰 PAGADO (Azul)',
        'ANULADO': '❌ ANULADO / RECHAZADO (Rojo)',
        'CONFIDENCIAL': '🔒 CONFIDENCIAL (Naranja)',
        'COPIA': '📄 COPIA CERTIFICADA (Gris)',
        'URGENTE': '⚡ URGENTE (Púrpura)'
      },
      inputPlaceholder: 'Elige un sello...',
      showCancelButton: true,
      confirmButtonText: 'Seleccionar Sello',
      cancelButtonText: 'Cancelar'
    });

    if (stamp) {
      this.activeStampType = stamp;
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Sello "${stamp}" listo`,
        text: 'Haz clic en cualquier parte de la página para colocarlo.',
        showConfirmButton: false,
        timer: 2000
      });
    } else {
      this.setTool('pan');
    }
  }

  updateCanvasCursors() {
    const editCanvases = document.querySelectorAll('.pdf-edit-canvas');
    editCanvases.forEach(canvas => {
      if (!this.isEditorActive || this.activeTool === 'pan') {
        canvas.style.cursor = 'default';
        canvas.style.pointerEvents = 'none';
      } else if (this.activeTool === 'text') {
        canvas.style.cursor = 'text';
        canvas.style.pointerEvents = 'auto';
      } else if (this.activeTool === 'whiteout') {
        canvas.style.cursor = 'crosshair';
        canvas.style.pointerEvents = 'auto';
      } else {
        canvas.style.cursor = 'crosshair';
        canvas.style.pointerEvents = 'auto';
      }
    });
  }

  /**
   * Se ejecuta al renderizar cada página del PDF para acoplar la capa de edición interactiva
   */
  attachPageEditLayers(pageCard, pageNum) {
    // Inicializar estado de página si no existe
    if (!this.pageEdits[pageNum]) {
      this.pageEdits[pageNum] = {
        history: [],
        redoList: [],
        textElements: [],
        rotation: 0,
        deleted: false
      };
    }

    const baseCanvas = pageCard.querySelector('.pdf-page-canvas');
    if (!baseCanvas) return;

    // Crear contenedor de envoltura si no existe
    let wrapper = pageCard.querySelector('.pdf-page-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper relative mx-auto select-none overflow-hidden';
      baseCanvas.parentNode.insertBefore(wrapper, baseCanvas);
      wrapper.appendChild(baseCanvas);
    }

    // Configurar dimensiones
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = `${baseCanvas.width}px`;

    // 1. Capa Canvas de Edición (Dibujo, Borrador blanco, Resaltador)
    let editCanvas = wrapper.querySelector('.pdf-edit-canvas');
    if (!editCanvas) {
      editCanvas = document.createElement('canvas');
      editCanvas.className = 'pdf-edit-canvas absolute inset-0 w-full h-full';
      editCanvas.width = baseCanvas.width;
      editCanvas.height = baseCanvas.height;
      wrapper.appendChild(editCanvas);

      this.bindCanvasEvents(editCanvas, pageNum);
    } else {
      editCanvas.width = baseCanvas.width;
      editCanvas.height = baseCanvas.height;
    }

    // 2. Capa de Elementos HTML (Cajas de texto editables, sellos)
    let elementsLayer = wrapper.querySelector('.pdf-elements-layer');
    if (!elementsLayer) {
      elementsLayer = document.createElement('div');
      elementsLayer.className = 'pdf-elements-layer absolute inset-0 pointer-events-none overflow-hidden';
      wrapper.appendChild(elementsLayer);
    }

    // 3. Barra de herramientas individual de página (Eliminar página, Rotar 90°)
    let pageToolbar = pageCard.querySelector('.pdf-page-toolbar');
    if (!pageToolbar) {
      const topBar = pageCard.querySelector('div.bg-slate-100, div.dark\\:bg-slate-800');
      if (topBar) {
        topBar.classList.add('pdf-page-toolbar');
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex items-center gap-1.5 print:hidden';
        actionsDiv.innerHTML = `
          <button class="rotate-page-btn px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition" title="Girar página 90°">
            <i class="fa-solid fa-rotate-right"></i> Rotar
          </button>
          <button class="delete-page-btn px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 transition" title="Eliminar esta página del documento">
            <i class="fa-solid fa-trash-can"></i> Borrar Pág.
          </button>
        `;

        actionsDiv.querySelector('.rotate-page-btn').addEventListener('click', () => {
          this.rotatePage(pageNum);
        });

        actionsDiv.querySelector('.delete-page-btn').addEventListener('click', () => {
          this.deletePage(pageNum);
        });

        topBar.appendChild(actionsDiv);
      }
    }

    // Redibujar ediciones existentes de esta página si hubiese
    this.redrawPageEdits(pageNum);
    this.updateCanvasCursors();
  }

  bindCanvasEvents(canvas, pageNum) {
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
        cssX: clientX - rect.left,
        cssY: clientY - rect.top
      };
    };

    const startAction = (e) => {
      if (!this.isEditorActive || this.activeTool === 'pan') return;
      e.preventDefault();

      const pos = getPos(e);
      this.isDrawing = true;
      this.startX = pos.x;
      this.startY = pos.y;
      this.activeDrawingPage = pageNum;

      if (this.activeTool === 'whiteout') {
        // Iniciar recuadro de borrado / whiteout
        this.currentPath = [{ x: pos.x, y: pos.y }];
      } else if (['draw', 'highlighter'].includes(this.activeTool)) {
        this.currentPath = [{ x: pos.x, y: pos.y }];
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      } else if (this.activeTool === 'text') {
        // Clic para añadir caja de texto
        this.isDrawing = false;
        this.addTextBox(pageNum, pos.cssX, pos.cssY);
      } else if (this.activeTool === 'stamp') {
        // Clic para colocar sello
        this.isDrawing = false;
        this.addStamp(pageNum, pos.cssX, pos.cssY, this.activeStampType);
      }
    };

    const moveAction = (e) => {
      if (!this.isDrawing || this.activeDrawingPage !== pageNum) return;
      e.preventDefault();

      const pos = getPos(e);
      const ctx = canvas.getContext('2d');

      if (this.activeTool === 'whiteout') {
        // Previsualizar el recuadro blanco que tapará/borrará
        this.redrawPageEdits(pageNum);
        const w = pos.x - this.startX;
        const h = pos.y - this.startY;

        ctx.save();
        ctx.fillStyle = this.currentColor;
        ctx.globalAlpha = 0.95;
        ctx.fillRect(this.startX, this.startY, w, h);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(this.startX, this.startY, w, h);
        ctx.restore();

      } else if (['draw', 'highlighter'].includes(this.activeTool)) {
        this.currentPath.push({ x: pos.x, y: pos.y });

        ctx.save();
        if (this.activeTool === 'highlighter') {
          ctx.strokeStyle = this.currentColor;
          ctx.lineWidth = Math.max(this.currentSize * 2.5, 18);
          ctx.globalAlpha = 0.35;
          ctx.lineCap = 'square';
          ctx.lineJoin = 'bevel';
        } else {
          ctx.strokeStyle = this.currentColor;
          ctx.lineWidth = this.currentSize;
          ctx.globalAlpha = 1.0;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }

        const prev = this.currentPath[this.currentPath.length - 2];
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();
      }
    };

    const endAction = (e) => {
      if (!this.isDrawing || this.activeDrawingPage !== pageNum) return;
      this.isDrawing = false;

      const pageData = this.pageEdits[pageNum];

      if (this.activeTool === 'whiteout') {
        const lastPos = this.currentPath[this.currentPath.length - 1];
        if (!lastPos) return;

        let x = Math.min(this.startX, lastPos.x);
        let y = Math.min(this.startY, lastPos.y);
        let w = Math.abs(lastPos.x - this.startX);
        let h = Math.abs(lastPos.y - this.startY);

        // Si el usuario solo hizo un clic pequeño, dar un tamaño por defecto
        if (w < 6 && h < 6) {
          w = 120;
          h = 30;
        }

        pageData.history.push({
          type: 'rect',
          x,
          y,
          w,
          h,
          color: this.currentColor
        });
        pageData.redoList = [];

        this.redrawPageEdits(pageNum);

      } else if (['draw', 'highlighter'].includes(this.activeTool)) {
        if (this.currentPath.length > 1) {
          pageData.history.push({
            type: this.activeTool,
            points: [...this.currentPath],
            color: this.currentColor,
            size: this.currentSize
          });
          pageData.redoList = [];
        }
        this.redrawPageEdits(pageNum);
      }

      this.currentPath = [];
      this.activeDrawingPage = null;
    };

    // Eventos Mouse
    canvas.addEventListener('mousedown', startAction);
    window.addEventListener('mousemove', moveAction);
    window.addEventListener('mouseup', endAction);

    // Eventos Táctiles (móviles y tablets)
    canvas.addEventListener('touchstart', startAction, { passive: false });
    window.addEventListener('touchmove', moveAction, { passive: false });
    window.addEventListener('touchend', endAction);
  }

  /**
   * Redibuja todas las anotaciones, borrados y trazos de una página
   */
  redrawPageEdits(pageNum) {
    const pageCard = document.getElementById(`pdf-page-${pageNum}`);
    if (!pageCard) return;

    const canvas = pageCard.querySelector('.pdf-edit-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageData = this.pageEdits[pageNum];
    if (!pageData || !pageData.history) return;

    pageData.history.forEach(item => {
      ctx.save();
      if (item.type === 'rect') {
        // Borrador / Whiteout / Tapar
        ctx.fillStyle = item.color || '#ffffff';
        ctx.fillRect(item.x, item.y, item.w, item.h);
      } else if (item.type === 'draw') {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.size || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        item.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (item.type === 'highlighter') {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = Math.max((item.size || 8) * 2.5, 18);
        ctx.globalAlpha = 0.35;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'bevel';
        ctx.beginPath();
        item.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  /**
   * Añade una caja de texto interactiva y editable directamente en la página
   */
  addTextBox(pageNum, cssX, cssY, defaultText = '') {
    const pageCard = document.getElementById(`pdf-page-${pageNum}`);
    if (!pageCard) return;

    const layer = pageCard.querySelector('.pdf-elements-layer');
    if (!layer) return;

    const id = 'text-item-' + Date.now();
    const box = document.createElement('div');
    box.id = id;
    box.className = 'pdf-text-item pointer-events-auto absolute group z-20 transition-shadow';
    box.style.left = `${Math.max(cssX - 10, 5)}px`;
    box.style.top = `${Math.max(cssY - 10, 5)}px`;

    box.innerHTML = `
      <div class="pdf-text-controls opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 text-white rounded-lg px-2 py-1 text-[11px] mb-1 flex items-center gap-2 shadow-lg select-none">
        <span class="cursor-move text-slate-400 hover:text-white" title="Arrastrar para mover">
          <i class="fa-solid fa-arrows-up-down-left-right"></i>
        </span>
        <button class="font-size-up-btn hover:text-primary-300 font-bold" title="Aumentar tamaño"><i class="fa-solid fa-plus"></i></button>
        <button class="font-size-down-btn hover:text-primary-300 font-bold" title="Reducir tamaño"><i class="fa-solid fa-minus"></i></button>
        <button class="toggle-bg-btn text-slate-300 hover:text-white" title="Fondo blanco / Transparente">
          <i class="fa-solid fa-fill-drip"></i>
        </button>
        <button class="delete-textbox-btn text-rose-400 hover:text-rose-200" title="Eliminar texto">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
      <div contenteditable="true" class="pdf-editable-text px-2 py-1 rounded border-2 border-dashed border-primary-500 bg-white/95 text-slate-900 font-sans outline-none min-w-[120px] shadow-sm leading-normal" style="font-size: ${this.currentFontSize}px; color: ${this.currentColor === '#ffffff' ? '#000000' : this.currentColor};">
        ${defaultText || 'Escribe tu texto aquí...'}
      </div>
    `;

    const textInput = box.querySelector('.pdf-editable-text');
    let currentFontSize = this.currentFontSize;
    let hasBg = true;

    // Enfoque inmediato
    setTimeout(() => {
      textInput.focus();
      document.execCommand('selectAll', false, null);
    }, 50);

    // Controles
    box.querySelector('.font-size-up-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      currentFontSize = Math.min(currentFontSize + 2, 48);
      textInput.style.fontSize = `${currentFontSize}px`;
    });

    box.querySelector('.font-size-down-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      currentFontSize = Math.max(currentFontSize - 2, 10);
      textInput.style.fontSize = `${currentFontSize}px`;
    });

    box.querySelector('.toggle-bg-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      hasBg = !hasBg;
      textInput.className = hasBg
        ? 'pdf-editable-text px-2 py-1 rounded border-2 border-dashed border-primary-500 bg-white/95 text-slate-900 font-sans outline-none min-w-[120px] shadow-sm leading-normal'
        : 'pdf-editable-text px-2 py-1 rounded border-2 border-dashed border-primary-500 bg-transparent font-sans outline-none min-w-[120px] leading-normal';
    });

    box.querySelector('.delete-textbox-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      box.remove();
      this.pageEdits[pageNum].textElements = this.pageEdits[pageNum].textElements.filter(t => t.id !== id);
    });

    // Mover caja de texto arrastrando
    let isMoving = false;
    let moveStartX = 0;
    let moveStartY = 0;

    box.querySelector('.cursor-move').addEventListener('mousedown', (e) => {
      isMoving = true;
      moveStartX = e.clientX - box.offsetLeft;
      moveStartY = e.clientY - box.offsetTop;
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMoving) return;
      box.style.left = `${e.clientX - moveStartX}px`;
      box.style.top = `${e.clientY - moveStartY}px`;
    });

    window.addEventListener('mouseup', () => {
      isMoving = false;
    });

    // Registrar en datos de página
    if (!this.pageEdits[pageNum].textElements) this.pageEdits[pageNum].textElements = [];
    this.pageEdits[pageNum].textElements.push({
      id,
      element: box,
      getText: () => textInput.innerText.trim(),
      getFontSize: () => currentFontSize,
      getColor: () => textInput.style.color || '#000000',
      hasBg: () => hasBg
    });

    layer.appendChild(box);
  }

  /**
   * Añade un sello predefinido profesional a la página
   */
  addStamp(pageNum, cssX, cssY, stampType) {
    const pageCard = document.getElementById(`pdf-page-${pageNum}`);
    if (!pageCard) return;

    const layer = pageCard.querySelector('.pdf-elements-layer');
    if (!layer) return;

    const stampConfig = {
      'APROBADO': { color: 'border-emerald-600 text-emerald-700 bg-emerald-50/80', icon: 'fa-check' },
      'PAGADO': { color: 'border-blue-600 text-blue-700 bg-blue-50/80', icon: 'fa-money-bill-wave' },
      'ANULADO': { color: 'border-rose-600 text-rose-700 bg-rose-50/80', icon: 'fa-xmark' },
      'CONFIDENCIAL': { color: 'border-amber-600 text-amber-700 bg-amber-50/80', icon: 'fa-lock' },
      'COPIA': { color: 'border-slate-600 text-slate-700 bg-slate-50/80', icon: 'fa-copy' },
      'URGENTE': { color: 'border-purple-600 text-purple-700 bg-purple-50/80', icon: 'fa-bolt' }
    }[stampType] || { color: 'border-primary-600 text-primary-700 bg-primary-50/80', icon: 'fa-stamp' };

    const stampEl = document.createElement('div');
    stampEl.className = `pdf-stamp pointer-events-auto absolute z-20 group cursor-move select-none border-4 ${stampConfig.color} px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest shadow-md flex items-center gap-2 transform -rotate-6 transition-transform hover:scale-105`;
    stampEl.style.left = `${Math.max(cssX - 60, 10)}px`;
    stampEl.style.top = `${Math.max(cssY - 25, 10)}px`;

    stampEl.innerHTML = `
      <i class="fa-solid ${stampConfig.icon}"></i>
      <span>${stampType}</span>
      <button class="delete-stamp-btn opacity-0 group-hover:opacity-100 ml-2 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition" title="Eliminar sello">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    stampEl.querySelector('.delete-stamp-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      stampEl.remove();
    });

    // Mover sello
    let isMoving = false;
    let startX = 0;
    let startY = 0;

    stampEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.delete-stamp-btn')) return;
      isMoving = true;
      startX = e.clientX - stampEl.offsetLeft;
      startY = e.clientY - stampEl.offsetTop;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMoving) return;
      stampEl.style.left = `${e.clientX - startX}px`;
      stampEl.style.top = `${e.clientY - startY}px`;
    });

    window.addEventListener('mouseup', () => {
      isMoving = false;
    });

    layer.appendChild(stampEl);
  }

  /**
   * Elimina una página del documento
   */
  async deletePage(pageNum) {
    const result = await Swal.fire({
      title: `¿Eliminar la Página ${pageNum}?`,
      text: 'Esta página se quitará de la visualización y no se incluirá en el PDF final.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar página',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      if (!this.pageEdits[pageNum]) this.pageEdits[pageNum] = {};
      this.pageEdits[pageNum].deleted = true;

      const pageCard = document.getElementById(`pdf-page-${pageNum}`);
      if (pageCard) {
        pageCard.style.transition = 'all 0.3s ease';
        pageCard.style.transform = 'scale(0.9)';
        pageCard.style.opacity = '0';
        setTimeout(() => {
          pageCard.remove();
          this.refreshPageNumbersDisplay();
        }, 300);
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Página ${pageNum} eliminada`,
        showConfirmButton: false,
        timer: 1500
      });
    }
  }

  /**
   * Rota una página 90° en el sentido de las agujas del reloj
   */
  rotatePage(pageNum) {
    if (!this.pageEdits[pageNum]) this.pageEdits[pageNum] = {};
    const currentRot = this.pageEdits[pageNum].rotation || 0;
    const newRot = (currentRot + 90) % 360;
    this.pageEdits[pageNum].rotation = newRot;

    const pageCard = document.getElementById(`pdf-page-${pageNum}`);
    if (pageCard) {
      const wrapper = pageCard.querySelector('.pdf-page-wrapper');
      if (wrapper) {
        wrapper.style.transform = `rotate(${newRot}deg)`;
        wrapper.style.transition = 'transform 0.3s ease';
      }
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: `Página ${pageNum} rotada ${newRot}°`,
      showConfirmButton: false,
      timer: 1200
    });
  }

  refreshPageNumbersDisplay() {
    const visibleCards = document.querySelectorAll('.pdf-page-card:not([style*="display: none"])');
    visibleCards.forEach((card, idx) => {
      const bar = card.querySelector('.pdf-page-toolbar span');
      if (bar) {
        bar.innerHTML = `<i class="fa-regular fa-file-lines text-primary-500 mr-1"></i> Página ${idx + 1} de ${visibleCards.length}`;
      }
    });

    if (window.pdfViewer && window.pdfViewer.pdfTotalPagesText) {
      window.pdfViewer.pdfTotalPagesText.textContent = `de ${visibleCards.length}`;
    }
  }

  /**
   * Deshace la última acción en la página activa
   */
  undo() {
    // Buscar la última página con historial
    for (let p in this.pageEdits) {
      const pageData = this.pageEdits[p];
      if (pageData && pageData.history && pageData.history.length > 0) {
        const item = pageData.history.pop();
        if (!pageData.redoList) pageData.redoList = [];
        pageData.redoList.push(item);
        this.redrawPageEdits(parseInt(p, 10));
        break;
      }
    }
  }

  /**
   * Rehace la última acción deshecha
   */
  redo() {
    for (let p in this.pageEdits) {
      const pageData = this.pageEdits[p];
      if (pageData && pageData.redoList && pageData.redoList.length > 0) {
        const item = pageData.redoList.pop();
        pageData.history.push(item);
        this.redrawPageEdits(parseInt(p, 10));
        break;
      }
    }
  }

  /**
   * Combina todo y guarda el PDF editado directamente
   */
  async saveEditedPdf() {
    if (!window.PDFLib) {
      Swal.fire('Error', 'La biblioteca PDFLib no está disponible para guardar.', 'error');
      return;
    }

    Swal.fire({
      title: 'Guardando Cambios en PDF...',
      text: 'Fusionando borrados, textos, firmas y páginas...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const newPdfDoc = await window.PDFLib.PDFDocument.create();
      const pageCards = document.querySelectorAll('.pdf-page-card');

      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i];
        const pageNum = parseInt(card.getAttribute('data-page') || (i + 1), 10);
        const pageData = this.pageEdits[pageNum];

        // Omitir páginas eliminadas
        if (pageData && pageData.deleted) continue;

        const baseCanvas = card.querySelector('.pdf-page-canvas');
        const editCanvas = card.querySelector('.pdf-edit-canvas');
        if (!baseCanvas) continue;

        // Crear lienzo fusionado
        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = baseCanvas.width;
        mergedCanvas.height = baseCanvas.height;
        const mCtx = mergedCanvas.getContext('2d');

        // 1. Dibujar canvas base del PDF
        mCtx.drawImage(baseCanvas, 0, 0);

        // 2. Dibujar canvas de edición (borrador blanco, dibujos, resaltadores)
        if (editCanvas) {
          mCtx.drawImage(editCanvas, 0, 0);
        }

        // 3. Dibujar elementos de texto y sellos
        const wrapper = card.querySelector('.pdf-page-wrapper');
        if (wrapper) {
          const rect = wrapper.getBoundingClientRect();
          const scaleX = baseCanvas.width / rect.width;
          const scaleY = baseCanvas.height / rect.height;

          // Dibujar cajas de texto
          const textItems = wrapper.querySelectorAll('.pdf-text-item');
          textItems.forEach(item => {
            const input = item.querySelector('.pdf-editable-text');
            if (input && input.innerText.trim()) {
              const itemLeft = (item.offsetLeft) * scaleX;
              const itemTop = (item.offsetTop) * scaleY;
              const fontSize = (parseFloat(input.style.fontSize) || 16) * scaleX;
              const textColor = input.style.color || '#000000';
              const text = input.innerText;

              // Si tiene fondo blanco para tapar
              if (input.classList.contains('bg-white/95')) {
                mCtx.fillStyle = '#ffffff';
                const measured = mCtx.measureText(text);
                mCtx.fillRect(itemLeft, itemTop, (input.offsetWidth) * scaleX, (input.offsetHeight) * scaleY);
              }

              mCtx.save();
              mCtx.font = `600 ${fontSize}px 'Plus Jakarta Sans', system-ui, sans-serif`;
              mCtx.fillStyle = textColor;
              mCtx.textBaseline = 'top';

              const lines = text.split('\n');
              lines.forEach((line, lineIdx) => {
                mCtx.fillText(line, itemLeft + 8 * scaleX, itemTop + 4 * scaleY + lineIdx * (fontSize * 1.3));
              });
              mCtx.restore();
            }
          });

          // Dibujar sellos
          const stamps = wrapper.querySelectorAll('.pdf-stamp');
          stamps.forEach(stamp => {
            const span = stamp.querySelector('span');
            if (span) {
              const stampText = span.innerText;
              const sLeft = stamp.offsetLeft * scaleX;
              const sTop = stamp.offsetTop * scaleY;
              const sWidth = stamp.offsetWidth * scaleX;
              const sHeight = stamp.offsetHeight * scaleY;

              mCtx.save();
              mCtx.translate(sLeft + sWidth / 2, sTop + sHeight / 2);
              mCtx.rotate(-6 * Math.PI / 180);

              // Fondo
              mCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              mCtx.fillRect(-sWidth / 2, -sHeight / 2, sWidth, sHeight);

              // Borde
              mCtx.strokeStyle = stamp.classList.contains('text-rose-700') ? '#dc2626' : (stamp.classList.contains('text-emerald-700') ? '#059669' : '#2563eb');
              mCtx.lineWidth = 4 * scaleX;
              mCtx.strokeRect(-sWidth / 2, -sHeight / 2, sWidth, sHeight);

              // Texto
              mCtx.fillStyle = mCtx.strokeStyle;
              mCtx.font = `900 ${16 * scaleX}px 'Plus Jakarta Sans', sans-serif`;
              mCtx.textAlign = 'center';
              mCtx.textBaseline = 'middle';
              mCtx.fillText(stampText, 0, 0);
              mCtx.restore();
            }
          });
        }

        // Convertir lienzo fusionado a imagen PNG y adjuntar a PDFLib
        const pngDataUrl = mergedCanvas.toDataURL('image/png');
        const pngBytes = await fetch(pngDataUrl).then(r => r.arrayBuffer());
        const pngImage = await newPdfDoc.embedPng(pngBytes);

        // Añadir página al nuevo PDF con rotación si corresponde
        const rotation = pageData ? (pageData.rotation || 0) : 0;
        let pWidth = pngImage.width;
        let pHeight = pngImage.height;

        const newPage = newPdfDoc.addPage([pWidth, pHeight]);
        if (rotation !== 0) {
          newPage.setRotation(window.PDFLib.degrees(rotation));
        }

        newPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight
        });
      }

      // Guardar PDF final
      const pdfBytes = await newPdfDoc.save();
      const newBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Actualizar Blob en la aplicación para descargas y envíos
      if (window.docApp) {
        window.docApp.activePdfBlob = newBlob;
      }
      if (window.pdfViewer) {
        window.pdfViewer.pdfBlob = newBlob;
      }

      Swal.close();

      const { isConfirmed } = await Swal.fire({
        title: '¡PDF Editado con Éxito!',
        text: 'Los borrados, textos añadidos, firmas y ajustes de página se han aplicado al archivo.',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-file-arrow-down mr-1"></i> Descargar PDF Editado',
        cancelButtonText: 'Continuar en la App',
        confirmButtonColor: '#4f46e5'
      });

      if (isConfirmed && window.docApp) {
        window.docApp.generateAndDownloadPDF();
      }

    } catch (err) {
      console.error('Error guardando PDF editado:', err);
      Swal.close();
      Swal.fire('Error', 'No se pudo generar el PDF con las ediciones.', 'error');
    }
  }
}

// Inicializar globalmente
window.pdfEditor = new PdfEditorModule();
