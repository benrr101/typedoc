"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverSignatureComment = exports.discoverComment = void 0;
const typescript_1 = __importDefault(require("typescript"));
const models_1 = require("../../models");
const utils_1 = require("../../utils");
const declaration_1 = require("../../utils/options/declaration");
const paths_1 = require("../../utils/paths");
// Note: This does NOT include JSDoc syntax kinds. This is important!
// Comments from @typedef and @callback tags are handled specially by
// the JSDoc converter because we only want part of the comment when
// getting them.
const wantedKinds = {
    [models_1.ReflectionKind.Project]: [typescript_1.default.SyntaxKind.SourceFile],
    [models_1.ReflectionKind.Module]: [typescript_1.default.SyntaxKind.SourceFile],
    [models_1.ReflectionKind.Namespace]: [
        typescript_1.default.SyntaxKind.ModuleDeclaration,
        typescript_1.default.SyntaxKind.SourceFile,
        typescript_1.default.SyntaxKind.BindingElement,
        typescript_1.default.SyntaxKind.ExportSpecifier,
        typescript_1.default.SyntaxKind.NamespaceExport,
    ],
    [models_1.ReflectionKind.Enum]: [
        typescript_1.default.SyntaxKind.EnumDeclaration,
        typescript_1.default.SyntaxKind.VariableDeclaration,
    ],
    [models_1.ReflectionKind.EnumMember]: [
        typescript_1.default.SyntaxKind.EnumMember,
        // These here so that @enum gets comments
        typescript_1.default.SyntaxKind.PropertyAssignment,
        typescript_1.default.SyntaxKind.PropertySignature,
    ],
    [models_1.ReflectionKind.Variable]: [
        typescript_1.default.SyntaxKind.VariableDeclaration,
        typescript_1.default.SyntaxKind.BindingElement,
        typescript_1.default.SyntaxKind.ExportAssignment,
        typescript_1.default.SyntaxKind.PropertyAccessExpression,
    ],
    [models_1.ReflectionKind.Function]: [
        typescript_1.default.SyntaxKind.FunctionDeclaration,
        typescript_1.default.SyntaxKind.BindingElement,
        typescript_1.default.SyntaxKind.VariableDeclaration,
        typescript_1.default.SyntaxKind.ExportAssignment,
        typescript_1.default.SyntaxKind.PropertyAccessExpression,
    ],
    [models_1.ReflectionKind.Class]: [
        typescript_1.default.SyntaxKind.ClassDeclaration,
        typescript_1.default.SyntaxKind.BindingElement,
    ],
    [models_1.ReflectionKind.Interface]: [typescript_1.default.SyntaxKind.InterfaceDeclaration],
    [models_1.ReflectionKind.Constructor]: [typescript_1.default.SyntaxKind.Constructor],
    [models_1.ReflectionKind.Property]: [
        typescript_1.default.SyntaxKind.PropertyDeclaration,
        typescript_1.default.SyntaxKind.PropertySignature,
        typescript_1.default.SyntaxKind.BinaryExpression,
        typescript_1.default.SyntaxKind.PropertyAssignment,
        // class X { constructor(/** Comment */ readonly z: string) }
        typescript_1.default.SyntaxKind.Parameter,
    ],
    [models_1.ReflectionKind.Method]: [
        typescript_1.default.SyntaxKind.FunctionDeclaration,
        typescript_1.default.SyntaxKind.MethodDeclaration,
    ],
    [models_1.ReflectionKind.CallSignature]: [
        typescript_1.default.SyntaxKind.FunctionDeclaration,
        typescript_1.default.SyntaxKind.VariableDeclaration,
        typescript_1.default.SyntaxKind.MethodDeclaration,
        typescript_1.default.SyntaxKind.MethodDeclaration,
        typescript_1.default.SyntaxKind.PropertyDeclaration,
        typescript_1.default.SyntaxKind.PropertySignature,
        typescript_1.default.SyntaxKind.CallSignature,
    ],
    [models_1.ReflectionKind.IndexSignature]: [typescript_1.default.SyntaxKind.IndexSignature],
    [models_1.ReflectionKind.ConstructorSignature]: [typescript_1.default.SyntaxKind.ConstructSignature],
    [models_1.ReflectionKind.Parameter]: [typescript_1.default.SyntaxKind.Parameter],
    [models_1.ReflectionKind.TypeLiteral]: [typescript_1.default.SyntaxKind.TypeLiteral],
    [models_1.ReflectionKind.TypeParameter]: [typescript_1.default.SyntaxKind.TypeParameter],
    [models_1.ReflectionKind.Accessor]: [typescript_1.default.SyntaxKind.PropertyDeclaration],
    [models_1.ReflectionKind.GetSignature]: [typescript_1.default.SyntaxKind.GetAccessor],
    [models_1.ReflectionKind.SetSignature]: [typescript_1.default.SyntaxKind.SetAccessor],
    [models_1.ReflectionKind.ObjectLiteral]: [typescript_1.default.SyntaxKind.ObjectLiteralExpression],
    [models_1.ReflectionKind.TypeAlias]: [typescript_1.default.SyntaxKind.TypeAliasDeclaration],
    [models_1.ReflectionKind.Reference]: [
        typescript_1.default.SyntaxKind.NamespaceExport,
        typescript_1.default.SyntaxKind.ExportSpecifier,
    ],
};
function discoverComment(symbol, kind, logger, commentStyle) {
    // For a module comment, we want the first one defined in the file,
    // not the last one, since that will apply to the import or declaration.
    const reverse = !symbol.declarations?.some(typescript_1.default.isSourceFile);
    const discovered = [];
    for (const decl of symbol.declarations || []) {
        const text = decl.getSourceFile().text;
        if (wantedKinds[kind].includes(decl.kind)) {
            const node = declarationToCommentNode(decl);
            if (!node) {
                continue;
            }
            // Special behavior here! We temporarily put the implementation comment
            // on the reflection which contains all the signatures. This lets us pull
            // the comment on the implementation if some signature does not have a comment.
            // However, we don't want to skip the node if it is a reference to something.
            // See the gh1770 test for an example.
            if (kind & models_1.ReflectionKind.ContainsCallSignatures &&
                [
                    typescript_1.default.SyntaxKind.FunctionDeclaration,
                    typescript_1.default.SyntaxKind.MethodDeclaration,
                    typescript_1.default.SyntaxKind.Constructor,
                ].includes(node.kind) &&
                !node.body) {
                continue;
            }
            const comments = collectCommentRanges(typescript_1.default.getLeadingCommentRanges(text, node.pos));
            if (reverse) {
                comments.reverse();
            }
            const selectedDocComment = comments.find((ranges) => permittedRange(text, ranges, commentStyle));
            if (selectedDocComment) {
                discovered.push([decl.getSourceFile(), selectedDocComment]);
            }
        }
    }
    switch (discovered.length) {
        case 0:
            return undefined;
        case 1:
            return discovered[0];
        default: {
            logger.warn(`${symbol.name} has multiple declarations with a comment. An arbitrary comment will be used.`);
            const locations = discovered.map(([sf, [{ pos }]]) => {
                const path = (0, paths_1.nicePath)(sf.fileName);
                const line = typescript_1.default.getLineAndCharacterOfPosition(sf, pos).line + 1;
                return `${path}:${line}`;
            });
            logger.info(`The comments for ${symbol.name} are declared at:\n\t${locations.join("\n\t")}`);
            return discovered[0];
        }
    }
}
exports.discoverComment = discoverComment;
function discoverSignatureComment(declaration, commentStyle) {
    const node = declarationToCommentNode(declaration);
    if (!node) {
        return;
    }
    const text = node.getSourceFile().text;
    const comments = collectCommentRanges(typescript_1.default.getLeadingCommentRanges(text, node.pos));
    comments.reverse();
    const comment = comments.find((ranges) => permittedRange(text, ranges, commentStyle));
    if (comment) {
        return [node.getSourceFile(), comment];
    }
}
exports.discoverSignatureComment = discoverSignatureComment;
/**
 * Check whether the given module declaration is the topmost.
 *
 * This function returns TRUE if there is no trailing module defined, in
 * the following example this would be the case only for module `C`.
 *
 * ```
 * module A.B.C { }
 * ```
 *
 * @param node  The module definition that should be tested.
 * @return TRUE if the given node is the topmost module declaration, FALSE otherwise.
 */
function isTopmostModuleDeclaration(node) {
    return node.getChildren().some(typescript_1.default.isModuleBlock);
}
/**
 * Return the root module declaration of the given module declaration.
 *
 * In the following example this function would always return module
 * `A` no matter which of the modules was passed in.
 *
 * ```
 * module A.B.C { }
 * ```
 */
function getRootModuleDeclaration(node) {
    while (node.parent &&
        node.parent.kind === typescript_1.default.SyntaxKind.ModuleDeclaration) {
        const parent = node.parent;
        if (node.name.pos === parent.name.end + 1) {
            node = parent;
        }
        else {
            break;
        }
    }
    return node;
}
function declarationToCommentNode(node) {
    if (!node.parent)
        return node;
    // const abc = 123
    //       ^^^
    if (node.parent.kind === typescript_1.default.SyntaxKind.VariableDeclarationList) {
        return node.parent.parent;
    }
    // const a = () => {}
    //           ^^^^^^^^
    if (node.parent.kind === typescript_1.default.SyntaxKind.VariableDeclaration) {
        return node.parent.parent.parent;
    }
    // class X { y = () => {} }
    //               ^^^^^^^^
    // function Z() {}
    // Z.method = () => {}
    //            ^^^^^^^^
    // export default () => {}
    //                ^^^^^^^^
    if ([
        typescript_1.default.SyntaxKind.PropertyDeclaration,
        typescript_1.default.SyntaxKind.BinaryExpression,
        typescript_1.default.SyntaxKind.ExportAssignment,
    ].includes(node.parent.kind)) {
        return node.parent;
    }
    if (typescript_1.default.isModuleDeclaration(node)) {
        if (!isTopmostModuleDeclaration(node)) {
            return;
        }
        else {
            return getRootModuleDeclaration(node);
        }
    }
    if (node.kind === typescript_1.default.SyntaxKind.ExportSpecifier) {
        return node.parent.parent;
    }
    if ([typescript_1.default.SyntaxKind.NamespaceExport, typescript_1.default.SyntaxKind.FunctionType].includes(node.kind)) {
        return node.parent;
    }
    return node;
}
/**
 * Separate comment ranges into arrays so that multiple line comments are kept together
 * and each block comment is left on its own.
 */
function collectCommentRanges(ranges) {
    const result = [];
    let collect = [];
    for (const range of ranges || []) {
        collect.push(range);
        switch (range.kind) {
            case typescript_1.default.SyntaxKind.MultiLineCommentTrivia:
                if (collect.length) {
                    result.push(collect);
                    collect = [];
                }
                result.push([range]);
                break;
            case typescript_1.default.SyntaxKind.SingleLineCommentTrivia:
                collect.push(range);
                break;
            /* istanbul ignore next */
            default:
                (0, utils_1.assertNever)(range.kind);
        }
    }
    if (collect.length) {
        result.push(collect);
    }
    return result;
}
function permittedRange(text, ranges, commentStyle) {
    switch (commentStyle) {
        case declaration_1.CommentStyle.All:
            return true;
        case declaration_1.CommentStyle.Block:
            return ranges[0].kind === typescript_1.default.SyntaxKind.MultiLineCommentTrivia;
        case declaration_1.CommentStyle.Line:
            return ranges[0].kind === typescript_1.default.SyntaxKind.SingleLineCommentTrivia;
        case declaration_1.CommentStyle.JSDoc:
            return (ranges[0].kind === typescript_1.default.SyntaxKind.MultiLineCommentTrivia &&
                text[ranges[0].pos] === "/" &&
                text[ranges[0].pos + 1] === "*" &&
                text[ranges[0].pos + 2] === "*");
    }
}
//# sourceMappingURL=discovery.js.map