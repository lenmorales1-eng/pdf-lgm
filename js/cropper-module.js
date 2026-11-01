/**
 * OmniDoc Studio - Cropper & Clipboard Module
 * Maneja recorte interactivo, captura del portapapeles (Ctrl+V) y transformaciones.
 */

class CropperModule {
  constructor() {
    this.cropper = null;
    this.imageElement = document.getElementById('cropperImage');
    this.placeholderElement = document.getElementById('cropperPlaceholder');
    this.cropDropZone = document.getElementById('cropDropZone');
    this.cropFileInput = document.getElementById('cropFileInput');
    this.applyCropBtn = document.getElementById('applyCropBtn');

    this.initEventListeners();
  }

  initEventListeners() {
    // Click en la zona de drop para abrir file picker
    if (this.cropDropZone && this.cropFileInput) {
      this.cropDropZone.addEventListener('click', () => this.cropFileInput.click());
      this.cropFileInput.addEventListener('change', (e) => this.handleFileSelect(e));

      // Drag & drop
      this.cropDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.cropDropZone.classList.add('dragover');
      });
      this.cropDropZone.addEventListener('dragleave', () => {
        this.cropDropZone.classList.remove('dragover');
      });
      this.cropDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.cropDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Soporte para pegar captura directamente desde el portapapeles (Ctrl+V)
    window.addEventListener('paste', (e) => this.handlePaste(e));

    // Herramientas de rotación y volteo
    const rotateLeftBtn = document.getElementById('rotateLeftBtn');
    const rotateRightBtn = document.getElementById('rotateRightBtn');
    const flipXBtn = document.getElementById('flipXBtn');
    const resetCropBtn = document.getElementById('resetCropBtn');

    if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => this.rotate(-90));
    if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => this.rotate(90));
    if (flipXBtn) {
      let flipped = false;
      flipXBtn.addEventListener('click', () => {
        flipped = !flipped;
        if (this.cropper) this.cropper.scaleX(flipped ? -1 : 1);
      });
    }
    if (resetCropBtn) {
      resetCropBtn.addEventListener('click', () => {
        if (this.cropper) this.cropper.reset();
      });
    }

    // Botones de relación de aspecto (Aspect Ratio)
    const aspectBtns = document.querySelectorAll('.aspect-btn');
    aspectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        aspectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const aspectVal = btn.getAttribute('data-aspect');
        this.setAspectRatio(aspectVal);
      });
    });

    // Aplicar recorte al documento PDF
    if (this.applyCropBtn) {
      this.applyCropBtn.addEventListener('click', () => this.applyCropToDocument());
    }
  }

  handlePaste(e) {
    // Si el usuario está escribiendo en un input o textarea normal, no interferir con texto
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const clipboardItems = (e.clipboardData || e.originalEvent.clipboardData).items;
    let foundImage = false;

    for (let item of clipboardItems) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        this.loadFile(file);
        foundImage = true;

        // Activar la pestaña de recorte automáticamente si no está activa
        if (window.docApp) {
          window.docApp.switchTab('crop');
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: '¡Captura pegada del portapapeles!',
          showConfirmButton: false,
          timer: 2000
        });
        break;
      }
    }
  }

  handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      this.loadFile(e.target.files[0]);
    }
  }

  loadFile(file) {
    if (!file.type.startsWith('image/')) {
      Swal.fire('Formato incompatible', 'Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP, etc.).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      this.initCropper(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  initCropper(src) {
    if (this.placeholderElement) this.placeholderElement.classList.add('hidden');
    this.imageElement.src = src;

    if (this.cropper) {
      this.cropper.destroy();
    }

    // Inicializar Cropper.js
    this.cropper = new Cropper(this.imageElement, {
      aspectRatio: NaN, // Libre por defecto
      viewMode: 1,
      autoCropArea: 0.95,
      responsive: true,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      ready() {
        console.log('Cropper listo');
      }
    });
  }

  rotate(degrees) {
    if (this.cropper) {
      this.cropper.rotate(degrees);
    }
  }

  setAspectRatio(ratioStr) {
    if (!this.cropper) return;
    if (ratioStr === 'free') {
      this.cropper.setAspectRatio(NaN);
    } else {
      this.cropper.setAspectRatio(parseFloat(ratioStr));
    }
  }

  applyCropToDocument() {
    if (!this.cropper) {
      Swal.fire('No hay imagen', 'Primero sube o pega una imagen para recortar.', 'info');
      return;
    }

    const canvas = this.cropper.getCroppedCanvas({
      maxWidth: 2400,
      maxHeight: 2400,
      fillColor: '#ffffff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    if (!canvas) return;

    const croppedDataUrl = canvas.toDataURL('image/png');

    // Añadir o reemplazar en la aplicación principal
    if (window.docApp) {
      window.docApp.addCroppedSnippet(croppedDataUrl);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Recorte incorporado al documento',
        showConfirmButton: false,
        timer: 1800
      });
    }
  }
}

// Inicializar y exponer al ámbito global
window.cropperModule = new CropperModule();
