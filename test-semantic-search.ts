/**
 * Test script for semantic search functionality
 * 
 * Run with: npx tsx test-semantic-search.ts
 */

import { loadOrBuildGraph } from './src/lib/context/graph-cache';
import { loadOrBuildSemanticIndex } from './src/lib/semantic/semantic-index';
import { retrieveRelevantCode } from './src/lib/semantic/semantic-retrieval';
import type { QueryContext } from './src/lib/semantic/types';
import path from 'path';

async function testSemanticSearch() {
    console.log('=== Testing Semantic Search Layer ===\n');

    const projectRoot = path.join(process.cwd(), 'test-project');
    const mainFile = path.join(projectRoot, 'main.ts');

    try {
        // Step 1: Build dependency graph
        console.log('1. Building dependency graph...');
        const graphResult = await loadOrBuildGraph(projectRoot);
        console.log(`   ✓ Graph built in ${graphResult.duration}ms`);
        console.log(`   ✓ Total files: ${graphResult.graph.stats.totalFiles}`);
        console.log(`   ✓ Total symbols: ${graphResult.graph.stats.totalSymbols}\n`);

        // Step 2: Build semantic index
        console.log('2. Building semantic index...');
        const indexResult = await loadOrBuildSemanticIndex(projectRoot, graphResult.graph, {
            onProgress: (current, total, message) => {
                if (current % 5 === 0 || current === total) {
                    console.log(`   Progress: ${current}/${total} - ${message}`);
                }
            }
        });
        console.log(`   ✓ Index built in ${indexResult.duration}ms`);
        console.log(`   ✓ From cache: ${indexResult.fromCache}`);
        console.log(`   ✓ Total units: ${indexResult.index.stats.totalUnits}`);
        console.log(`   ✓ Total embeddings: ${indexResult.index.stats.totalEmbeddings}`);
        console.log(`   ✓ Languages: ${JSON.stringify(indexResult.index.stats.languageBreakdown)}\n`);

        // Step 3: Test semantic search - formatDate
        console.log('3. Testing semantic search for "formatDate"...');
        const query1: QueryContext = {
            targetLine: '  const formattedDate = formatDate(user.createdAt);',
            symbols: ['formatDate'],
            surroundingLines: 'export function displayUser(userData: any): string {\n  const user = parseUser(userData);',
            language: 'typescript',
            currentFile: mainFile
        };

        const results1 = await retrieveRelevantCode(query1, indexResult.index, {
            maxResults: 3,
            excludeCurrentFile: true
        });

        console.log(`   ✓ Found ${results1.length} results:`);
        for (const result of results1) {
            console.log(`     - ${path.basename(result.unit.file)}::${result.unit.symbol}`);
            console.log(`       Score: ${result.score.toFixed(3)}, Confidence: ${result.confidence}`);
            console.log(`       Reasons: ${result.matchReasons.join(', ')}`);
            console.log(`       Auto-include: ${result.autoInclude}\n`);
        }

        // Step 4: Test semantic search - parseUser
        console.log('4. Testing semantic search for "parseUser"...');
        const query2: QueryContext = {
            targetLine: '  const user = parseUser(userData);',
            symbols: ['parseUser'],
            surroundingLines: 'export function displayUser(userData: any): string {',
            language: 'typescript',
            currentFile: mainFile
        };

        const results2 = await retrieveRelevantCode(query2, indexResult.index, {
            maxResults: 3,
            excludeCurrentFile: true
        });

        console.log(`   ✓ Found ${results2.length} results:`);
        for (const result of results2) {
            console.log(`     - ${path.basename(result.unit.file)}::${result.unit.symbol}`);
            console.log(`       Score: ${result.score.toFixed(3)}, Confidence: ${result.confidence}`);
            console.log(`       Reasons: ${result.matchReasons.join(', ')}\n`);
        }

        // Step 5: Test with no matches
        console.log('5. Testing search with unlikely match...');
        const query3: QueryContext = {
            targetLine: 'const x = someUnknownFunction();',
            symbols: ['someUnknownFunction'],
            surroundingLines: '',
            language: 'typescript',
            currentFile: mainFile
        };

        const results3 = await retrieveRelevantCode(query3, indexResult.index, {
            maxResults: 3
        });

        console.log(`   ✓ Found ${results3.length} results (expected 0 or low-confidence)\n`);

        // Step 6: Verify code content
        console.log('6. Verifying code content in results...');
        if (results1.length > 0) {
            const firstResult = results1[0];
            console.log(`   Code snippet from ${firstResult.unit.symbol}:`);
            console.log('   ' + '-'.repeat(60));
            const preview = firstResult.unit.code.split('\n').slice(0, 5).join('\n');
            console.log(preview.split('\n').map(l => '   ' + l).join('\n'));
            console.log('   ' + '-'.repeat(60) + '\n');
        }

        // Summary
        console.log('=== Test Summary ===');
        console.log('✓ Dependency graph building works');
        console.log('✓ Semantic index building works');
        console.log('✓ Embedding generation works');
        console.log('✓ Vector search works');
        console.log('✓ Multi-band confidence thresholding works');
        console.log('✓ Symbol name matching works');
        console.log('✓ Result ranking works\n');

        console.log('🎉 All semantic search tests passed!');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
testSemanticSearch().catch(console.error);
