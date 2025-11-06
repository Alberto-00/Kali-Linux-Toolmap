#!/usr/bin/env node

/**
 * Generate Embeddings Script - FIXED VERSION
 * Genera embeddings.json da registry.json usando modello locale.
 *
 * Usage:
 *   node generate-embeddings.js
 *
 * Requirements:
 *   npm install @xenova/transformers
 */

import {pipeline, env} from '@xenova/transformers';
import {readFileSync, writeFileSync, existsSync, readdirSync, statSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// CONFIGURAZIONE OFFLINE
const CONFIG = {
    // Input/Output
    registryPath: join(__dirname, '../../../data/registry.json'),
    outputPath: join(__dirname, '../data/embeddings.json'),

    // Modello locale
    modelName: 'multilingual-e5-small',
    modelPath: join(__dirname, '../models/'),

    // Opzioni ONNX (scegli quale modello usare)
    quantized: true,        // true = model_quantized.onnx, false = model.onnx
    onnxFileName: null,     // null = auto, oppure specifica: 'model_int8.onnx', 'model_fp16.onnx', etc.

    progressInterval: 10
};


// CONFIGURA TRANSFORMERS PER USARE MODELLI LOCALI
console.log('⚙️  Configuring @xenova/transformers for local models...');

env.localModelPath = CONFIG.modelPath;
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = false;

console.log(`   localModelPath: ${env.localModelPath}`);
console.log(`   allowRemoteModels: ${env.allowRemoteModels}`);
console.log(`   allowLocalModels: ${env.allowLocalModels}\n`);


/**
 * Carica registry.json
 */
function loadRegistry() {
    console.log('📂 Loading registry...');

    if (!existsSync(CONFIG.registryPath)) {
        console.error(`❌ Registry not found: ${CONFIG.registryPath}`);
        process.exit(1);
    }

    const content = readFileSync(CONFIG.registryPath, 'utf8');
    const tools = JSON.parse(content);

    console.log(`✅ Loaded ${tools.length} tools`);
    return tools;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html) {
    if (!html) return '';

    return html
        // Converti tag di blocco in spazi PRIMA di rimuoverli
        .replace(/<\/(div|p|h[1-6]|li|ul|ol|tr|td|th|br|hr)>/gi, ' ')
        .replace(/<(br|hr)\s*\/?>/gi, ' ')

        // Rimuovi tutti i tag rimanenti
        .replace(/<[^>]*>/g, '')

        // HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")

        // Normalizza whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Crea text representation del tool per embedding (CON stripHtml)
 */
function toolToText(tool) {
    const parts = [
        tool.name,
        stripHtml(tool.desc || ''),          // ✅ Strip HTML
        stripHtml(tool.desc_long || ''),     // ✅ Strip HTML
        tool.kind || '',
        ...(tool.caps || []),
        ...(tool.phases || []),
        ...(tool.category_path || [])
    ];

    // Rimuovi duplicati e join
    return [...new Set(parts)]
        .filter(Boolean)
        .join(' ')
        .trim();
}

/**
 * Verifica e mostra info sul modello locale
 */
function inspectLocalModel() {
    const modelDir = join(CONFIG.modelPath, CONFIG.modelName);
    const onnxDir = join(modelDir, 'onnx');

    console.log('🔍 Inspecting local model...');
    console.log(`   Model directory: ${modelDir}`);
    console.log(`   ONNX directory: ${onnxDir}`);

    if (!existsSync(modelDir)) {
        console.error(`❌ Model directory not found: ${modelDir}`);
        process.exit(1);
    }

    if (!existsSync(onnxDir)) {
        console.error(`❌ ONNX directory not found: ${onnxDir}`);
        process.exit(1);
    }

    // Lista tutti i file ONNX disponibili
    const onnxFiles = readdirSync(onnxDir).filter(f => f.endsWith('.onnx'));

    console.log(`   Available ONNX models (${onnxFiles.length}):`);
    onnxFiles.forEach(file => {
        const stats = statSync(join(onnxDir, file));
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`     • ${file} (${sizeMB} MB)`);
    });

    // Determina quale modello sarà usato
    let selectedModel;
    if (CONFIG.onnxFileName) {
        selectedModel = CONFIG.onnxFileName;
        if (!onnxFiles.includes(selectedModel)) {
            console.error(`❌ Specified ONNX file not found: ${selectedModel}`);
            process.exit(1);
        }
    } else {
        selectedModel = CONFIG.quantized ? 'model_quantized.onnx' : 'model.onnx';
        if (!onnxFiles.includes(selectedModel)) {
            console.warn(`⚠️  Default ${selectedModel} not found, using first available`);
            selectedModel = onnxFiles[0];
        }
    }

    const selectedPath = join(onnxDir, selectedModel);
    const selectedStats = statSync(selectedPath);
    const selectedSizeMB = (selectedStats.size / 1024 / 1024).toFixed(2);

    console.log(`   ✅ Selected: ${selectedModel} (${selectedSizeMB} MB)\n`);

    return selectedModel;
}

/**
 * Genera embeddings per tutti i tool
 */
async function generateEmbeddings(tools) {
    // Ispeziona modello locale prima di caricarlo
    const selectedOnnxFile = inspectLocalModel();

    console.log('🤖 Initializing embeddings pipeline...');
    console.log(`   Model name: ${CONFIG.modelName}`);
    console.log(`   Model path: ${CONFIG.modelPath}`);
    console.log(`   ONNX file: ${selectedOnnxFile}`);
    console.log(`   Quantized mode: ${CONFIG.quantized}\n`);

    let embedder;
    try {
        console.log('📦 Loading model files...');

        embedder = await pipeline(
            'feature-extraction',
            CONFIG.modelName,
            {
                quantized: CONFIG.quantized,
                progress_callback: (progress) => {
                    if (progress.status === 'progress') {
                        const percent = Math.round(progress.progress || 0);
                        const file = progress.file || 'unknown';
                        process.stdout.write(`\r   ⏳ Loading ${file}... ${percent}%    `);
                    } else if (progress.status === 'done') {
                        const file = progress.file || 'file';
                        console.log(`\r   ✅ Loaded: ${file}                    `);
                    } else if (progress.status === 'initiate') {
                        console.log(`   🔍 Fetching: ${progress.file || 'model files'}`);
                    }
                }
            }
        );

        console.log('\n✅ Model pipeline initialized successfully!');

        // Test rapido per verificare che funzioni
        console.log('🧪 Testing model with sample text...');
        const testOutput = await embedder('test embedding', {
            pooling: 'mean',
            normalize: true
        });
        const embeddingDim = testOutput.data.length;
        console.log(`✅ Model working! Embedding dimension: ${embeddingDim}\n`);

    } catch (error) {
        console.error('\n❌ Failed to load model!');
        console.error(`   Error: ${error.message}`);
        console.error('\n📝 Troubleshooting:');
        console.error(`   1. Check that model exists at: ${join(CONFIG.modelPath, CONFIG.modelName)}`);
        console.error(`   2. Verify ONNX files are in: ${join(CONFIG.modelPath, CONFIG.modelName, 'onnx')}`);
        console.error(`   3. Check file permissions`);
        console.error(`   4. Try setting allowRemoteModels=true to download if missing\n`);
        throw error;
    }

    console.log('🔄 Generating embeddings for all tools...\n');

    const embeddings = {};
    const startTime = Date.now();

    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i];
        const text = toolToText(tool);

        try {
            const output = await embedder(text, {
                pooling: 'mean',
                normalize: true
            });

            embeddings[tool.id] = Array.from(output.data);

            // Progress log
            if ((i + 1) % CONFIG.progressInterval === 0 || i === tools.length - 1) {
                const percent = Math.round(((i + 1) / tools.length) * 100);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`   [${i + 1}/${tools.length}] ${percent}% - ${elapsed}s - ${tool.name}`);
            }
        } catch (err) {
            console.error(`   ❌ Failed to embed tool ${tool.id}: ${err.message}`);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Generated ${Object.keys(embeddings).length} embeddings in ${totalTime}s`);

    return embeddings;
}

/**
 * Salva embeddings su file
 */
function saveEmbeddings(embeddings) {
    console.log('💾 Saving embeddings...');

    const json = JSON.stringify(embeddings, null, 2);
    const sizeKB = Math.round(Buffer.byteLength(json) / 1024);

    writeFileSync(CONFIG.outputPath, json);

    console.log(`✅ Saved to: ${CONFIG.outputPath}`);
    console.log(`   Size: ${sizeKB} KB`);
}

async function testSingleTool() {
    const tools = loadRegistry();

    // Prendi un tool random
    const randomIndex = Math.floor(Math.random() * tools.length);
    const testTool = tools[randomIndex];

    console.log('📝 Testing with random tool:');
    console.log(`   Index: ${randomIndex}/${tools.length}`);
    console.log(`   Name: ${testTool.name}`);
    console.log(`   ID: ${testTool.id}`);

    const text = toolToText(testTool);
    console.log(`   Text length: ${text.length} chars`);
    console.log(`   Text preview: ${text.substring(0, 200)}...`);

    console.log('\n🤖 Loading model for test...');
    const embedder = await pipeline('feature-extraction', CONFIG.modelName, {
        quantized: CONFIG.quantized
    });

    const output = await embedder(text, { pooling: 'mean', normalize: true });
    console.log(`   ✅ Embedding generated: ${output.data.length} dimensions`);
    console.log(`   First 5 values: [${Array.from(output.data).slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);
}

/**
 * Main
 */
async function main() {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║  Toolmap Embeddings Generator (LOCAL) ║');
    console.log('╚═══════════════════════════════════════╝\n');

    try {
        // 🧪 MODALITÀ TEST: Decommenta per testare con un solo tool
        // await testSingleTool();
        // return;

        const tools = loadRegistry();
        const embeddings = await generateEmbeddings(tools);
        saveEmbeddings(embeddings);

        console.log('\n🎉 Done! Embeddings ready for offline search.\n');
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

main()
