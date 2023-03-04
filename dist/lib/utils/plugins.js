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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverPlugins = exports.loadPlugins = void 0;
const FS = __importStar(require("fs"));
const Path = __importStar(require("path"));
const paths_1 = require("./paths");
const validation_1 = require("./validation");
function loadPlugins(app, plugins) {
    if (plugins.includes("none")) {
        return;
    }
    for (const plugin of plugins) {
        const pluginDisplay = getPluginDisplayName(plugin);
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const instance = require(plugin);
            const initFunction = instance.load;
            if (typeof initFunction === "function") {
                initFunction(app);
                app.logger.info(`Loaded plugin ${pluginDisplay}`);
            }
            else {
                app.logger.error(`Invalid structure in plugin ${pluginDisplay}, no load function found.`);
            }
        }
        catch (error) {
            app.logger.error(`The plugin ${pluginDisplay} could not be loaded.`);
            if (error instanceof Error && error.stack) {
                app.logger.error(error.stack);
            }
        }
    }
}
exports.loadPlugins = loadPlugins;
function discoverPlugins(app) {
    // If the plugin option is set, then automatic discovery is disabled, and we should just
    // return the plugins that the user has asked for.
    if (app.options.isSet("plugin")) {
        return app.options.getValue("plugin");
    }
    const result = [];
    discover();
    return result;
    /**
     * Find all parent folders containing a `node_modules` subdirectory.
     */
    function discover() {
        let path = process.cwd();
        let previous;
        do {
            const modules = Path.join(path, "node_modules");
            if (FS.existsSync(modules) && FS.statSync(modules).isDirectory()) {
                discoverModules(modules);
            }
            previous = path;
            path = Path.resolve(Path.join(previous, ".."));
        } while (previous !== path);
    }
    /**
     * Scan the given `node_modules` directory for TypeDoc plugins.
     */
    function discoverModules(basePath) {
        const candidates = [];
        FS.readdirSync(basePath).forEach((name) => {
            const dir = Path.join(basePath, name);
            if (name.startsWith("@") && FS.statSync(dir).isDirectory()) {
                FS.readdirSync(dir).forEach((n) => {
                    candidates.push(Path.join(name, n));
                });
            }
            candidates.push(name);
        });
        candidates.forEach((name) => {
            const infoFile = Path.join(basePath, name, "package.json");
            if (!FS.existsSync(infoFile)) {
                return;
            }
            const info = loadPackageInfo(app.logger, infoFile);
            if (isPlugin(info)) {
                result.push(Path.join(basePath, name));
            }
        });
    }
}
exports.discoverPlugins = discoverPlugins;
/**
 * Load and parse the given `package.json`.
 */
function loadPackageInfo(logger, fileName) {
    try {
        return require(fileName);
    }
    catch {
        logger.error(`Could not parse ${fileName}`);
        return {};
    }
}
const PLUGIN_KEYWORDS = ["typedocplugin", "typedoc-plugin", "typedoc-theme"];
/**
 * Test whether the given package info describes a TypeDoc plugin.
 */
function isPlugin(info) {
    if (!(0, validation_1.validate)({ keywords: [Array, String] }, info)) {
        return false;
    }
    return info.keywords.some((keyword) => PLUGIN_KEYWORDS.includes(keyword.toLocaleLowerCase()));
}
function getPluginDisplayName(plugin) {
    const path = (0, paths_1.nicePath)(plugin);
    if (path.startsWith("./node_modules/")) {
        return path.substring("./node_modules/".length);
    }
    return plugin;
}
//# sourceMappingURL=plugins.js.map