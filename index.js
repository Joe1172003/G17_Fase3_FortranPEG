import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/+esm';
import { parse } from './src/grammar/gramatica.js';
import { ErrorReglas } from './src/grammar/error.js';
import { generateParser } from './src/parser/utils.js';


export let ids = [];
export let usos = [];
export let errores = [];

// Crear el editor principal
const editor = monaco.editor.create(document.getElementById('editor'), {
    value: '',
    language: 'java',
    theme: 'tema',
    automaticLayout: true,
});

// Crear el editor para la salida
const salida = monaco.editor.create(document.getElementById('salida'), {
    value: '',
    language: 'java',
    readOnly: true,
    automaticLayout: true,
});

let decorations = [];

const analizar = async () => {
    const entrada = editor.getValue();
    ids.length = 0;
    usos.length = 0;
    errores.length = 0;

    try {
        const cst = parse(entrada);
        if (errores.length > 0) {
            salida.setValue(`Error: ${errores[0].message}`);
            return;
        }

        // Llamada asincrónica a `generateParser`
        const fileContents = await generateParser(cst);
        const blob = new Blob([fileContents], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        // Configurar el botón de descarga
        const button = document.getElementById('ButtomDownload');
        button.href = url;

        // Mostrar el contenido generado en la salida
        salida.setValue(fileContents);
    } catch (error) {
        // Manejo de errores
        salida.setValue(`Error durante el análisis: ${error.message}`);
        console.error(error);
    } finally {
        // Limpiar decoraciones previas si la validación es exitosa
        decorations = editor.deltaDecorations(decorations, []);
    }
};


// Escuchar cambios en el contenido del editor
editor.onDidChangeModelContent(() => {
    analizar();
});

// CSS personalizado para resaltar el error y agregar un warning
const style = document.createElement('style');
style.innerHTML = `
    .errorHighlight {
        color: red !important;
        font-weight: bold;
    }
    .warningGlyph {
        background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="orange" d="M8 1l7 14H1L8 1z"/></svg>') no-repeat center center;
        background-size: contain;
    }
`;
document.head.appendChild(style);
