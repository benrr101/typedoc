"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackagePlugin = void 0;
const Path = __importStar(require("path"));
const FS = __importStar(require("fs"));
const components_1 = require("../components");
const converter_1 = require("../converter");
const utils_1 = require("../../utils");
const fs_1 = require("../../utils/fs");
const paths_1 = require("../../utils/paths");
const minimalSourceFile_1 = require("../../utils/minimalSourceFile");
/**
 * A handler that tries to find the package.json and readme.md files of the
 * current project.
 */
let PackagePlugin = class PackagePlugin extends components_1.ConverterComponent {
    /**
     * Create a new PackageHandler instance.
     */
    initialize() {
        this.listenTo(this.owner, {
            [converter_1.Converter.EVENT_BEGIN]: this.onBegin,
            [converter_1.Converter.EVENT_RESOLVE_BEGIN]: this.onBeginResolve,
            [converter_1.Converter.EVENT_END]: () => {
                delete this.readmeFile;
                delete this.packageFile;
            },
        });
    }
    /**
     * Triggered when the converter begins converting a project.
     */
    onBegin(_context) {
        this.readmeFile = undefined;
        this.packageFile = undefined;
        // Path will be resolved already. This is kind of ugly, but...
        const noReadmeFile = this.readme.endsWith("none");
        if (!noReadmeFile && this.readme) {
            if (FS.existsSync(this.readme)) {
                this.readmeFile = this.readme;
            }
        }
        const packageAndReadmeFound = () => (noReadmeFile || this.readmeFile) && this.packageFile;
        const reachedTopDirectory = (dirName) => dirName === Path.resolve(Path.join(dirName, ".."));
        let dirName = Path.resolve((0, fs_1.getCommonDirectory)(this.application.options.getValue("entryPoints")));
        this.application.logger.verbose(`Begin readme.md/package.json search at ${(0, paths_1.nicePath)(dirName)}`);
        while (!packageAndReadmeFound() && !reachedTopDirectory(dirName)) {
            FS.readdirSync(dirName).forEach((file) => {
                const lowercaseFileName = file.toLowerCase();
                if (!noReadmeFile &&
                    !this.readmeFile &&
                    lowercaseFileName === "readme.md") {
                    this.readmeFile = Path.join(dirName, file);
                }
                if (!this.packageFile && lowercaseFileName === "package.json") {
                    this.packageFile = Path.join(dirName, file);
                }
            });
            dirName = Path.resolve(Path.join(dirName, ".."));
        }
    }
    /**
     * Triggered when the converter begins resolving a project.
     *
     * @param context  The context object describing the current state the converter is in.
     */
    onBeginResolve(context) {
        const project = context.project;
        if (this.readmeFile) {
            const readme = (0, utils_1.readFile)(this.readmeFile);
            const comment = context.converter.parseRawComment(new minimalSourceFile_1.MinimalSourceFile(readme, this.readmeFile));
            if (comment.blockTags.length || comment.modifierTags.size) {
                const ignored = [
                    ...comment.blockTags.map((tag) => tag.tag),
                    ...comment.modifierTags,
                ];
                this.application.logger.warn(`Block and modifier tags will be ignored within the readme:\n\t${ignored.join("\n\t")}`);
            }
            project.readme = comment.summary;
        }
        if (this.packageFile) {
            const packageInfo = JSON.parse((0, utils_1.readFile)(this.packageFile));
            if (!project.name) {
                if (!packageInfo.name) {
                    context.logger.warn('The --name option was not specified, and package.json does not have a name field. Defaulting project name to "Documentation".');
                    project.name = "Documentation";
                }
                else {
                    project.name = String(packageInfo.name);
                }
            }
            if (this.includeVersion) {
                if (packageInfo.version) {
                    project.name = `${project.name} - v${packageInfo.version}`;
                }
                else {
                    // since not all monorepo specifies a meaningful version to the main package.json
                    // this warning should be optional
                    if (this.entryPointStrategy !== utils_1.EntryPointStrategy.Packages) {
                        context.logger.warn("--includeVersion was specified, but package.json does not specify a version.");
                    }
                }
            }
        }
        else {
            if (!project.name) {
                context.logger.warn('The --name option was not specified, and no package.json was found. Defaulting project name to "Documentation".');
                project.name = "Documentation";
            }
            if (this.includeVersion) {
                // since not all monorepo specifies a meaningful version to the main package.json
                // this warning should be optional
                if (this.entryPointStrategy !== utils_1.EntryPointStrategy.Packages) {
                    context.logger.warn("--includeVersion was specified, but no package.json was found. Not adding package version to the documentation.");
                }
            }
        }
    }
};
__decorate([
    (0, utils_1.BindOption)("readme")
], PackagePlugin.prototype, "readme", void 0);
__decorate([
    (0, utils_1.BindOption)("includeVersion")
], PackagePlugin.prototype, "includeVersion", void 0);
__decorate([
    (0, utils_1.BindOption)("entryPointStrategy")
], PackagePlugin.prototype, "entryPointStrategy", void 0);
PackagePlugin = __decorate([
    (0, components_1.Component)({ name: "package" })
], PackagePlugin);
exports.PackagePlugin = PackagePlugin;
//# sourceMappingURL=PackagePlugin.js.map