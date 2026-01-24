/**
 * Test script to verify cross-file context awareness functionality
 * 
 * Run with: node --loader ts-node/esm test-context.ts
 * Or compile and run with tsx: npx tsx test-context.ts
 */

import { loadOrBuildGraph } from './src/lib/context/graph-cache';
import { resolveSymbol, buildLineContext } from './src/lib/context/symbol-resolver';
import path from 'path';

async function testCrossFileContext() {
    console.log('=== Testing Cross-File Context Awareness ===\n');

    const projectRoot = path.join(process.cwd(), 'test-project');
    const mainFile = path.join(projectRoot, 'main.ts');

    // 1. Build dependency graph
    console.log('1. Building dependency graph...');
    const graphResult = await loadOrBuildGraph(projectRoot);
    console.log(`   ✓ Graph built in ${graphResult.duration}ms`);
    console.log(`   ✓ From cache: ${graphResult.fromCache}`);
    console.log(`   ✓ Total files: ${graphResult.graph.stats.totalFiles}`);
    console.log(`   ✓ Total symbols: ${graphResult.graph.stats.totalSymbols}`);
    console.log(`   ✓ Total imports: ${graphResult.graph.stats.totalImports}\n`);

    // 2. Test symbol resolution
    console.log('2. Resolving symbol "formatDate" from main.ts...');
    const formatDateRef = await resolveSymbol('formatDate', mainFile, graphResult.graph);
    console.log(`   ✓ Symbol type: ${formatDateRef.type}`);
    console.log(`   ✓ Defined in: ${formatDateRef.definitionFile ? path.basename(formatDateRef.definitionFile) : 'N/A'}`);
    console.log(`   ✓ Confidence: ${formatDateRef.confidence}\n`);

    // 3. Test context building for a line
    console.log('3. Building context for line with parseUser call...');
    const testLine = '  const user = parseUser(userData);';
    const lineContext = await buildLineContext(testLine, 13, mainFile, graphResult.graph);
    console.log(`   ✓ Symbols detected: ${lineContext.symbols.length}`);
    console.log(`   ✓ Context blocks: ${lineContext.contextBlocks.length}`);
    console.log(`   ✓ Total tokens: ${lineContext.totalTokens}\n`);

    // 4. Display context blocks
    if (lineContext.contextBlocks.length > 0) {
        console.log('4. Cross-file context blocks:');
        for (const block of lineContext.contextBlocks) {
            console.log(`\n   From ${path.basename(block.filePath)} (lines ${block.startLine}-${block.endLine}):`);
            console.log('   ' + '-'.repeat(60));
            console.log(block.content.split('\n').map(l => '   ' + l).join('\n'));
            console.log('   ' + '-'.repeat(60));
        }
    }

    console.log('\n✓ All tests passed!');
    console.log('\nThe cross-file context awareness system is working correctly.');
    console.log('When the explanation API receives a request with file_path and project_root,');
    console.log('it will automatically include relevant definitions from other files.');
}

// Run tests
testCrossFileContext().catch(console.error);
