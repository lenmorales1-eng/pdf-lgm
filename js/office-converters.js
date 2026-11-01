class OfficeConverters {
  constructor() {
    this.bindPdfExportButtons();
    window.officeConverters = this;
  }

  bindPdfExportButtons() {
    const actions = {
      pdfToWordBtn: () => this.exportPdfToWord(),
      pdfToExcelBtn: () => this.exportPdfToExcel(),
      pdfToPowerPointBtn: () => this.exportPdfToPowerPoint()
    };
    Object.entries(actions).forEach(([id, action]) => {
      const button = document.getElementById(id);
      if (button) button.addEventListener('click', action);
    });
  }

  safeBaseName(value) {
    return (value || 'Documento').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Documento';
  }

  getPdfDoc() {
    const pdfDoc = window.pdfViewer && window.pdfViewer.pdfDoc;
    if (!pdfDoc) {
      Swal.fire('Abre un PDF primero', 'Selecciona un archivo PDF para convertirlo a Word, Excel o PowerPoint.', 'info');
      return null;
    }
    return pdfDoc;
  }

  async extractPdfPages(pdfDoc) {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
      const page = await pdfDoc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .filter(item => item.str && item.str.trim())
        .map(item => ({ text: item.str.trim(), x: item.transform ? item.transform[4] : 0, y: item.transform ? item.transform[5] : 0 }))
        .sort((a, b) => Math.abs(a.y - b.y) < 2 ? a.x - b.x : b.y - a.y);

      const lines = [];
      items.forEach(item => {
        let line = lines.find(candidate => Math.abs(candidate.y - item.y) <= 2.5);
        if (!line) {
          line = { y: item.y, items: [] };
          lines.push(line);
        }
        line.items.push(item);
      });
      lines.sort((a, b) => b.y - a.y);
      pages.push({
        number: pageNumber,
        lines: lines.map(line => line.items.sort((a, b) => a.x - b.x).map(item => item.text).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean)
      });
    }
    return pages;
  }

  async exportPdfToWord() {
    const pdfDoc = this.getPdfDoc();
    if (!pdfDoc) return;
    if (!window.docx) {
      Swal.fire('Convertidor no disponible', 'No se pudo cargar el módulo de Word. Comprueba tu conexión a Internet y vuelve a abrir la app.', 'error');
      return;
    }

    try {
      Swal.fire({ title: 'Extrayendo texto…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const pages = await this.extractPdfPages(pdfDoc);
      const paragraphs = [];
      pages.forEach((page, index) => {
        if (index > 0) paragraphs.push(new docx.Paragraph({ children: [new docx.TextRun({ text: '' })], pageBreakBefore: true }));
        page.lines.forEach(line => paragraphs.push(new docx.Paragraph({ children: [new docx.TextRun(line)] })));
      });
      const hasText = pages.some(page => page.lines.length);
      if (!hasText) {
        Swal.fire('PDF sin texto seleccionable', 'Parece ser un PDF escaneado. Esta conversión no aplica OCR; el Word quedaría vacío.', 'warning');
        return;
      }
      const documentFile = new docx.Document({ sections: [{ children: paragraphs }] });
      const blob = await docx.Packer.toBlob(documentFile);
      this.downloadBlob(blob, `${this.safeBaseName(window.docApp?.documentTitle)}.docx`);
      Swal.fire({ icon: 'success', title: 'Word creado', text: 'Se exportó el texto extraído. El diseño original puede cambiar.', timer: 2400, showConfirmButton: false });
    } catch (error) {
      console.error('Error convirtiendo PDF a Word:', error);
      Swal.fire('Error', 'No se pudo convertir el PDF a Word.', 'error');
    }
  }

  async exportPdfToExcel() {
    const pdfDoc = this.getPdfDoc();
    if (!pdfDoc) return;
    if (!window.XLSX) {
      Swal.fire('Convertidor no disponible', 'No se pudo cargar el módulo de Excel. Comprueba tu conexión a Internet y vuelve a abrir la app.', 'error');
      return;
    }

    try {
      Swal.fire({ title: 'Extrayendo texto…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const pages = await this.extractPdfPages(pdfDoc);
      if (!pages.some(page => page.lines.length)) {
        Swal.fire('PDF sin texto seleccionable', 'Parece ser un PDF escaneado. Esta conversión no aplica OCR.', 'warning');
        return;
      }
      const rows = [['Página', 'Línea de texto']];
      pages.forEach(page => page.lines.forEach(line => rows.push([page.number, line])));
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet['!cols'] = [{ wch: 10 }, { wch: 100 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Texto del PDF');
      XLSX.writeFile(workbook, `${this.safeBaseName(window.docApp?.documentTitle)}.xlsx`);
      Swal.fire({ icon: 'success', title: 'Excel creado', text: 'El texto del PDF se exportó por página y línea; las tablas no se reconstruyen automáticamente.', timer: 2800, showConfirmButton: false });
    } catch (error) {
      console.error('Error convirtiendo PDF a Excel:', error);
      Swal.fire('Error', 'No se pudo convertir el PDF a Excel.', 'error');
    }
  }

  async exportPdfToPowerPoint() {
    const pdfDoc = this.getPdfDoc();
    if (!pdfDoc) return;
    if (!window.PptxGenJS) {
      Swal.fire('Convertidor no disponible', 'No se pudo cargar el módulo de PowerPoint. Comprueba tu conexión a Internet y vuelve a abrir la app.', 'error');
      return;
    }

    try {
      Swal.fire({ title: 'Preparando diapositivas…', text: 'Se creará una diapositiva por página del PDF.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const pptx = new window.PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'OmniDoc Studio';
      const slideWidth = 13.333;
      const slideHeight = 7.5;

      for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const imageData = canvas.toDataURL('image/png');
        const ratio = Math.min(slideWidth / canvas.width, slideHeight / canvas.height);
        const width = canvas.width * ratio;
        const height = canvas.height * ratio;
        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };
        slide.addImage({ data: imageData, x: (slideWidth - width) / 2, y: (slideHeight - height) / 2, w: width, h: height });
        canvas.width = 1;
        canvas.height = 1;
      }

      const fileName = `${this.safeBaseName(window.docApp?.documentTitle)}.pptx`;
      await pptx.writeFile({ fileName });
      Swal.fire({ icon: 'success', title: 'PowerPoint creado', text: 'Cada página se exportó como imagen en una diapositiva; el contenido no es editable.', timer: 2800, showConfirmButton: false });
    } catch (error) {
      console.error('Error convirtiendo PDF a PowerPoint:', error);
      Swal.fire('Error', 'No se pudo convertir el PDF a PowerPoint.', 'error');
    }
  }

  downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async processPowerPointFile(file) {
    if (!window.JSZip || !window.docApp) {
      Swal.fire('Convertidor no disponible', 'No se pudo cargar el módulo de PowerPoint. Comprueba tu conexión a Internet y vuelve a abrir la app.', 'error');
      return;
    }

    try {
      if (window.pdfViewer) window.pdfViewer.clear();
      else window.docApp.activePdfBlob = null;
      Swal.fire({ title: 'Leyendo presentación…', text: 'Se extraerá el texto de cada diapositiva.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const archive = await JSZip.loadAsync(file);
      const slideFiles = Object.keys(archive.files)
        .filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))
        .sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));
      if (!slideFiles.length) throw new Error('La presentación no contiene diapositivas legibles.');

      const title = file.name.replace(/\.[^/.]+$/, '');
      const titleElement = document.getElementById('previewMainTitle');
      const bodyElement = document.getElementById('previewBodyContent');
      if (titleElement) titleElement.textContent = title;
      if (bodyElement) {
        bodyElement.replaceChildren();
        for (let i = 0; i < slideFiles.length; i++) {
          const xml = await archive.file(slideFiles[i]).async('string');
          const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
          if (xmlDoc.querySelector('parsererror')) throw new Error('No se pudo leer una diapositiva.');
          const paragraphs = Array.from(xmlDoc.getElementsByTagName('a:p')).map(paragraph =>
            Array.from(paragraph.getElementsByTagName('a:t')).map(node => node.textContent).join('').trim()
          ).filter(Boolean);

          const card = document.createElement('section');
          card.style.cssText = 'min-height:720px;padding:48px;margin:0 0 28px;background:#fff;color:#172033;border:1px solid #e2e8f0;page-break-after:always;break-after:page;';
          const heading = document.createElement('h2');
          heading.textContent = `Diapositiva ${i + 1}`;
          heading.style.cssText = 'font-size:24px;margin:0 0 24px;color:#4338ca;';
          card.appendChild(heading);
          paragraphs.forEach(text => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            paragraph.style.cssText = 'font-size:18px;line-height:1.5;margin:0 0 14px;white-space:pre-wrap;';
            card.appendChild(paragraph);
          });
          if (!paragraphs.length) {
            const empty = document.createElement('p');
            empty.textContent = 'Esta diapositiva no contiene texto extraíble.';
            card.appendChild(empty);
          }
          bodyElement.appendChild(card);
        }
      }

      window.docApp.setDocumentTitle(title);
      const anySlideText = bodyElement && Array.from(bodyElement.querySelectorAll('section')).some(section => section.querySelectorAll('p').length > 1);
      if (!anySlideText) {
        Swal.fire('Presentación sin texto', 'No se encontró texto seleccionable para convertir. Esta conversión no conserva imágenes ni aplica OCR.', 'warning');
        return;
      }
      Swal.close();
      const generated = await window.docApp.generateAndDownloadPDF();
      if (generated) Swal.fire({ icon: 'success', title: 'PDF creado desde PowerPoint', text: 'Se conservó el texto por diapositiva. Imágenes, animaciones y formato avanzado no se trasladan.', timer: 3000, showConfirmButton: false });
    } catch (error) {
      console.error('Error convirtiendo PowerPoint a PDF:', error);
      Swal.fire('Error', 'No se pudo leer la presentación. Comprueba que sea un archivo .pptx sin contraseña.', 'error');
    }
  }
}

window.officeConverters = new OfficeConverters();
