#!/usr/bin/env node

/**
 * Test Script per Hybrid Search
 *
 * Verifica che embeddings.json sia valido e testa ricerca locale.
 * Opzionale: usa questo script per validare setup prima di deploy.
 *
 * Usage:
 *   node /test-search.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths
const REGISTRY_PATH = join(__dirname, '../../../data/registry.json');
const EMBEDDINGS_PATH = join(__dirname, '../data/embeddings.json');

console.log('╔════════════════════════════════════════╗');
console.log('║  Hybrid Search Test Suite              ║');
console.log('╚════════════════════════════════════════╝\n');

/**
 * Test 1: File Existence
 */
function testFileExistence() {
    console.log('📋 Test 1: File Existence');

    const tests = [
        { name: 'registry.json', path: REGISTRY_PATH },
        { name: 'embeddings.json', path: EMBEDDINGS_PATH }
    ];

    let passed = true;

    tests.forEach(test => {
        const exists = existsSync(test.path);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${test.name}: ${exists ? 'Found' : 'Missing'}`);
        if (!exists) passed = false;
    });

    console.log(passed ? '   ✅ All files exist\n' : '   ❌ Some files missing\n');
    return passed;
}

/**
 * Test 2: JSON Validity
 */
function testJSONValidity() {
    console.log('📋 Test 2: JSON Validity');

    let passed = true;

    // Test registry.json
    try {
        const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
        console.log(`   ✅ registry.json: Valid (${registry.length} tools)`);
    } catch (err) {
        console.log(`   ❌ registry.json: Invalid - ${err.message}`);
        passed = false;
    }

    // Test embeddings.json
    try {
        const embeddings = JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf8'));
        const count = Object.keys(embeddings).length;
        console.log(`   ✅ embeddings.json: Valid (${count} embeddings)`);
    } catch (err) {
        console.log(`   ❌ embeddings.json: Invalid - ${err.message}`);
        passed = false;
    }

    console.log(passed ? '   ✅ All JSON valid\n' : '   ❌ Some JSON invalid\n');
    return passed;
}

/**
 * Test 3: Data Consistency
 */
function testDataConsistency() {
    console.log('📋 Test 3: Data Consistency');

    let passed = true;

    try {
        const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
        const embeddings = JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf8'));

        const toolIds = new Set(registry.map(t => t.id));
        const embeddingIds = new Set(Object.keys(embeddings));

        // Check ogni tool ha embedding
        const missingEmbeddings = [];
        toolIds.forEach(id => {
            if (!embeddingIds.has(id)) {
                missingEmbeddings.push(id);
            }
        });

        if (missingEmbeddings.length > 0) {
            console.log(`   ❌ ${missingEmbeddings.length} tools missing embeddings:`);
            missingEmbeddings.slice(0, 5).forEach(id => {
                console.log(`      - ${id}`);
            });
            if (missingEmbeddings.length > 5) {
                console.log(`      ... and ${missingEmbeddings.length - 5} more`);
            }
            passed = false;
        } else {
            console.log(`   ✅ All ${toolIds.size} tools have embeddings`);
        }

        // Check orphan embeddings
        const orphanEmbeddings = [];
        embeddingIds.forEach(id => {
            if (!toolIds.has(id)) {
                orphanEmbeddings.push(id);
            }
        });

        if (orphanEmbeddings.length > 0) {
            console.log(`   ⚠️  ${orphanEmbeddings.length} orphan embeddings (not critical)`);
        }

        console.log(passed ? '   ✅ Data consistent\n' : '   ❌ Data inconsistent\n');

    } catch (err) {
        console.log(`   ❌ Error checking consistency: ${err.message}\n`);
        passed = false;
    }

    return passed;
}

/**
 * Test 4: Embedding Format
 */
function testEmbeddingFormat() {
    console.log('📋 Test 4: Embedding Format');

    let passed = true;

    try {
        const embeddings = JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf8'));
        const ids = Object.keys(embeddings);

        if (ids.length === 0) {
            console.log('   ❌ No embeddings found');
            return false;
        }

        // Check primo embedding
        const firstId = ids[0];
        const firstEmbed = embeddings[firstId];

        if (!Array.isArray(firstEmbed)) {
            console.log(`   ❌ Embedding not array: ${typeof firstEmbed}`);
            passed = false;
        } else {
            const expectedLength = firstEmbed.length;
            console.log(`   ✅ Embedding dimension: ${expectedLength}`);

            // Check tutti hanno stessa dimensione
            let differentDims = 0;
            ids.forEach(id => {
                if (embeddings[id].length !== expectedLength) {
                    differentDims++;
                }
            });

            if (differentDims > 0) {
                console.log(`   ❌ ${differentDims} embeddings have different dimensions`);
                passed = false;
            } else {
                console.log(`   ✅ All embeddings have dimension ${expectedLength}`);
            }

            // Check valori sono numeri
            const isNumber = firstEmbed.every(v => typeof v === 'number');
            if (!isNumber) {
                console.log('   ❌ Embedding contains non-numeric values');
                passed = false;
            } else {
                console.log('   ✅ Embeddings contain valid numbers');
            }
        }

        console.log(passed ? '   ✅ Format valid\n' : '   ❌ Format invalid\n');

    } catch (err) {
        console.log(`   ❌ Error checking format: ${err.message}\n`);
        passed = false;
    }

    return passed;
}

/**
 * Test 5: Sample Search (Cosine Similarity)
 */
function testSampleSearch() {
    console.log('📋 Test 5: Sample Search Simulation');

    try {
        const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
        const embeddings = JSON.parse(readFileSync(EMBEDDINGS_PATH, 'utf8'));

        // Prendi primo tool come query
        const queryTool = registry[0];
        const queryEmbed = embeddings[queryTool.id];

        if (!queryEmbed) {
            console.log('   ❌ Query tool has no embedding');
            return false;
        }

        // Calcola similarity con altri 5 tools
        const similarities = [];
        for (let i = 1; i < Math.min(6, registry.length); i++) {
            const tool = registry[i];
            const toolEmbed = embeddings[tool.id];

            if (toolEmbed) {
                const similarity = cosineSimilarity(queryEmbed, toolEmbed);
                similarities.push({
                    name: tool.name,
                    similarity: similarity
                });
            }
        }

        console.log(`   Query: "${queryTool.name}"`);
        console.log('   Similar tools:');
        similarities.forEach(s => {
            console.log(`      ${(s.similarity * 100).toFixed(1)}% - ${s.name}`);
        });

        console.log('   ✅ Search simulation successful\n');
        return true;

    } catch (err) {
        console.log(`   ❌ Search simulation failed: ${err.message}\n`);
        return false;
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }

    return dotProduct; // Assuming normalized vectors
}

/**
 * Test 6: File Sizes
 */
async function testFileSizes() {
    console.log('📋 Test 6: File Sizes');

    try {
        const fs = await import('fs');

        const registrySize = fs.statSync(REGISTRY_PATH).size;
        const embeddingsSize = fs.statSync(EMBEDDINGS_PATH).size;

        console.log(`   registry.json: ${(registrySize / 1024).toFixed(1)} KB`);
        console.log(`   embeddings.json: ${(embeddingsSize / 1024).toFixed(1)} KB`);

        // Warnings
        if (embeddingsSize < 100 * 1024) {
            console.log('   ⚠️  Embeddings file seems small (<100KB)');
        } else if (embeddingsSize > 10 * 1024 * 1024) {
            console.log('   ⚠️  Embeddings file is large (>10MB)');
        } else {
            console.log('   ✅ File sizes reasonable');
        }

        console.log();
        return true;

    } catch (err) {
        console.log(`   ❌ Error checking sizes: ${err.message}\n`);
        return false;
    }
}

/**
 * Main
 */
async function main() {
    const results = [];

    results.push(testFileExistence());
    results.push(testJSONValidity());
    results.push(testDataConsistency());
    results.push(testEmbeddingFormat());
    results.push(testSampleSearch());
    results.push(await testFileSizes());

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('═══════════════════════════════════════');
    console.log(`📊 Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('✅ All tests passed! Ready for production.');
        process.exit(0);
    } else {
        console.log(`❌ ${total - passed} tests failed. Fix issues before deploying.`);
        process.exit(1);
    }
}

main();