import ts, * as typescript from "typescript";
import type { TransformerExtras, PluginConfig } from "ts-patch";

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
import { getSourceFileLocation } from "@ts-type-explorer/api/dist/util";
import { TypeFormatFlags, factory } from "typescript";
import { TypeFlags } from "ts-morph";

function getTypeInfoRetriever(ctx: TypescriptContext) {
  return async (location: SourceFileLocation) => {
    const typeTree = getTypeInfoAtRange(ctx, location, {
      referenceDefinedTypes: true,
    });

    return typeTree;
  };
}

function typeElementName(m: ts.TypeElement) {
  const propertyName = m.name;
  if (!propertyName) return null;

  if (typeof propertyName === "string") {
    return propertyName;
  } else if ("text" in propertyName) {
    return propertyName.text;
  } else {
    return null;
  }
}

export type TreeData =
  | {
      __trpc_board_type: "router";
      isRoot?: true;
      children: {
        name: string;
        treeData: TreeData;
      }[];
    }
  | {
      __trpc_board_type: "procedure";
      procedureType: "query" | "mutation";
      inputTypeString: string;
      outputTypeString: string;
      inputType: ParsedType;
      outputType: ParsedType;
    };

export type ParsedType =
  | {
      type: "string" | "number" | "bigint" | "boolean";
    }
  | {
      type: "null";
    }
  | {
      type: "undefined";
    }
  | {
      type: "void";
    }
  | {
      type: "object";
      properties: Record<string, ParsedType>;
    }
  | {
      type: "index";
      indexType: ParsedType;
      indexedType: ParsedType;
    }
  | {
      type: "union";
      options: Array<ParsedType>;
    }
  | {
      type: "literal";
      literalType: "string";
      literalValue: string;
    }
  | {
      type: "literal";
      literalType: "number";
      literalValue: number;
    }
  | {
      type: "Date";
    }
  | {
      type: "literal";
      literalType: "bigint";
      literalValue: bigint;
    }
  | {
      type: "literal";
      literalType: "boolean";
      literalValue: boolean;
    };

function valueToExpression(v: unknown): ts.Expression {
  if (typeof v === "number") {
    return factory.createNumericLiteral(v);
  } else if (typeof v === "string") {
    return factory.createStringLiteral(v);
  } else if (typeof v === "boolean") {
    if (v) {
      return factory.createTrue();
    } else {
      return factory.createFalse();
    }
  } else if (typeof v === "object") {
    if (v === null) {
      return factory.createNull();
    } else if (Array.isArray(v)) {
      return factory.createArrayLiteralExpression(v.map(valueToExpression));
    } else {
      const ov = v as Record<string, unknown>;

      const propertyAssignments = Object.entries(ov).map(([name, value]) =>
        factory.createPropertyAssignment(name, valueToExpression(value))
      );

      return factory.createObjectLiteralExpression(propertyAssignments);
    }
  }

  return factory.createStringLiteral(JSON.stringify(v) + Array.isArray(v));
}

/** Changes string literal 'before' to 'after' */
export default function (
  program: typescript.Program,
  pluginConfig: PluginConfig,
  { ts }: TransformerExtras
) {
  return (ctx: typescript.TransformationContext) => {
    const { factory } = ctx;

    const typeChecker = program.getTypeChecker();

    return (sourceFile: typescript.SourceFile) => {
      function visit(node: typescript.Node): typescript.Node {
        if (ts.isCallExpression(node) && node.expression.getText() === "a") {
          const argument = node.typeArguments?.[0]!;

          const argumentType = typeChecker.getTypeAtLocation(argument);

          const argumentTypeNode = typeChecker.typeToTypeNode(
            argumentType,
            undefined,
            ts.NodeBuilderFlags.NoTruncation
          )!;

          function inner(
            tn: typescript.TypeNode,
            depth: number = 0
          ): typescript.ObjectLiteralExpression {
            // console.log(
            //   " ".repeat(depth),
            //   // tn.,
            //   typescript.SyntaxKind[tn.kind]
            // );
            if (ts.isTypeLiteralNode(tn)) {
              const indexSignature = tn.members.find((m) => {
                return ts.isIndexSignatureDeclaration(m);
              });
              if (
                indexSignature !== undefined &&
                ts.isIndexSignatureDeclaration(indexSignature)
              ) {
                indexSignature;
                return factory.createObjectLiteralExpression([
                  factory.createPropertyAssignment(
                    "type",
                    factory.createStringLiteral("index")
                  ),
                  factory.createPropertyAssignment(
                    "indexedType",
                    inner(indexSignature.type)
                  ),
                ]);
              }
              const propertyAssignments = tn.members.flatMap((m) => {
                if (ts.isPropertySignature(m)) {
                  const propertyName = typeElementName(m);
                  const propertyType = m.type;

                  if (propertyType && propertyName) {
                    return [
                      factory.createPropertyAssignment(
                        propertyName,
                        inner(propertyType, depth + 1)
                      ),
                    ];
                  }
                }
                return [];
              });

              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("object")
                ),
                factory.createPropertyAssignment(
                  "properties",
                  factory.createObjectLiteralExpression(propertyAssignments)
                ),
              ]);
            } else if (ts.isUnionTypeNode(tn)) {
              const types = tn.types.map((t) => inner(t, depth + 1));
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("union")
                ),
                factory.createPropertyAssignment(
                  "options",
                  factory.createArrayLiteralExpression(types)
                ),
              ]);
            } else if (tn.kind === ts.SyntaxKind.StringKeyword) {
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("string")
                ),
              ]);
            } else if (tn.kind === ts.SyntaxKind.NumberKeyword) {
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("number")
                ),
              ]);
            } else if (tn.kind === ts.SyntaxKind.BooleanKeyword) {
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("boolean")
                ),
              ]);
            } else if (tn.kind === ts.SyntaxKind.NullKeyword) {
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("null")
                ),
              ]);
            } else if (tn.kind === ts.SyntaxKind.UndefinedKeyword) {
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("undefined")
                ),
              ]);
            } else if (tn.kind === ts.SyntaxKind.VoidKeyword) {
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("void")
                ),
              ]);
            } else if (ts.isTypeReferenceNode(tn)) {
              if (ts.isIdentifier(tn.typeName)) {
                return factory.createObjectLiteralExpression([
                  factory.createPropertyAssignment(
                    "type",
                    factory.createStringLiteral("reference")
                  ),
                  factory.createPropertyAssignment(
                    "typeName",
                    factory.createStringLiteral(tn.typeName.text)
                  ),
                ]);
              }
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("reference")
                ),
                factory.createPropertyAssignment(
                  "typeName",
                  factory.createStringLiteral("unknown")
                ),
              ]);
            } else if (ts.isLiteralTypeNode(tn)) {
              let literalType: string;
              let literalValue: ts.Expression;

              switch (tn.literal.kind) {
                case ts.SyntaxKind.StringLiteral:
                  literalType = "string";
                  literalValue = factory.createStringLiteral(tn.literal.text);
                  break;
                case ts.SyntaxKind.NumericLiteral:
                  literalType = "number";
                  literalValue = factory.createNumericLiteral(tn.literal.text);
                  break;
                case ts.SyntaxKind.TrueKeyword:
                  literalType = "boolean";
                  literalValue = factory.createTrue();
                  break;
                case ts.SyntaxKind.FalseKeyword:
                  literalType = "boolean";
                  literalValue = factory.createFalse();
                  break;
                default:
                  literalType = "unknown";
                  literalValue = factory.createStringLiteral("unknown");
              }

              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("literal")
                ),
                factory.createPropertyAssignment(
                  "literalType",
                  factory.createStringLiteral(literalType)
                ),
                factory.createPropertyAssignment("value", literalValue),
              ]);
            } else {
              return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(
                  "type",
                  factory.createStringLiteral("unknown")
                ),
                factory.createPropertyAssignment(
                  "kind",
                  factory.createStringLiteral(typescript.SyntaxKind[tn.kind])
                ),
              ]);
            }
          }

          function routersInner(
            tn: typescript.TypeNode,
            depth: number = 0
          ): typescript.ObjectLiteralExpression {
            if (ts.isTypeLiteralNode(tn)) {
              if (
                tn.members.some(
                  (m) => typeElementName(m) === "__trpc_board_procedure"
                )
              ) {
                const inputNode = tn.members.find(
                  (m) => typeElementName(m) === "input"
                );
                const outputNode = tn.members.find(
                  (m) => typeElementName(m) === "output"
                );

                if (
                  !inputNode ||
                  !outputNode ||
                  !ts.isPropertySignature(inputNode) ||
                  !ts.isPropertySignature(outputNode) ||
                  !inputNode.type ||
                  !outputNode.type
                ) {
                  return factory.createObjectLiteralExpression([]);
                }

                const inputTypeString = typeChecker.typeToString(
                  typeChecker.getTypeFromTypeNode(inputNode.type)
                );
                const outputTypeString = typeChecker.typeToString(
                  typeChecker.getTypeFromTypeNode(outputNode.type)
                );

                return factory.createObjectLiteralExpression([
                  factory.createPropertyAssignment(
                    "__trpc_board_procedure",
                    factory.createTrue()
                  ),
                  factory.createPropertyAssignment(
                    "input",
                    inner(inputNode.type)
                  ),
                  factory.createPropertyAssignment(
                    "output",
                    inner(outputNode.type)
                  ),
                  factory.createPropertyAssignment(
                    "inputTypeString",
                    factory.createStringLiteral(inputTypeString)
                  ),
                  factory.createPropertyAssignment(
                    "outputTypeString",
                    factory.createStringLiteral(outputTypeString)
                  ),
                ]);
              }

              const propertyAssignments = tn.members.flatMap((m) => {
                if (ts.isPropertySignature(m)) {
                  const propertyName = typeElementName(m);
                  const propertyType = m.type;

                  if (propertyType && propertyName) {
                    return [
                      factory.createPropertyAssignment(
                        propertyName,
                        routersInner(propertyType, depth + 1)
                      ),
                    ];
                  }
                }
                return [];
              });

              return factory.createObjectLiteralExpression(propertyAssignments);
            }

            return factory.createObjectLiteralExpression([]);
          }

          function inner2(t: ts.Type, depth: number = 0): ParsedType {
            let result: ParsedType | null = null;

            if (t.flags & TypeFlags.String) {
              return {
                type: "string",
              };
            } else if (t.flags & TypeFlags.Number) {
              return {
                type: "number",
              };
            } else if (t.flags & TypeFlags.BigInt) {
              return {
                type: "bigint",
              };
            } else if (t.flags & TypeFlags.Boolean && !t.aliasSymbol) {
              return {
                type: "boolean",
              };
            } else if (t.flags & TypeFlags.StringLiteral) {
              return {
                type: "literal",
                literalType: "string",
                literalValue: (t as ts.StringLiteralType).value,
              };
            } else if (t.flags & TypeFlags.NumberLiteral) {
              return {
                type: "literal",
                literalType: "number",
                literalValue: (t as ts.NumberLiteralType).value,
              };
            } else if (t.flags & TypeFlags.BigIntLiteral) {
              throw "not implemented";
            } else if (t.flags & TypeFlags.BooleanLiteral) {
              return {
                type: "literal",
                literalType: "boolean",
                literalValue: (t as any).intrinsicName === "true",
              };
            } else if (t.flags & TypeFlags.Undefined) {
              return {
                type: "undefined",
              };
            } else if (t.flags & TypeFlags.Void) {
              return {
                type: "void",
              };
            } else if (t.flags & TypeFlags.Null) {
              return {
                type: "null",
              };
            } else {
              const objectFlags: ts.ObjectFlags =
                (t as ts.ObjectType).objectFlags ?? 0;

              if (t.isUnion()) {
                // console.log("HEEY", t.types.map(inner2), "HEY");
                return {
                  type: "union",
                  options: t.types.map(inner2),
                };
              } else if (t.symbol?.escapedName === "Date") {
                return {
                  type: "Date",
                };
              } else {
                const indexInfo = typeChecker.getIndexInfosOfType(t)[0];

                if (indexInfo) {
                  return {
                    type: "index",
                    indexType: inner2(indexInfo.keyType),
                    indexedType: inner2(indexInfo.type),
                  };
                }

                const properties = Object.fromEntries(
                  typeChecker.getPropertiesOfType(t).map((p) => {
                    const name = p.getName();
                    const type = typeChecker.getTypeOfSymbolAtLocation(
                      p,
                      sourceFile
                    );

                    // console.log(
                    //   " ".repeat(depth),
                    //   name
                    //   // p.getDocumentationComment(undefined),
                    //   // p.getJsDocTags(undefined)
                    // );

                    if (type.symbol?.escapedName === "Date") {
                      console.log();
                      return [
                        name,
                        {
                          type: "Date",
                        } as ParsedType,
                      ];
                    }

                    // if (name === "record") {
                    //   console.warn(type);
                    // }

                    // return factory.createPropertyAssignment(
                    //   name,
                    //   inner2(type, depth + 1)
                    // );
                    return [name, inner2(type, depth + 1)];
                  })
                );

                result = {
                  type: "object",
                  properties,
                };
              }
            }

            return result;
          }

          function routersInner2(
            t: ts.Type,
            depth: number = 0,
            isRoot: boolean = false
          ): TreeData {
            // if (depth > 2) {
            // return factory.createObjectLiteralExpression([]);
            // }

            const properties = typeChecker.getPropertiesOfType(t);

            if (
              properties.some((m) => m.getName() === "__trpc_board_procedure")
            ) {
              const inputSymbol = properties.find(
                (m) => m.getName() === "input"
              );
              const outputSymbol = properties.find(
                (m) => m.getName() === "output"
              );

              const procedureTypeSymbol = properties.find(
                (m) => m.getName() === "procedureType"
              );

              if (!inputSymbol || !outputSymbol || !procedureTypeSymbol) {
                // return factory.createObjectLiteralExpression([]);
                return {
                  __trpc_board_type: "router",
                  children: [],
                };
              }

              const inputType = typeChecker.getTypeOfSymbolAtLocation(
                inputSymbol,
                sourceFile
              );
              const outputType = typeChecker.getTypeOfSymbolAtLocation(
                outputSymbol,
                sourceFile
              );
              const procedureTypeType = typeChecker.getTypeOfSymbolAtLocation(
                procedureTypeSymbol,
                sourceFile
              );

              let procedureType: "query" | "mutation" = "query";
              if (
                procedureTypeType.isStringLiteral() &&
                procedureTypeType.value === "mutation"
              ) {
                procedureType = "mutation";
              }

              const inputTypeString = typeChecker.typeToString(inputType);
              const outputTypeString = typeChecker.typeToString(outputType);

              return {
                __trpc_board_type: "procedure",
                procedureType,
                inputType: inner2(inputType),
                outputType: inner2(outputType),
                inputTypeString,
                outputTypeString,
              };
            } else {
              const children = typeChecker.getPropertiesOfType(t).map((p) => {
                const name = p.getName();
                const type = typeChecker.getTypeOfSymbolAtLocation(
                  p,
                  sourceFile
                );

                console.log(
                  " ".repeat(depth),
                  name
                  // p.getDocumentationComment(undefined),
                  // p.getJsDocTags(undefined)
                );

                return { name, treeData: routersInner2(type, depth + 1) };
              });

              return {
                __trpc_board_type: "router",
                // isRoot: isRoot ? true : undefined,
                children,
                ...(isRoot ? { isRoot: true } : {}),
              };
            }
          }

          console.log(
            "hey"
            // typeChecker.typeToString(
            //   argumentType,
            //   undefined,
            //   ts.TypeFormatFlags.
            // )
          );

          const out = valueToExpression(routersInner2(argumentType, 0, true));

          // const out = valueToExpression({ a: true });

          return out;
        }

        return ts.visitEachChild(node, visit, ctx);
      }
      return ts.visitNode(sourceFile, visit);
    };
  };
}
