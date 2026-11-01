# OmniDoc Studio PRO 📄✨

**Conversor Universal de Archivos a PDF & Centro de Distribución Digital**

OmniDoc Studio es una aplicación web y de escritorio moderna diseñada para procesar y transformar cualquier tipo de contenido o archivo en documentos PDF de alta calidad, con herramientas de edición integradas y botones de distribución rápida con 1 solo clic.

---

## 🚀 Cómo Iniciar la Aplicación

Tienes dos opciones muy sencillas:

1. **Doble clic en `Abrir_App.bat`** (Recomendado en Windows).
2. O simplemente haz doble clic directo sobre el archivo **`index.html`** para abrirlo en Google Chrome, Microsoft Edge, Firefox, Brave u Opera.

> **100% Privado y Seguro**: Toda la conversión y procesamiento de imágenes, Word, Excel y texto se realiza localmente en tu propio navegador. Ningún archivo se envía a servidores externos ni sale de tu computadora.

---

## 🌟 Fuentes y Archivos Soportados

| Tipo de Entrada | Extensiones / Métodos | Características Incluidas |
| :--- | :--- | :--- |
| **📂 Abrir & Editar PDFs** | `.pdf` | **Editor y Visor completo de PDFs**. Borra texto o manchas con **Borrador / Tapar (Whiteout)** o censor negro, **añade texto nuevo** en cualquier lugar con tamaño y tipografía personalizada, **dibuja o firma** a mano alzada, aplica **resaltador**, inserta **sellos rápidos** (*Aprobado, Pagado, Anulado, etc.*), **añade hojas en blanco**, rota páginas 90° y guarda el nuevo PDF editado con **PDFLib**. |
| **📑 Unir PDFs & Gestor de Páginas** | Múltiples `.pdf` | **Combina múltiples PDFs externos en 1 solo documento**. Reordena los archivos con flechas arriba/abajo, añade hojas en blanco A4, une otros PDFs externos al documento actual, y utiliza el **Gestor Visual de Páginas** con miniaturas para reordenar, rotar y borrar hojas. |
| **📄 Documentos de Texto** | `.txt`, `.md`, `.log`, `.html` | Lectura limpia de archivos de texto con botón para transferir y editar en el redactor formal. |
| **🖼️ Imágenes** | `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.gif` | Carga masiva o individual, reordenamiento, miniaturas con eliminación, ajuste de disposición (1 por página, cuadrícula o ajuste proporcional). |
| **✂️ Recorte de Imagen & Capturas** | `Ctrl + V` / Portapapeles / Archivos | Recorta con relación de aspecto libre, 1:1, A4 o 16:9, rotación de 90° e inversión de imagen. Compatible con el atajo de Windows **Win + Shift + S**. |
| **📄 Microsoft Word** | `.docx` | Conversión directa conservando encabezados, párrafos, viñetas y formato tipográfico. |
| **📊 Microsoft Excel & Tablas** | `.xlsx`, `.xls`, `.csv` | Convierte hojas de cálculo completas a tablas limpias con selector dinámico de hojas del libro. |
| **📝 Notas & Redacción Rápida** | Texto enriquecido / Plantillas | Crea documentos formales con membrete y pie de página. Incluye plantillas rápidas: *Memorándum*, *Recibo de Entrega*, *Acta de Reunión*, *Cotización* y *Carta Formal*. |

---

## ⚡ Botones de Acción y Distribución (1-Click)

La barra superior derecha incluye todos los accesos solicitados:

1. 🖨️ **Imprimir:** Dispara la impresión nativa del sistema optimizada para papel físico o *"Microsoft Print to PDF"*.
2. 📥 **Descargar PDF:** Genera el archivo PDF listo para guardar en tu disco duro en alta resolución.
3. 🔗 **Compartir:** Utiliza la API nativa de compartir del sistema (Windows, Android, iOS) para enviar el documento a cualquier app instalada.
4. 💬 **WhatsApp:** Abre WhatsApp Web o la App de WhatsApp con el mensaje predeterminado y descarga el archivo para enviarlo a un chat o grupo en segundos.
5. ✉️ **Enviar por Correo:** Abre tu cliente de correo (Gmail, Outlook, Correo de Windows) con asunto y cuerpo listos, y descarga el archivo para adjuntar.
6. 📁 **Google Drive:** Genera el PDF y abre directamente tu Google Drive para arrastrar y respaldar en la nube de Google.
7. ☁️ **OneDrive:** Genera el PDF y abre Microsoft OneDrive para sincronizar en la nube de Microsoft.

---

## ⌨️ Atajos de Teclado Útiles

- `Ctrl + O`: Abrir cualquier documento o PDF desde tu computadora.
- `Ctrl + Z`: Deshacer la última acción de edición (borrado o dibujo) en el PDF.
- `Ctrl + V`: Pegar cualquier captura de pantalla tomada con la herramienta de recortes de Windows directamente al visor.
- `Ctrl + P`: Imprimir el documento en pantalla.
- `Ctrl + S`: Descargar inmediatamente el archivo en formato PDF.

---

## 🛠️ Tecnologías Empleadas

- **Diseño & UI:** Tailwind CSS, Google Fonts (*Plus Jakarta Sans*), FontAwesome Icons 6.
- **Motor Lector & Visor de PDFs:** `PDF.js` (Mozilla).
- **Motor de Edición y Manipulación PDF:** `pdf-lib` (PDFLib).
- **Motor de Renderizado PDF:** `html2pdf.js`, `jsPDF`, `html2canvas`.
- **Motor de Recorte:** `Cropper.js`.
- **Parser de Word:** `Mammoth.js`.
- **Parser de Excel:** `SheetJS (xlsx)`.
- **Alertas y Diálogos:** `SweetAlert2`.
