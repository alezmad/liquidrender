/**
 * AST-based Entity Extractor
 *
 * Uses the TypeScript Compiler API to parse source files and extract
 * structured entity information for the Cognitive Context System.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import ts from 'typescript';
import type {
  ExtractedEntity,
  ExtractedExport,
  ExtractedImport,
  EntityType,
  PropDefinition,
} from './types.js';

// ============================================
// Configuration
// ============================================

const DEFAULT_INCLUDE = ['**/*.ts', '**/*.tsx'];
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.d.ts',
];

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate SHA-256 hash of file content
 */
function calculateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Check if a name follows PascalCase convention (for component detection)
 */
function isPascalCase(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

/**
 * Check if an identifier starts with 'use' (hook convention)
 */
function isHookName(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

/**
 * Check if a path matches a glob-like pattern (simplified)
 */
function matchesPattern(path: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = path.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Convert glob to regex (simplified - handles ** and *)
  const regexPattern = normalizedPattern
    // Escape special regex chars (except * which we handle specially)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Handle **/ at the start (match any prefix including nothing)
    .replace(/^\*\*\//, '(?:.*\\/)?')
    // Handle /**/ in the middle (match any number of directories)
    .replace(/\/\*\*\//g, '(?:\\/.*\\/|\\/)')
    // Handle /** at the end (match any suffix)
    .replace(/\/\*\*$/, '(?:\\/.*)?')
    // Handle remaining ** (match anything)
    .replace(/\*\*/g, '.*')
    // Handle single * (match anything except /)
    .replace(/\*/g, '[^/]*');

  return new RegExp(`^${regexPattern}$`).test(normalizedPath);
}

/**
 * Check if a file should be included based on patterns
 */
function shouldIncludeFile(
  filePath: string,
  include: string[],
  exclude: string[]
): boolean {
  // Check exclusions first
  for (const pattern of exclude) {
    if (matchesPattern(filePath, pattern)) {
      return false;
    }
  }
  // Check inclusions
  for (const pattern of include) {
    if (matchesPattern(filePath, pattern)) {
      return true;
    }
  }
  return false;
}


/**
 * Check if a node contains JSX
 */
function containsJsx(node: ts.Node): boolean {
  let hasJsx = false;

  function visit(n: ts.Node): void {
    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      hasJsx = true;
      return;
    }
    ts.forEachChild(n, visit);
  }

  visit(node);
  return hasJsx;
}

/**
 * Extract type string from a TypeNode
 */
function typeNodeToString(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string {
  return typeNode.getText(sourceFile);
}

/**
 * Extract props from a type reference or interface
 */
function extractPropsFromType(
  node: ts.Node,
  sourceFile: ts.SourceFile
): PropDefinition[] | undefined {
  const props: PropDefinition[] = [];

  // Handle interface declarations
  if (ts.isInterfaceDeclaration(node)) {
    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const name = member.name.getText(sourceFile);
        const type = member.type ? typeNodeToString(member.type, sourceFile) : 'unknown';
        const required = !member.questionToken;

        // Extract JSDoc comment if present
        const jsDocComment = ts.getJSDocCommentsAndTags(member);
        let description: string | undefined;
        if (jsDocComment.length > 0) {
          const jsDoc = jsDocComment[0];
          if (ts.isJSDoc(jsDoc) && typeof jsDoc.comment === 'string') {
            description = jsDoc.comment;
          }
        }

        props.push({ name, type, required, description });
      }
    }
  }

  // Handle type literals
  if (ts.isTypeLiteralNode(node)) {
    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const name = member.name.getText(sourceFile);
        const type = member.type ? typeNodeToString(member.type, sourceFile) : 'unknown';
        const required = !member.questionToken;
        props.push({ name, type, required });
      }
    }
  }

  return props.length > 0 ? props : undefined;
}

// ============================================
// AST Extraction
// ============================================

interface ExtractionContext {
  sourceFile: ts.SourceFile;
  exports: ExtractedExport[];
  imports: ExtractedImport[];
  propsInterface?: ts.InterfaceDeclaration;
  hasJsxExport: boolean;
  defaultExportName?: string;
  namedExportsWithJsx: Set<string>;
  /** Track variable declarations that contain JSX for default export detection */
  variablesWithJsx: Set<string>;
  /** Track class declarations that extend React.Component or contain JSX */
  classesWithJsx: Set<string>;
}

/**
 * Visit all nodes in the source file to extract information
 */
function visitNode(node: ts.Node, ctx: ExtractionContext): void {
  const sourceFile = ctx.sourceFile;

  // Handle import declarations
  if (ts.isImportDeclaration(node)) {
    const moduleSpecifier = node.moduleSpecifier;
    if (ts.isStringLiteral(moduleSpecifier)) {
      const source = moduleSpecifier.text;
      const isRelative = source.startsWith('.') || source.startsWith('/');
      const specifiers: string[] = [];

      if (node.importClause) {
        // Default import
        if (node.importClause.name) {
          specifiers.push(node.importClause.name.text);
        }
        // Named imports
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const element of node.importClause.namedBindings.elements) {
              specifiers.push(element.name.text);
            }
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            specifiers.push(`* as ${node.importClause.namedBindings.name.text}`);
          }
        }
      }

      ctx.imports.push({ source, specifiers, isRelative });
    }
  }

  // Handle export declarations
  if (ts.isExportDeclaration(node)) {
    // Named exports: export { a, b } or export { a } from './module'
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        const line = sourceFile.getLineAndCharacterOfPosition(element.getStart()).line + 1;
        ctx.exports.push({
          name: element.name.text,
          kind: 'const', // Default, could be refined
          isDefault: false,
          line,
        });
      }
    }
  }

  // Handle export assignment (export default X)
  if (ts.isExportAssignment(node) && !node.isExportEquals) {
    const expression = node.expression;
    let name = 'default';

    if (ts.isIdentifier(expression)) {
      name = expression.text;
      ctx.defaultExportName = name;
      // Check if this identifier refers to a variable/class with JSX
      if (ctx.variablesWithJsx.has(name) || ctx.classesWithJsx.has(name)) {
        ctx.hasJsxExport = true;
      }
    } else if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
      if (containsJsx(expression)) {
        ctx.hasJsxExport = true;
      }
    }

    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    ctx.exports.push({
      name,
      kind: 'const',
      isDefault: true,
      line,
    });
  }

  // Handle function declarations with export
  if (ts.isFunctionDeclaration(node) && node.name) {
    const hasExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

    if (hasExport) {
      const name = node.name.text;
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      ctx.exports.push({
        name,
        kind: 'function',
        isDefault: !!isDefault,
        line,
      });

      if (containsJsx(node)) {
        if (isDefault) {
          ctx.hasJsxExport = true;
          ctx.defaultExportName = name;
        } else {
          ctx.namedExportsWithJsx.add(name);
        }
      }
    }
  }

  // Handle class declarations with export
  if (ts.isClassDeclaration(node) && node.name) {
    const hasExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
    const className = node.name.text;

    // Check if class contains JSX (for React class components)
    if (containsJsx(node)) {
      ctx.classesWithJsx.add(className);
      if (hasExport) {
        if (isDefault) {
          ctx.hasJsxExport = true;
          ctx.defaultExportName = className;
        } else {
          ctx.namedExportsWithJsx.add(className);
        }
      }
    }

    if (hasExport) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      ctx.exports.push({
        name: className,
        kind: 'class',
        isDefault: !!isDefault,
        line,
      });
    }
  }

  // Handle variable statements (both exported and non-exported)
  if (ts.isVariableStatement(node)) {
    const hasExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        const name = declaration.name.text;

        // Check if it's an arrow function or function expression with JSX
        let kind: ExtractedExport['kind'] = 'const';
        let hasJsx = false;
        if (declaration.initializer) {
          if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
            kind = 'function';
            if (containsJsx(declaration.initializer)) {
              hasJsx = true;
              ctx.variablesWithJsx.add(name);
            }
          }
        }

        if (hasExport) {
          const line = sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
          if (hasJsx) {
            ctx.namedExportsWithJsx.add(name);
          }
          ctx.exports.push({
            name,
            kind,
            isDefault: false,
            line,
          });
        }
      }
    }
  }

  // Handle interface declarations with export
  if (ts.isInterfaceDeclaration(node)) {
    const hasExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    const name = node.name.text;

    if (hasExport) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      ctx.exports.push({
        name,
        kind: 'interface',
        isDefault: false,
        line,
      });
    }

    // Track Props interfaces for component prop extraction
    if (name.endsWith('Props')) {
      ctx.propsInterface = node;
    }
  }

  // Handle type alias declarations with export
  if (ts.isTypeAliasDeclaration(node)) {
    const hasExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

    if (hasExport) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      ctx.exports.push({
        name: node.name.text,
        kind: 'type',
        isDefault: false,
        line,
      });
    }
  }

  // Handle enum declarations with export
  if (ts.isEnumDeclaration(node)) {
    const hasExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

    if (hasExport) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      ctx.exports.push({
        name: node.name.text,
        kind: 'enum',
        isDefault: false,
        line,
      });
    }
  }

  // Recurse into children
  ts.forEachChild(node, child => visitNode(child, ctx));
}

/**
 * Determine the entity type based on extracted information
 */
function determineEntityType(
  ctx: ExtractionContext,
  primaryName: string,
  sourceFile: ts.SourceFile
): EntityType {
  const fileName = sourceFile.fileName.toLowerCase();

  // Check for hook (use* naming convention)
  if (isHookName(primaryName)) {
    return 'hook';
  }

  // Check for React component (JSX + PascalCase)
  if (ctx.hasJsxExport && isPascalCase(primaryName)) {
    return 'component';
  }

  // Check named exports for components
  for (const name of ctx.namedExportsWithJsx) {
    if (isPascalCase(name)) {
      return 'component';
    }
  }

  // Check for Zod schema
  const hasZodImport = ctx.imports.some(i => i.source === 'zod' || i.source.startsWith('zod/'));
  if (hasZodImport) {
    return 'schema';
  }

  // Check for API endpoint patterns
  if (fileName.includes('/api/') || fileName.includes('route.')) {
    return 'endpoint';
  }

  // Check for type/interface files
  const hasOnlyTypeExports = ctx.exports.every(e => e.kind === 'type' || e.kind === 'interface');
  if (hasOnlyTypeExports && ctx.exports.length > 0) {
    const hasInterface = ctx.exports.some(e => e.kind === 'interface');
    return hasInterface ? 'interface' : 'type';
  }

  // Check for utility functions
  if (ctx.exports.some(e => e.kind === 'function') && !ctx.hasJsxExport) {
    return 'utility';
  }

  // Default to module
  return 'module';
}

// ============================================
// Public API
// ============================================

/**
 * Extract entities from a single TypeScript/TSX file
 *
 * @param filePath - Absolute path to the file
 * @returns Extracted entity information, or null if parsing fails
 */
export async function extractEntitiesFromFile(
  filePath: string
): Promise<ExtractedEntity | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const hash = calculateHash(content);
    const stats = await stat(filePath);

    // Determine script kind based on extension
    const ext = extname(filePath).toLowerCase();
    let scriptKind: ts.ScriptKind;
    switch (ext) {
      case '.tsx':
        scriptKind = ts.ScriptKind.TSX;
        break;
      case '.ts':
        scriptKind = ts.ScriptKind.TS;
        break;
      case '.jsx':
        scriptKind = ts.ScriptKind.JSX;
        break;
      case '.js':
        scriptKind = ts.ScriptKind.JS;
        break;
      default:
        scriptKind = ts.ScriptKind.TS;
    }

    // Parse the source file
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.ESNext,
      true,
      scriptKind
    );

    // Create extraction context
    const ctx: ExtractionContext = {
      sourceFile,
      exports: [],
      imports: [],
      hasJsxExport: false,
      namedExportsWithJsx: new Set(),
      variablesWithJsx: new Set(),
      classesWithJsx: new Set(),
    };

    // Visit all nodes
    ts.forEachChild(sourceFile, node => visitNode(node, ctx));

    // Determine primary name (default export or first named export)
    // Priority: default export > function exports > other exports
    let primaryName = 'unknown';
    const defaultExport = ctx.exports.find(e => e.isDefault);
    if (defaultExport) {
      primaryName = defaultExport.name !== 'default' ? defaultExport.name : ctx.defaultExportName || 'default';
    } else if (ctx.exports.length > 0) {
      // Prefer function exports over type/interface exports for naming
      const functionExport = ctx.exports.find(e => e.kind === 'function');
      const classExport = ctx.exports.find(e => e.kind === 'class');
      if (functionExport) {
        primaryName = functionExport.name;
      } else if (classExport) {
        primaryName = classExport.name;
      } else {
        primaryName = ctx.exports[0].name;
      }
    }

    // Determine entity type
    const entityType = determineEntityType(ctx, primaryName, sourceFile);

    // Extract props if it's a component
    let props: PropDefinition[] | undefined;
    if (entityType === 'component' && ctx.propsInterface) {
      props = extractPropsFromType(ctx.propsInterface, sourceFile);
    }

    return {
      name: primaryName,
      path: filePath,
      type: entityType,
      exports: ctx.exports,
      imports: ctx.imports,
      props,
      modifiedAt: stats.mtime,
      hash,
    };
  } catch (error) {
    // Return null for unparseable files
    console.error(`Failed to extract entities from ${filePath}:`, error);
    return null;
  }
}

/**
 * Check if a directory should be excluded based on patterns
 */
function shouldExcludeDirectory(relativePath: string, exclude: string[]): boolean {
  const normalizedPath = relativePath.replace(/\\/g, '/');

  for (const pattern of exclude) {
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Handle patterns like **/node_modules/** - extract the directory name
    const match = normalizedPattern.match(/^\*\*\/([^/*]+)\/\*\*$/);
    if (match) {
      const dirName = match[1];
      // Check if any part of the path matches this directory name
      const parts = normalizedPath.split('/');
      if (parts.includes(dirName)) {
        return true;
      }
    }

    // Check if the directory path matches the pattern directly
    if (matchesPattern(normalizedPath, normalizedPattern)) {
      return true;
    }

    // Check if appending /** would match (for directory patterns)
    if (matchesPattern(normalizedPath + '/', normalizedPattern.replace(/\*\*$/, ''))) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively get all TypeScript files in a directory
 */
async function getFilesRecursively(
  dir: string,
  include: string[],
  exclude: string[],
  baseDir: string
): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // Check if directory should be excluded
      if (!shouldExcludeDirectory(relativePath, exclude)) {
        const subFiles = await getFilesRecursively(fullPath, include, exclude, baseDir);
        files.push(...subFiles);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        if (shouldIncludeFile(relativePath, include, exclude)) {
          files.push(fullPath);
        }
      }
    }
  }

  return files;
}

export interface ExtractOptions {
  /**
   * Glob patterns for files to include
   * @default ['**\/*.ts', '**\/*.tsx']
   */
  include?: string[];

  /**
   * Glob patterns for files to exclude
   * @default ['**\/node_modules\/**', '**\/dist\/**', '**\/*.test.ts', ...]
   */
  exclude?: string[];
}

/**
 * Extract entities from all TypeScript files in a directory
 *
 * @param dir - Directory to scan
 * @param options - Include/exclude patterns
 * @returns Array of extracted entities
 */
export async function extractEntitiesFromDir(
  dir: string,
  options: ExtractOptions = {}
): Promise<ExtractedEntity[]> {
  const include = options.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;

  const files = await getFilesRecursively(dir, include, exclude, dir);
  const entities: ExtractedEntity[] = [];

  for (const file of files) {
    const entity = await extractEntitiesFromFile(file);
    if (entity) {
      // Convert absolute path to relative for storage
      entity.path = relative(dir, file);
      entities.push(entity);
    }
  }

  return entities;
}
