#!/usr/bin/env python3
"""
Script para consolidar todo el código del proyecto en un único archivo .txt

Uso (desde la raíz del proyecto):
    python scripts/consolidar-codigo.py
    python scripts/consolidar-codigo.py -o codigo.txt
    python scripts/consolidar-codigo.py --extensiones .jsx .js .css
"""

import os
import sys
import argparse
import datetime

# Carpetas y archivos a ignorar (son pesados o innecesarios)
DIRS_EXCLUIDAS = {
    '.git', 'node_modules', '__pycache__', 'venv', '.venv',
    'dist', 'build', '.next', '.nuxt', 'coverage', '.cache',
    '.parcel-cache', '.turbo', 'target', 'out'
}

# Extensiones de archivos a incluir (codigo y configuracion)
EXTENSIONES_INCLUIDAS = {
    '.py', '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.sass',
    '.html', '.htm', '.json', '.md', '.txt', '.sql', '.svg',
    '.yml', '.yaml', '.toml', '.ini', '.env.example', '.gitignore',
    'jsconfig.json', 'tsconfig.json', 'package.json', 'postcss.config.js',
    'tailwind.config.js', 'next.config.mjs', 'middleware.js'
}

# Archivos binarios/imagenes a ignorar
ARCHIVOS_EXCLUIDOS = {
    '.DS_Store', 'Thumbs.db', '.env', '.env.local', '.env.production',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'favicon.ico',
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*.webp', '*.bmp',
    '*.mp4', '*.mp3', '*.zip', '*.tar', '*.gz', '*.pdf', '*.exe',
    '*.dll', '*.so', '*.dylib', '*.bin', '*.class', '*.pyc', '*.pyo'
}


def parse_args():
    parser = argparse.ArgumentParser(description='Consolidar el codigo del proyecto en un archivo .txt')
    parser.add_argument('-o', '--output', default='codigo_consolidado.txt',
                        help='Nombre del archivo de salida (default: codigo_consolidado.txt)')
    parser.add_argument('-e', '--extensiones', nargs='+', default=None,
                        help='Extensiones a incluir (ej: .jsx .js .css)')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Mostrar archivos procesados y omitidos')
    return parser.parse_args()


def deberia_incluir(archivo, extensiones):
    """Determina si un archivo debe incluirse en la consolidacion."""

    # Obtener nombre y extension
    nombre = os.path.basename(archivo)
    ext = os.path.splitext(archivo)[1].lower() or os.path.basename(archivo)

    # Ignorar archivos binarios/imagenes
    for excl in ARCHIVOS_EXCLUIDOS:
        if excl.startswith('*'):
            if ext == excl[1:].lower():
                return False
        elif nombre == excl:
            return False

    # Si se especificaron extensiones, solo incluir esas
    if extensiones is not None:
        return ext.lstrip('.') in extensiones or nombre in extensiones

    # Incluir archivos de codigo por extension
    # Extensiones normales (con punto)
    if ext in EXTENSIONES_INCLUIDAS:
        return True

    # Archivos especiales sin extension estandar
    nombre_archivo = os.path.basename(archivo)
    if nombre_archivo in EXTENSIONES_INCLUIDAS:
        return True

    # Archivos de texto como Dockerfile, Makefile, etc.
    if nombre_archivo in ('Dockerfile', 'Makefile', 'Procfile', '.gitignore',
                          '.env.example', 'Gemfile', 'Rakefile'):
        return True

    # Ignorar archivos .env.* que no sean de ejemplo
    if nombre.startswith('.env') and nombre != '.env.example':
        return False

    return False


def consolidar_proyecto(ruta_raiz, archivo_salida, extensiones=None, verbose=False):
    """
    Recorre el arbol de archivos y consolida el contenido en un .txt
    """
    total_archivos = 0
    total_omitidos = 0
    total_errores = 0
    archivos_procesados = []
    archivos_omitidos = []
    archivos_con_error = []

    # Recorrer el arbol de archivos
    for dirpath, dirnames, filenames in os.walk(ruta_raiz):
        # Filtrar directorios excluidos (modificar dirnames in-place)
        dirnames[:] = [d for d in dirnames if d not in DIRS_EXCLUIDAS]

        # Procesar cada archivo
        for filename in filenames:
            ruta_completa = os.path.join(dirpath, filename)
            ruta_relativa = os.path.relpath(ruta_completa, ruta_raiz)

            # Verificar si el archivo debe incluirse
            if not deberia_incluir(ruta_completa, extensiones):
                total_omitidos += 1
                if verbose:
                    archivos_omitidos.append(ruta_relativa)
                continue

            # Intentar leer el archivo
            try:
                # Intentar con UTF-8 primero
                with open(ruta_completa, 'r', encoding='utf-8') as f:
                    contenido = f.read()

                archivos_procesados.append((ruta_relativa, contenido))
                total_archivos += 1

                if verbose:
                    print('  [OK] ' + ruta_relativa)

            except (UnicodeDecodeError, PermissionError, OSError) as e:
                total_errores += 1
                archivos_con_error.append(ruta_relativa)
                if verbose:
                    print('  [WARN] ' + ruta_relativa + ' - ' + type(e).__name__ + ': ' + str(e))
                continue

    # Escribir el archivo consolidado
    try:
        with open(archivo_salida, 'w', encoding='utf-8') as salida:
            salida.write('=' * 80 + '\n')
            salida.write('CONSOLIDACION DE CODIGO DEL PROYECTO\n')
            salida.write('Proyecto: ' + os.path.basename(ruta_raiz) + '\n')
            salida.write('Ruta raiz: ' + os.path.abspath(ruta_raiz) + '\n')
            salida.write('Fecha de generacion: ' + datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '\n')
            salida.write('Total de archivos consolidados: ' + str(total_archivos) + '\n')
            salida.write('=' * 80 + '\n\n')

            for ruta_relativa, contenido in archivos_procesados:
                salida.write('=== INICIO: ' + ruta_relativa + ' ===\n')
                salida.write(contenido)
                # Asegurar salto de linea al final
                if not contenido.endswith('\n'):
                    salida.write('\n')
                salida.write('=== FIN: ' + ruta_relativa + ' ===\n\n')

            # Nota si hubo errores
            if archivos_con_error:
                salida.write('=' * 80 + '\n')
                salida.write('ADVERTENCIAS (' + str(len(archivos_con_error)) + ' archivos no se pudieron leer):\n')
                for ruta in archivos_con_error:
                    salida.write('  - ' + ruta + ' (codificacion o permisos)\n')
                salida.write('=' * 80 + '\n')

        print('')
        print('[OK] Consolidacion completada!')
        print('     Archivos procesados: ' + str(total_archivos))
        print('     Archivos omitidos: ' + str(total_omitidos))
        if total_errores:
            print('     [WARN] Archivos con error: ' + str(total_errores))
        print('     Archivo de salida: ' + os.path.abspath(archivo_salida))
        print('     Tamano: ' + str(os.path.getsize(archivo_salida)) + ' bytes')

        return 0

    except IOError as e:
        print('[ERROR] Error al escribir el archivo de salida: ' + str(e))
        return 1


def main():
    args = parse_args()

    # Determinar la raiz del proyecto (directorio actual)
    ruta_raiz = os.getcwd()

    # Normalizar extensiones si se proporcionan
    extensiones = None
    if args.extensiones:
        extensiones = [e.lstrip('.') if not e.startswith('.') else e.lstrip('.') for e in args.extensiones]

    print('[INFO] Consolidando proyecto desde: ' + ruta_raiz)
    print('[INFO] Archivo de salida: ' + args.output)
    if extensiones:
        print('[INFO] Extensiones: ' + ', '.join(extensiones))
    else:
        print('[INFO] Extensiones: todas las de codigo')
    print('')

    exit_code = consolidar_proyecto(ruta_raiz, args.output, extensiones, args.verbose)
    sys.exit(exit_code)


if __name__ == '__main__':
    main()