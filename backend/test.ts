import * as ts from "typescript";
import tsserverlib from "typescript/lib/tsserverlibrary";
import * as fs from "fs";

import {
  getTypeInfoOfNode,
  TypeInfoResolver,
  SourceFileLocation,
  TypescriptContext,
  getTypeInfoAtRange,
  TypeInfo,
  LocalizedTypeInfo,
  LocalizedTypeInfoOrError,
} from "@ts-type-explorer/api";

import { _localizeTypeInfo } from "@ts-type-explorer/api/dist/localizedTree";

interface DocEntry {
  name?: string;
  fileName?: string;
  documentation?: string;
  type?: string;
  constructors?: DocEntry[];
  parameters?: DocEntry[];
  returnType?: string;
}

function getTypeInfoRetriever(ctx: TypescriptContext) {
  return async (location: SourceFileLocation) => {
    const typeTree = getTypeInfoAtRange(ctx, location, {
      referenceDefinedTypes: true,
    });

    return typeTree;
  };
}

/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions
): void {
  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();

  const ctx = { program, typeChecker: checker, ts: tsserverlib };

  const localizer = new TypeInfoResolver(getTypeInfoRetriever(ctx));

  async function recursively(ti: LocalizedTypeInfo, depth = 0) {
    if (!ti.symbol?.name) return;
    if (depth > 10) return;

    console.log(" ".repeat(depth) + ti.symbol?.name + " " + ti.kindText);

    if (ti.alias === "Date") return;

    const children = await localizer.localizeChildren(ti);

    for (const child of children) {
      await recursively(child, depth + 1);
    }
  }

  let output: unknown = {};

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, visit);
    }
  }

  // print out the doc
  fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));

  /** visit nodes finding exported classes */
  function visit(node: ts.Node) {
    // console.log("test");
    // console.log(ts.isTypeAliasDeclaration(node) && node.name.text);
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === "AppRouterOutputs"
    ) {
      // console.log(node.type);
      const typeInfo = getTypeInfoOfNode(ctx, node, {
        referenceDefinedTypes: true,
        maxDepth: 10,
      });
      if (typeInfo?.kind === "object") {
        localizer.localize(typeInfo).then((p) => recursively(p));
      }
    }
    // console.log(
    //   getTypeInfoOfNode(
    //     { program, typeChecker: checker, ts: tsserverlib },
    //     node
    //   )
    // );
    // Only consider exported nodes
    // if (!isNodeExported(node)) {
    //   return;
    // }
    // if (ts.isTypeAliasDeclaration(node) && node.name) {
    //   output.push({
    //     name: node.name.getText(),
    //     documentation: node.type.getText(),
    //   });
    //   let symbol = checker.getSymbolAtLocation(node.name);
    //   if (symbol) {
    //     output.push({
    //       documentation: JSON.stringify(
    //         getTypeInfoOfNode(
    //           { program, typeChecker: checker, ts: tsserverlib },
    //           node
    //         )
    //       ),
    //     });
    //   }
    // }

    if (ts.isClassDeclaration(node) && node.name) {
      // This is a top level class, get its symbol
      let symbol = checker.getSymbolAtLocation(node.name);
      if (symbol) {
        // output.push(serializeClass(symbol));
      }
      // No need to walk any further, class expressions/inner declarations
      // cannot be exported
    } else if (ts.isModuleDeclaration(node)) {
      // This is a namespace, visit its children
      ts.forEachChild(node, visit);
    }
  }

  /** Serialize a symbol into a json object */
  function serializeSymbol(symbol: ts.Symbol): DocEntry {
    return {
      name: symbol.getName(),
      documentation: ts.displayPartsToString(
        symbol.getDocumentationComment(checker)
      ),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
      ),
    };
  }

  /** Serialize a class symbol information */
  function serializeClass(symbol: ts.Symbol) {
    let details = serializeSymbol(symbol);

    // Get the construct signatures
    let constructorType = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration!
    );
    details.constructors = constructorType
      .getConstructSignatures()
      .map(serializeSignature);
    return details;
  }

  /** Serialize a signature (call or construct) */
  function serializeSignature(signature: ts.Signature) {
    return {
      parameters: signature.parameters.map(serializeSymbol),
      returnType: checker.typeToString(signature.getReturnType()),
      documentation: ts.displayPartsToString(
        signature.getDocumentationComment(checker)
      ),
    };
  }

  /** True if this is visible outside this file, false otherwise */
  function isNodeExported(node: ts.Node): boolean {
    return (
      (ts.getCombinedModifierFlags(node as ts.Declaration) &
        ts.ModifierFlags.Export) !==
        0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }
}

generateDocumentation(process.argv.slice(2), {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
});
