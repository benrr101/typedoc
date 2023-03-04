"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GroupPlugin_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupPlugin = void 0;
const index_1 = require("../../models/reflections/index");
const ReflectionGroup_1 = require("../../models/ReflectionGroup");
const components_1 = require("../components");
const converter_1 = require("../converter");
const sort_1 = require("../../utils/sort");
const utils_1 = require("../../utils");
const models_1 = require("../../models");
/**
 * A handler that sorts and groups the found reflections in the resolving phase.
 *
 * The handler sets the `groups` property of all container reflections.
 */
let GroupPlugin = GroupPlugin_1 = class GroupPlugin extends components_1.ConverterComponent {
    constructor() {
        super(...arguments);
        this.usedBoosts = new Set();
    }
    /**
     * Create a new GroupPlugin instance.
     */
    initialize() {
        this.listenTo(this.owner, {
            [converter_1.Converter.EVENT_RESOLVE_BEGIN]: () => {
                this.sortFunction = (0, sort_1.getSortFunction)(this.application.options);
            },
            [converter_1.Converter.EVENT_RESOLVE]: this.onResolve,
            [converter_1.Converter.EVENT_RESOLVE_END]: this.onEndResolve,
        });
    }
    /**
     * Triggered when the converter resolves a reflection.
     *
     * @param context  The context object describing the current state the converter is in.
     * @param reflection  The reflection that is currently resolved.
     */
    onResolve(_context, reflection) {
        reflection.kindString = GroupPlugin_1.getKindSingular(reflection.kind);
        if (reflection instanceof index_1.ContainerReflection) {
            this.group(reflection);
        }
    }
    /**
     * Triggered when the converter has finished resolving a project.
     *
     * @param context  The context object describing the current state the converter is in.
     */
    onEndResolve(context) {
        this.group(context.project);
        const unusedBoosts = new Set(Object.keys(this.boosts));
        for (const boost of this.usedBoosts) {
            unusedBoosts.delete(boost);
        }
        this.usedBoosts.clear();
        if (unusedBoosts.size &&
            this.application.options.isSet("searchGroupBoosts")) {
            context.logger.warn(`Not all groups specified in searchGroupBoosts were used in the documentation.` +
                ` The unused groups were:\n\t${Array.from(unusedBoosts).join("\n\t")}`);
        }
    }
    group(reflection) {
        if (reflection.children &&
            reflection.children.length > 0 &&
            !reflection.groups) {
            this.sortFunction(reflection.children);
            reflection.groups = this.getReflectionGroups(reflection.children);
        }
    }
    /**
     * Extracts the groups for a given reflection.
     *
     * @privateRemarks
     * If you change this, also update getCategories in CategoryPlugin accordingly.
     */
    getGroups(reflection) {
        const groups = new Set();
        function extractGroupTags(comment) {
            if (!comment)
                return;
            (0, utils_1.removeIf)(comment.blockTags, (tag) => {
                if (tag.tag === "@group") {
                    groups.add(models_1.Comment.combineDisplayParts(tag.content).trim());
                    return true;
                }
                return false;
            });
        }
        extractGroupTags(reflection.comment);
        for (const sig of reflection.getNonIndexSignatures()) {
            extractGroupTags(sig.comment);
        }
        if (reflection.type?.type === "reflection") {
            extractGroupTags(reflection.type.declaration.comment);
            for (const sig of reflection.type.declaration.getNonIndexSignatures()) {
                extractGroupTags(sig.comment);
            }
        }
        groups.delete("");
        if (groups.size === 0) {
            groups.add(GroupPlugin_1.getKindPlural(reflection.kind));
        }
        for (const group of groups) {
            if (group in this.boosts) {
                this.usedBoosts.add(group);
                reflection.relevanceBoost =
                    (reflection.relevanceBoost ?? 1) * this.boosts[group];
            }
        }
        return groups;
    }
    /**
     * Create a grouped representation of the given list of reflections.
     *
     * Reflections are grouped by kind and sorted by weight and name.
     *
     * @param reflections  The reflections that should be grouped.
     * @returns An array containing all children of the given reflection grouped by their kind.
     */
    getReflectionGroups(reflections) {
        const groups = new Map();
        reflections.forEach((child) => {
            for (const name of this.getGroups(child)) {
                let group = groups.get(name);
                if (!group) {
                    group = new ReflectionGroup_1.ReflectionGroup(name);
                    groups.set(name, group);
                }
                group.children.push(child);
            }
        });
        return Array.from(groups.values());
    }
    /**
     * Transform the internal typescript kind identifier into a human readable version.
     *
     * @param kind  The original typescript kind identifier.
     * @returns A human readable version of the given typescript kind identifier.
     */
    static getKindString(kind) {
        let str = index_1.ReflectionKind[kind];
        str = str.replace(/(.)([A-Z])/g, (_m, a, b) => a + " " + b.toLowerCase());
        return str;
    }
    /**
     * Return the singular name of a internal typescript kind identifier.
     *
     * @param kind The original internal typescript kind identifier.
     * @returns The singular name of the given internal typescript kind identifier
     */
    static getKindSingular(kind) {
        if (kind in GroupPlugin_1.SINGULARS) {
            return GroupPlugin_1.SINGULARS[kind];
        }
        else {
            return GroupPlugin_1.getKindString(kind);
        }
    }
    /**
     * Return the plural name of a internal typescript kind identifier.
     *
     * @param kind The original internal typescript kind identifier.
     * @returns The plural name of the given internal typescript kind identifier
     */
    static getKindPlural(kind) {
        if (kind in GroupPlugin_1.PLURALS) {
            return GroupPlugin_1.PLURALS[kind];
        }
        else {
            return this.getKindString(kind) + "s";
        }
    }
};
/**
 * Define the singular name of individual reflection kinds.
 */
GroupPlugin.SINGULARS = {
    [index_1.ReflectionKind.Enum]: "Enumeration",
    [index_1.ReflectionKind.EnumMember]: "Enumeration Member",
};
/**
 * Define the plural name of individual reflection kinds.
 */
GroupPlugin.PLURALS = {
    [index_1.ReflectionKind.Class]: "Classes",
    [index_1.ReflectionKind.Property]: "Properties",
    [index_1.ReflectionKind.Enum]: "Enumerations",
    [index_1.ReflectionKind.EnumMember]: "Enumeration Members",
    [index_1.ReflectionKind.TypeAlias]: "Type Aliases",
};
__decorate([
    (0, utils_1.BindOption)("searchGroupBoosts")
], GroupPlugin.prototype, "boosts", void 0);
GroupPlugin = GroupPlugin_1 = __decorate([
    (0, components_1.Component)({ name: "group" })
], GroupPlugin);
exports.GroupPlugin = GroupPlugin;
//# sourceMappingURL=GroupPlugin.js.map