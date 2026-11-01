/**
 * OmniDoc Studio - Document Converters Module
 * Maneja la conversión de Word (.docx), Excel (.xlsx, .csv), Notas con membrete e Imágenes múltiples.
 */

class DocConverters {
  constructor() {
    // Referencias a elementos de Word
    this.wordDropZone = document.getElementById('wordDropZone');
    this.wordFileInput = document.getElementById('wordFileInput');
    this.wordStatus = document.getElementById('wordStatus');
    this.wordFileName = document.getElementById('wordFileName');
    this.removeWordBtn = document.getElementById('removeWordBtn');

    // Referencias a elementos de Excel
    this.excelDropZone = document.getElementById('excelDropZone');
    this.excelFileInput = document.getElementById('excelFileInput');
    this.excelStatus = document.getElementById('excelStatus');
    this.excelFileName = document.getElementById('excelFileName');
    this.removeExcelBtn = document.getElementById('removeExcelBtn');
    this.excelSheetSelect = document.getElementById('excelSheetSelect');
    this.excelSheetSelectorWrapper = document.getElementById('excelSheetSelectorWrapper');

    this.currentWorkbook = null;

    this.initWordHandlers();
    this.initExcelHandlers();
    this.initNotesHandlers();
  }

  // ==========================================
  // WORD CONVERTER (.docx)
  // ==========================================
  initWordHandlers() {
    if (!this.wordDropZone || !this.wordFileInput) return;

    this.wordDropZone.addEventListener('click', () => this.wordFileInput.click());
    this.wordFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.processWordFile(e.target.files[0]);
      }
    });

    // Drag and drop Word
    this.wordDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.wordDropZone.classList.add('dragover');
    });
    this.wordDropZone.addEventListener('dragleave', () => {
      this.wordDropZone.classList.remove('dragover');
    });
    this.wordDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.wordDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.processWordFile(e.dataTransfer.files[0]);
      }
    });

    if (this.removeWordBtn) {
      this.removeWordBtn.addEventListener('click', () => {
        this.wordFileInput.value = '';
        this.wordStatus.classList.add('hidden');
        this.wordDropZone.classList.remove('hidden');
        if (window.docApp) {
          window.docApp.clearPreview();
        }
      });
    }
  }

  processWordFile(file) {
    if (!file.name.endsWith('.docx')) {
      Swal.fire({
        icon: 'error',
        title: 'Formato no soportado',
        text: 'Por favor sube un archivo con extensión .docx (Microsoft Word).'
      });
      return;
    }

    this.wordFileName.textContent = file.name;
    this.wordStatus.classList.remove('hidden');
    this.wordDropZone.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const arrayBuffer = loadEvent.target.result;

      // Usar mammoth para convertir el docx a HTML seguro
      if (window.mammoth) {
        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
          .then((result) => {
            const html = result.value; // El HTML resultante
            const messages = result.messages; // Advertencias opcionales
            
            // Establecer el título del documento basado en el nombre de archivo
            const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
            if (window.docApp) {
              window.docApp.setDocumentTitle(cleanTitle);
              window.docApp.renderWordContent(html);
            }
          })
          .catch((err) => {
            console.error('Error convirtiendo Word:', err);
            Swal.fire('Error', 'No se pudo leer el archivo Word. Asegúrate de que no esté protegido con contraseña.', 'error');
          });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ==========================================
  // EXCEL CONVERTER (.xlsx, .xls, .csv)
  // ==========================================
  initExcelHandlers() {
    if (!this.excelDropZone || !this.excelFileInput) return;

    this.excelDropZone.addEventListener('click', () => this.excelFileInput.click());
    this.excelFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.processExcelFile(e.target.files[0]);
      }
    });

    this.excelDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.excelDropZone.classList.add('dragover');
    });
    this.excelDropZone.addEventListener('dragleave', () => {
      this.excelDropZone.classList.remove('dragover');
    });
    this.excelDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.excelDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.processExcelFile(e.dataTransfer.files[0]);
      }
    });

    if (this.removeExcelBtn) {
      this.removeExcelBtn.addEventListener('click', () => {
        this.excelFileInput.value = '';
        this.excelStatus.classList.add('hidden');
        this.excelDropZone.classList.remove('hidden');
        this.excelSheetSelectorWrapper.classList.add('hidden');
        this.currentWorkbook = null;
        if (window.docApp) {
          window.docApp.clearPreview();
        }
      });
    }

    if (this.excelSheetSelect) {
      this.excelSheetSelect.addEventListener('change', (e) => {
        if (this.currentWorkbook) {
          this.renderSheet(e.target.value);
        }
      });
    }
  }

  processExcelFile(file) {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const isOk = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isOk) {
      Swal.fire({
        icon: 'error',
        title: 'Formato no válido',
        text: 'Por favor sube un archivo Excel (.xlsx, .xls) o archivo de valores separados por comas (.csv).'
      });
      return;
    }

    this.excelFileName.textContent = file.name;
    this.excelStatus.classList.remove('hidden');
    this.excelDropZone.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        this.currentWorkbook = workbook;

        // Limpiar y llenar el selector de hojas
        this.excelSheetSelect.innerHTML = '';
        workbook.SheetNames.forEach((sheetName) => {
          const opt = document.createElement('option');
          opt.value = sheetName;
          opt.textContent = sheetName;
          this.excelSheetSelect.appendChild(opt);
        });

        if (workbook.SheetNames.length > 1) {
          this.excelSheetSelectorWrapper.classList.remove('hidden');
        } else {
          this.excelSheetSelectorWrapper.classList.add('hidden');
        }

        const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
        if (window.docApp) {
          window.docApp.setDocumentTitle(cleanTitle);
        }

        // Renderizar la primera hoja
        this.renderSheet(workbook.SheetNames[0]);
      } catch (err) {
        console.error('Error leyendo Excel:', err);
        Swal.fire('Error', 'No se pudo procesar la hoja de cálculo.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  renderSheet(sheetName) {
    if (!this.currentWorkbook) return;
    const worksheet = this.currentWorkbook.Sheets[sheetName];

    // Convertir a HTML
    const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
      id: 'excelOutputTable',
      editable: false
    });

    if (window.docApp) {
      window.docApp.renderExcelContent(sheetName, htmlTable);
    }
  }

  // ==========================================
  // NOTAS & PLANTILLAS FORMALES
  // ==========================================
  initNotesHandlers() {
    const noteTitleInput = document.getElementById('noteTitleInput');
    const noteContentInput = document.getElementById('noteContentInput');
    const noteHeaderInput = document.getElementById('noteHeaderInput');
    const noteFooterInput = document.getElementById('noteFooterInput');
    const insertTemplateBtn = document.getElementById('insertTemplateBtn');

    const updateNotesLive = () => {
      if (window.docApp && window.docApp.activeTab === 'notes') {
        window.docApp.renderNoteContent({
          title: noteTitleInput.value,
          content: noteContentInput.value,
          header: noteHeaderInput.value,
          footer: noteFooterInput.value
        });
      }
    };

    if (noteTitleInput) noteTitleInput.addEventListener('input', updateNotesLive);
    if (noteContentInput) noteContentInput.addEventListener('input', updateNotesLive);
    if (noteHeaderInput) noteHeaderInput.addEventListener('input', updateNotesLive);
    if (noteFooterInput) noteFooterInput.addEventListener('input', updateNotesLive);

    // Botones de formato rápido para la nota
    const formatBtns = document.querySelectorAll('.format-btn');
    formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        this.applyTextFormatting(noteContentInput, tag);
        updateNotesLive();
      });
    });

    // Selector de plantillas profesionales
    if (insertTemplateBtn) {
      insertTemplateBtn.addEventListener('click', () => {
        this.promptTemplatesModal(noteTitleInput, noteContentInput, noteHeaderInput, noteFooterInput, updateNotesLive);
      });
    }
  }

  applyTextFormatting(textarea, tag) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let replacement = '';

    const todayStr = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    switch(tag) {
      case 'b':
        replacement = `**${selectedText || 'Texto en Negrita'}**`;
        break;
      case 'i':
        replacement = `*${selectedText || 'Texto en Cursiva'}*`;
        break;
      case 'u':
        replacement = `<u>${selectedText || 'Texto Subrayado'}</u>`;
        break;
      case 'bullet':
        replacement = `\n• ${selectedText || 'Elemento de lista'}\n• Elemento 2\n`;
        break;
      case 'date':
        replacement = `Fecha: ${todayStr}`;
        break;
      case 'sig':
        replacement = `\n\n_____________________________\nFirma y Sello de Autorización\n`;
        break;
    }

    textarea.setRangeText(replacement, start, end, 'end');
    textarea.focus();
  }

  async promptTemplatesModal(titleInput, contentInput, headerInput, footerInput, callback) {
    const { value: templateType } = await Swal.fire({
      title: 'Selecciona una Plantilla Rápida',
      input: 'select',
      inputOptions: {
        'memo': '📌 Memorándum Corporativo',
        'receipt': '🧾 Recibo de Entrega / Conformidad',
        'minutes': '📝 Acta de Reunión',
        'quote': '💼 Presupuesto / Cotización Rápida',
        'letter': '✉️ Carta Formal'
      },
      inputPlaceholder: 'Elige un tipo...',
      showCancelButton: true,
      confirmButtonText: 'Cargar Plantilla',
      cancelButtonText: 'Cancelar'
    });

    if (!templateType) return;

    const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    if (templateType === 'memo') {
      titleInput.value = 'MEMORÁNDUM INTERNO';
      headerInput.value = 'DEPARTAMENTO DE OPERACIONES & DIRECCIÓN';
      footerInput.value = 'Documento de Carácter Oficial - Confidencial';
      contentInput.value = `DE: Dirección General\nPARA: Todo el Personal\nFECHA: ${today}\nASUNTO: Actualización de Procedimientos Operativos\n\nPor medio del presente comunicado, se informa a todo el equipo de trabajo sobre la implementación de las nuevas directrices para la gestión documental y flujo de aprobaciones.\n\nPuntos Clave:\n• La presentación de reportes se realizará exclusivamente en formato PDF digitalizado.\n• Los tiempos de respuesta para autorizaciones serán de máximo 24 horas hábiles.\n• Todo documento compartido deberá contar con visto bueno del supervisor de área.\n\nAgradecemos su colaboración y compromiso continuo.\n\nAtentamente,\nDirección de Operaciones\nFirma: ________________________`;
    } else if (templateType === 'receipt') {
      titleInput.value = 'CONSTANCIA Y RECIBO DE ENTREGA';
      headerInput.value = 'COMPROBANTE DE RECEPCIÓN DE BIENES O SERVICIOS';
      footerInput.value = 'Validez legal como acuse de recibo de conformidad';
      contentInput.value = `En la ciudad correspondiente, a los ${today}.\n\nSe hace constar que por medio del presente documento:\n\nENTREGADO POR: _________________________________\nRECIBIDO POR:  _________________________________\nDNI / Identificación: ___________________________\n\nDESCRIPCIÓN DE LOS ÍTEMS ENTREGADOS:\n• 01. Expediente técnico y documentación anexa.\n• 02. Copias certificadas de comprobantes.\n• 03. Equipos / Materiales en perfecto estado físico y operativo.\n\nOBSERVACIONES:\nLos bienes fueron inspeccionados a entera satisfacción del receptor, sin reclamos posteriores.\n\n\n_____________________________          _____________________________\n      Firma del Entregador                       Firma del Receptor`;
    } else if (templateType === 'minutes') {
      titleInput.value = 'ACTA DE REUNIÓN Y ACUERDOS';
      headerInput.value = 'COMITÉ DIRECTIVO & COORDINACIÓN';
      footerInput.value = 'Registro Oficial de Acuerdos';
      contentInput.value = `FECHA: ${today}\nHORA DE INICIO: 10:00 AM\nLUGAR / MODALIDAD: Presencial / Sala de Juntas\n\nASISTENTES:\n1. Coordinador de Proyecto\n2. Responsable de Finanzas\n3. Especialista Técnico\n\nORDEN DEL DÍA:\n1. Revisión de avances semanales.\n2. Asignación de presupuestos extraordinarios.\n3. Fijación de entregables del próximo trimestre.\n\nACUERDOS TOMADOS:\n• Acuerdo 1: Culminar la digitalización de expedientes antes del viernes.\n• Acuerdo 2: Validar la integración con clientes estratégicos vía canales oficiales.\n\nSin más asuntos que tratar, se levanta la sesión a las 11:30 AM.\n\nFirmas de Conformidad:`;
    } else if (templateType === 'quote') {
      titleInput.value = 'COTIZACIÓN / PRESUPUESTO FORMAL';
      headerInput.value = 'SOLUCIONES PROFESIONALES S.A.';
      footerInput.value = 'Cotización válida por 15 días calendario';
      contentInput.value = `CLIENTE: Estimado(a) Cliente / Empresa\nFECHA DE EMISIÓN: ${today}\nNÚMERO DE PROPUESTA: COT-2026-089\n\nNos complace poner a su disposición la siguiente propuesta técnico-económica:\n\nDETALLE DE SERVICIOS / PRODUCTOS:\n1. Consultoría especializada y levantamiento de requerimientos.\n2. Implementación de sistema documental y automatización.\n3. Capacitación al personal usuario (2 sesiones guiadas).\n4. Soporte y mantenimiento técnico por 3 meses.\n\nCONDICIONES DE PAGO:\n• 50% al momento de la aprobación del presente presupuesto.\n• 50% a la entrega final de conformidad.\n\nQuedamos a su entera disposición para cualquier aclaración.\n\nAtentamente,\nDepartamento Comercial`;
    } else if (templateType === 'letter') {
      titleInput.value = 'CARTA FORMAL DE COMUNICACIÓN';
      headerInput.value = 'COMUNICACIÓN EXTERNA';
      footerInput.value = 'Contacto: contacto@empresa.com';
      contentInput.value = `Ciudad, ${today}\n\nSeñor(a):\nRepresentante Legal / Directiva\nPresente.-\n\nDe mi mayor consideración:\n\nPor medio de la presente, me dirijo a usted con el propósito de saludarle cordialmente y a la vez manifestarle nuestro interés en coordinar las actividades previstas para el presente ejercicio.\n\nConsiderando las necesidades planteadas en nuestras conversaciones previas, ponemos a su disposición toda la información técnica necesaria para proceder con los siguientes pasos del proyecto común.\n\nEsperando contar con una pronta y favorable respuesta, quedo a sus apreciables órdenes.\n\nAtentamente,\n\n\n___________________________________\nFirma del Remitente\nCargo / Representación`;
    }

    if (callback) callback();
  }
}

// Inicializar y exponer al ámbito global
window.docConverters = new DocConverters();
