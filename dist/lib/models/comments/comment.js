"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comment = exports.CommentTag = void 0;
const utils_1 = require("../../utils");
function serializeDisplayPart(part) {
    switch (part.kind) {
        case "text":
        case "code":
            return part;
        case "inline-tag": {
            return {
                ...part,
                target: typeof part.target === "object"
                    ? part.target.id
                    : part.target,
            };
        }
    }
}
/**
 * A model that represents a single TypeDoc comment tag.
 *
 * Tags are stored in the {@link Comment.blockTags} property.
 */
class CommentTag {
    /**
     * Create a new CommentTag instance.
     */
    constructor(tag, text) {
        this.tag = tag;
        this.content = text;
    }
    clone() {
        const tag = new CommentTag(this.tag, Comment.cloneDisplayParts(this.content));
        if (this.name) {
            tag.name = this.name;
        }
        return tag;
    }
    toObject() {
        return {
            tag: this.tag,
            name: this.name,
            content: this.content.map(serializeDisplayPart),
        };
    }
}
exports.CommentTag = CommentTag;
/**
 * A model that represents a comment.
 *
 * Instances of this model are created by the CommentPlugin. You can retrieve comments
 * through the {@link DeclarationReflection.comment} property.
 */
class Comment {
    /**
     * Debugging utility for combining parts into a simple string. Not suitable for
     * rendering, but can be useful in tests.
     */
    static combineDisplayParts(parts) {
        let result = "";
        for (const item of parts || []) {
            switch (item.kind) {
                case "text":
                case "code":
                    result += item.text;
                    break;
                case "inline-tag":
                    result += `{${item.tag} ${item.text}}`;
                    break;
                default:
                    (0, utils_1.assertNever)(item);
            }
        }
        return result;
    }
    /**
     * Helper function to convert an array of comment display parts into markdown suitable for
     * passing into Marked. `urlTo` will be used to resolve urls to any reflections linked to with
     * `@link` tags.
     */
    static displayPartsToMarkdown(parts, urlTo) {
        const result = [];
        for (const part of parts) {
            switch (part.kind) {
                case "text":
                case "code":
                    result.push(part.text);
                    break;
                case "inline-tag":
                    switch (part.tag) {
                        case "@label":
                        case "@inheritdoc": // Shouldn't happen
                            break; // Not rendered.
                        case "@link":
                        case "@linkcode":
                        case "@linkplain": {
                            if (part.target) {
                                const url = typeof part.target === "string"
                                    ? part.target
                                    : urlTo(part.target);
                                const text = part.tag === "@linkcode"
                                    ? `<code>${part.text}</code>`
                                    : part.text;
                                result.push(url
                                    ? `<a href="${url}">${text}</a>`
                                    : part.text);
                            }
                            else {
                                result.push(part.text);
                            }
                            break;
                        }
                        default:
                            // Hmm... probably want to be able to render these somehow, so custom inline tags can be given
                            // special rendering rules. Future capability. For now, just render their text.
                            result.push(`{${part.tag} ${part.text}}`);
                            break;
                    }
                    break;
                default:
                    (0, utils_1.assertNever)(part);
            }
        }
        return result.join("");
    }
    /**
     * Helper utility to clone {@link Comment.summary} or {@link CommentTag.content}
     */
    static cloneDisplayParts(parts) {
        return parts.map((p) => ({ ...p }));
    }
    /**
     * Creates a new Comment instance.
     */
    constructor(summary = [], blockTags = [], modifierTags = new Set()) {
        /**
         * All associated block level tags.
         */
        this.blockTags = [];
        /**
         * All modifier tags present on the comment, e.g. `@alpha`, `@beta`.
         */
        this.modifierTags = new Set();
        this.summary = summary;
        this.blockTags = blockTags;
        this.modifierTags = modifierTags;
    }
    /**
     * Create a deep clone of this comment.
     */
    clone() {
        return new Comment(Comment.cloneDisplayParts(this.summary), this.blockTags.map((tag) => tag.clone()), new Set(this.modifierTags));
    }
    /**
     * Returns true if this comment is completely empty.
     * @internal
     */
    isEmpty() {
        return !this.hasVisibleComponent() && this.modifierTags.size === 0;
    }
    /**
     * Has this comment a visible component?
     *
     * @returns TRUE when this comment has a visible component.
     */
    hasVisibleComponent() {
        return (this.summary.some((x) => x.kind !== "text" || x.text !== "") ||
            this.blockTags.length > 0);
    }
    /**
     * Test whether this comment contains a tag with the given name.
     *
     * @param tagName  The name of the tag to look for.
     * @returns TRUE when this comment contains a tag with the given name, otherwise FALSE.
     */
    hasModifier(tagName) {
        return this.modifierTags.has(tagName);
    }
    removeModifier(tagName) {
        this.modifierTags.delete(tagName);
    }
    /**
     * Return the first tag with the given name.
     *
     * @param tagName  The name of the tag to look for.
     * @param paramName  An optional parameter name to look for.
     * @returns The found tag or undefined.
     */
    getTag(tagName) {
        return this.blockTags.find((tag) => tag.tag === tagName);
    }
    /**
     * Get all tags with the given tag name.
     */
    getTags(tagName) {
        return this.blockTags.filter((tag) => tag.tag === tagName);
    }
    getIdentifiedTag(identifier, tagName) {
        return this.blockTags.find((tag) => tag.tag === tagName && tag.name === identifier);
    }
    /**
     * Removes all block tags with the given tag name from the comment.
     * @param tagName
     */
    removeTags(tagName) {
        (0, utils_1.removeIf)(this.blockTags, (tag) => tag.tag === tagName);
    }
    toObject(serializer) {
        return {
            summary: this.summary.map(serializeDisplayPart),
            blockTags: serializer.toObjectsOptional(this.blockTags),
            modifierTags: this.modifierTags.size > 0
                ? Array.from(this.modifierTags)
                : undefined,
        };
    }
}
exports.Comment = Comment;
//# sourceMappingURL=comment.js.map