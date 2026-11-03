# PDF a Markdown — interfaz web para Android

Interfaz web adaptable a móviles para convertir PDF a Markdown con Flask y PyMuPDF4LLM.

## Funciones
- Carga de PDF y descarga del resultado como `.md`.
- Límite de subida de 25 MB.
- Validación básica de extensión y firma del PDF.
- Diseño adaptable a teléfonos y computadoras.

## Requisitos
Python 3.10 o superior recomendado.

## Instalación local
1. Instala Python.
2. Desde esta carpeta, crea y activa un entorno virtual:
   - Windows: `py -m venv .venv` y `.venv\\Scripts\\activate`
   - Linux/macOS: `python3 -m venv .venv` y `source .venv/bin/activate`
3. Instala dependencias: `pip install -r requirements.txt`
4. Ejecuta: `python app.py`
5. Abre `http://127.0.0.1:5000` en el mismo equipo.

## Android
Este repositorio contiene el código, no una aplicación Android ya instalada. En Android hace falta un entorno Python compatible y comprobar las dependencias. Otra opción es desplegar el servidor con HTTPS y abrirlo desde Chrome.

## Seguridad y privacidad
La configuración incluida es para pruebas locales. Antes de exponerla en internet, configura HTTPS, autenticación, controles de abuso y límites de recursos. No cargues documentos confidenciales en servidores que no controles. Los PDF escaneados pueden necesitar OCR adicional.
