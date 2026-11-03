from flask import Flask, request, render_template, send_file
import pymupdf4llm
import io
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25 MB

@app.get("/")
def index():
    return render_template("index.html")

@app.post("/convert")
def convert():
    uploaded = request.files.get("pdf")
    if not uploaded or not uploaded.filename:
        return render_template("index.html", error="Selecciona un archivo PDF.")
    if not uploaded.filename.lower().endswith(".pdf"):
        return render_template("index.html", error="El archivo debe tener extensión .pdf.")
    safe_name = secure_filename(uploaded.filename) or "documento.pdf"
    if not uploaded.stream.read(5).startswith(b"%PDF-"):
        uploaded.stream.seek(0)
        return render_template("index.html", error="El archivo no parece ser un PDF válido.")
    uploaded.stream.seek(0)
    try:
        markdown = pymupdf4llm.to_markdown(uploaded.stream)
    except Exception:
        app.logger.exception("PDF conversion failed")
        return render_template("index.html", error="No se pudo procesar el PDF. Prueba con otro archivo.")
    output_name = os.path.splitext(safe_name)[0] + ".md"
    data = io.BytesIO(markdown.encode("utf-8"))
    data.seek(0)
    return send_file(data, as_attachment=True, download_name=output_name,
                     mimetype="text/markdown; charset=utf-8")

@app.errorhandler(413)
def too_large(_):
    return render_template("index.html", error="El PDF supera el límite de 25 MB."), 413

if __name__ == "__main__":
    # Solo pruebas locales. Para internet, usar HTTPS y servidor de producción.
    app.run(host="127.0.0.1", port=5000, debug=False)
