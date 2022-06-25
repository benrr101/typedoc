import { deepStrictEqual as equal, ok } from "assert";
import type { Application } from "../lib/application";
import {
    DeclarationReflection,
    ProjectReflection,
    QueryType,
    ReflectionKind,
    SignatureReflection,
    ReflectionType,
    Comment,
    CommentTag,
    UnionType,
    LiteralType,
    IntrinsicType,
} from "../lib/models";
import type { InlineTagDisplayPart } from "../lib/models/comments/comment";
import { getConverter2App } from "./programs";
import type { TestLogger } from "./TestLogger";

function query(project: ProjectReflection, name: string) {
    const reflection = project.getChildByName(name);
    ok(reflection instanceof DeclarationReflection, `Failed to find ${name}`);
    return reflection;
}

export const issueTests: {
    [issue: `pre${string}`]: (app: Application) => void;
    [issue: `gh${string}`]: (
        project: ProjectReflection,
        logger: TestLogger
    ) => void;
} = {
    gh567(project) {
        const foo = query(project, "foo");
        const sig = foo.signatures?.[0];
        ok(sig, "Missing signature");
        ok(sig.comment, "No comment for signature");
        const param = sig.parameters?.[0];
        equal(param?.name, "x");
        equal(
            Comment.combineDisplayParts(param.comment?.summary),
            "JSDoc style param name"
        );
    },

    gh671(project) {
        const toNumber = query(project, "toNumber");
        const sig = toNumber.signatures?.[0];
        ok(sig, "Missing signatures");

        const paramComments = sig.parameters?.map((param) =>
            Comment.combineDisplayParts(param.comment?.summary)
        );
        equal(paramComments, [
            "the string to parse as a number",
            "whether to parse as an integer or float",
        ]);
    },

    gh869(project) {
        const classFoo = project.children?.find(
            (r) => r.name === "Foo" && r.kind === ReflectionKind.Class
        );
        ok(classFoo instanceof DeclarationReflection);
        equal(
            classFoo.children?.find((r) => r.name === "x"),
            undefined
        );

        const nsFoo = project.children?.find(
            (r) => r.name === "Foo" && r.kind === ReflectionKind.Namespace
        );
        ok(nsFoo instanceof DeclarationReflection);
        ok(nsFoo.children?.find((r) => r.name === "x"));
    },

    gh1124(project) {
        equal(
            project.children?.length,
            1,
            "Namespace with type and value converted twice"
        );
    },

    gh1150(project) {
        const refl = query(project, "IntersectFirst");
        equal(refl?.kind, ReflectionKind.TypeAlias);
        equal(refl.type?.type, "indexedAccess");
    },

    gh1164(project) {
        const refl = query(project, "gh1164");
        equal(
            Comment.combineDisplayParts(
                refl.signatures?.[0]?.parameters?.[0]?.comment?.summary
            ),
            "{@link CommentedClass} Test description."
        );
        const tag = refl.signatures?.[0]?.comment?.blockTags.find(
            (x) => x.tag === "@returns"
        );
        ok(tag);
        equal(Comment.combineDisplayParts(tag.content), "Test description.");
    },

    gh1215(project) {
        const foo = query(project, "Foo.bar");
        ok(foo.setSignature instanceof SignatureReflection);
        equal(foo.setSignature.type?.toString(), "void");
    },

    gh1255(project) {
        const foo = query(project, "C.foo");
        equal(Comment.combineDisplayParts(foo.comment?.summary), "Docs!");
    },

    gh1330(project) {
        const example = query(project, "ExampleParam");
        equal(example?.type?.type, "reference");
        equal(example.type.toString(), "Example");
    },

    gh1366(project) {
        const foo = query(project, "GH1366.Foo");
        equal(foo.kind, ReflectionKind.Reference);
    },

    gh1408(project) {
        const foo = query(project, "foo");
        const type = foo?.signatures?.[0]?.typeParameters?.[0].type;
        equal(type?.type, "array");
        equal(type?.toString(), "unknown[]");
    },

    gh1436(project) {
        equal(
            project.children?.map((c) => c.name),
            ["gh1436"]
        );
    },

    gh1449(project) {
        const refl = query(project, "gh1449").signatures?.[0];
        equal(
            refl?.typeParameters?.[0].type?.toString(),
            "[foo: any, bar?: any]"
        );
    },

    gh1454(project) {
        const foo = query(project, "foo");
        const fooRet = foo?.signatures?.[0]?.type;
        equal(fooRet?.type, "reference");
        equal(fooRet?.toString(), "Foo");

        const bar = query(project, "bar");
        const barRet = bar?.signatures?.[0]?.type;
        equal(barRet?.type, "reference");
        equal(barRet?.toString(), "Bar");
    },

    gh1462(project) {
        const prop = query(project, "PROP");
        equal(prop.type?.toString(), "number");

        // Would be nice to get this to work someday
        equal(prop.comment?.summary, void 0);

        const method = query(project, "METHOD");
        equal(
            Comment.combineDisplayParts(
                method.signatures?.[0].comment?.summary
            ),
            "method docs"
        );
    },

    gh1481(project) {
        const signature = query(project, "GH1481.static").signatures?.[0];
        equal(
            Comment.combineDisplayParts(signature?.comment?.summary),
            "static docs"
        );
        equal(signature?.type?.toString(), "void");
    },

    gh1483(project) {
        equal(
            query(project, "gh1483.namespaceExport").kind,
            ReflectionKind.Function
        );
        equal(
            query(project, "gh1483_2.staticMethod").kind,
            ReflectionKind.Method
        );
    },

    gh1490(project) {
        const refl = query(project, "GH1490.optionalMethod");
        equal(
            Comment.combineDisplayParts(refl.signatures?.[0]?.comment?.summary),
            "With comment"
        );
    },

    gh1509(project) {
        const pFoo = query(project, "PartialFoo.foo");
        equal(pFoo.flags.isOptional, true);

        const rFoo = query(project, "ReadonlyFoo.foo");
        equal(rFoo.flags.isReadonly, true);
        equal(rFoo.flags.isOptional, true);
    },

    gh1514(project) {
        // Not ideal. Really we want to handle these names nicer...
        query(project, "ComputedUniqueName.[UNIQUE_SYMBOL]");
    },

    gh1522(project) {
        equal(
            project.groups?.map((g) => g.categories?.map((c) => c.title)),
            [["cat"]]
        );
    },

    gh1524(project) {
        const nullableParam = query(project, "nullable").signatures?.[0]
            ?.parameters?.[0];
        equal(nullableParam?.type?.toString(), "null | string");

        const nonNullableParam = query(project, "nonNullable").signatures?.[0]
            ?.parameters?.[0];
        equal(nonNullableParam?.type?.toString(), "string");
    },

    gh1534(project) {
        const func = query(project, "gh1534");
        equal(
            func.signatures?.[0]?.parameters?.[0]?.type?.toString(),
            "readonly [number, string]"
        );
    },

    gh1547(project) {
        equal(
            project.children?.map((c) => c.name),
            ["Test", "ThingA", "ThingB"]
        );
    },

    gh1552(project) {
        equal(query(project, "emptyArr").defaultValue, "[]");
        equal(query(project, "nonEmptyArr").defaultValue, "...");
        equal(query(project, "emptyObj").defaultValue, "{}");
        equal(query(project, "nonEmptyObj").defaultValue, "...");
    },

    gh1578(project) {
        ok(query(project, "notIgnored"));
        ok(
            !project.getChildByName("ignored"),
            "Symbol re-exported from ignored file is ignored."
        );
    },

    gh1580(project) {
        ok(
            query(project, "B.prop").hasComment(),
            "Overwritten property with no comment should be inherited"
        );
        ok(
            query(project, "B.run").signatures?.[0]?.hasComment(),
            "Overwritten method with no comment should be inherited"
        );
    },

    gh1624(project) {
        ok(
            query(project, "Foo.baz").signatures?.[0]?.hasComment(),
            "Property methods declared in interface should still allow comment inheritance"
        );
    },

    gh1626(project) {
        const ctor = query(project, "Foo.constructor");
        equal(ctor.sources?.[0]?.line, 2);
        equal(ctor.sources?.[0]?.character, 4);
    },

    gh1660(project) {
        const alias = query(project, "SomeType");
        ok(alias.type instanceof QueryType);
        equal(alias.type.queryType.name, "m.SomeClass.someProp");
    },

    gh1733(project) {
        const alias = query(project, "Foo");
        equal(alias.typeParameters?.[0].comment?.summary, [
            { kind: "text", text: "T docs" },
        ]);
        const cls = query(project, "Bar");
        equal(cls.typeParameters?.[0].comment?.summary, [
            { kind: "text", text: "T docs" },
        ]);
    },

    gh1734(project) {
        const alias = query(project, "Foo");
        const type = alias.type;
        ok(type instanceof ReflectionType);

        const expectedComment = new Comment();
        expectedComment.blockTags = [
            new CommentTag("@asdf", [
                { kind: "text", text: "Some example text" },
            ]),
        ];
        equal(type.declaration.signatures?.[0].comment, expectedComment);
    },

    gh1745(project) {
        const Foo = query(project, "Foo");
        ok(Foo.type instanceof ReflectionType, "invalid type");

        const group = project.groups?.find((g) => g.title === "Type Aliases");
        ok(group, "missing group");
        const cat = group.categories?.find(
            (cat) => cat.title === "My category"
        );
        ok(cat, "missing cat");

        ok(cat.children.includes(Foo), "not included in cat");
        ok(!Foo.comment?.getTag("@category"), "has cat tag");
        ok(!Foo.type.declaration.comment?.getTag("@category"), "has cat tag 2");
        ok(
            !Foo.type.declaration.signatures?.some((s) =>
                s.comment?.getTag("@category")
            ),
            "has cat tag 3"
        );
    },

    gh1770(project) {
        const sym1 = query(project, "sym1");
        equal(
            Comment.combineDisplayParts(sym1.signatures?.[0].comment?.summary),
            "Docs for Sym1"
        );

        const sym2 = query(project, "sym2");
        equal(
            Comment.combineDisplayParts(sym2.comment?.summary),
            "Docs for Sym2"
        );
    },

    gh1771(project) {
        const check = query(project, "check");
        const tag = check.comment?.summary[0] as
            | InlineTagDisplayPart
            | undefined;
        equal(tag?.kind, "inline-tag");
        equal(tag.text, "Test2.method");
        equal(tag.target, query(project, "Test.method"));
    },

    gh1795(project) {
        equal(
            project.children?.map((c) => c.name),
            ["default", "foo"]
        );
        ok(project.children![0].kind === ReflectionKind.Reference);
        ok(project.children![1].kind !== ReflectionKind.Reference);
    },

    gh1804(project) {
        const foo = query(project, "foo");
        const sig = foo.signatures?.[0];
        ok(sig);
        const param = sig.parameters?.[0];
        ok(param);
        ok(param.flags.isOptional);
    },

    gh1875(project) {
        const test = query(project, "test");
        equal(
            test.signatures?.[0].parameters?.map((p) => p.type?.toString()),
            ["typeof globalThis", "string"]
        );

        const test2 = query(project, "test2");
        equal(
            test2.signatures?.[0].parameters?.map((p) => p.type?.toString()),
            ["any", "string"]
        );
    },

    gh1876(project) {
        const foo = query(project, "foo");
        const fooSig = foo.signatures?.[0].parameters?.[0];
        ok(fooSig);
        ok(fooSig.type instanceof UnionType);
        ok(fooSig.type.types[1] instanceof ReflectionType);
        equal(
            Comment.combineDisplayParts(
                fooSig.type.types[1].declaration.getChildByName("min")?.comment
                    ?.summary
            ),
            "Nested"
        );

        const bar = query(project, "bar");
        const barSig = bar.signatures?.[0].parameters?.[0];
        ok(barSig);
        ok(barSig.type instanceof UnionType);
        ok(barSig.type.types[0] instanceof ReflectionType);
        ok(barSig.type.types[1] instanceof ReflectionType);
        equal(
            Comment.combineDisplayParts(
                barSig.type.types[0].declaration.getChildByName("min")?.comment
                    ?.summary
            ),
            "Nested"
        );
        equal(
            Comment.combineDisplayParts(
                barSig.type.types[1].declaration.getChildByName("min")?.comment
                    ?.summary
            ),
            "Nested"
        );
    },

    gh1880(project) {
        const SomeEnum = query(project, "SomeEnum");
        equal(SomeEnum.kind, ReflectionKind.Enum);
        ok(SomeEnum.hasComment(), "Missing @enum variable comment");

        const auto = query(project, "SomeEnum.AUTO");
        ok(auto.hasComment(), "Missing @enum member comment");
    },

    gh1896(project) {
        const Type1 = query(project, "Type1");
        const Type2 = query(project, "Type2");
        equal(Type1.type?.type, "reflection" as const);
        equal(Type2.type?.type, "reflection" as const);

        equal(
            Type1.type.declaration.signatures?.[0].comment,
            new Comment([{ kind: "text", text: "On Tag" }])
        );
        equal(
            Type2.type.declaration.signatures?.[0].comment,
            new Comment([{ kind: "text", text: "Some type 2." }])
        );
    },

    gh1898(project, logger) {
        const app = getConverter2App();
        app.validate(project);
        logger.discardDebugMessages();
        logger.expectMessage(
            "warn: UnDocFn.__type, defined at src/test/converter2/issues/gh1898.ts:4, does not have any documentation."
        );
        logger.expectNoOtherMessages();
    },

    gh1903(project) {
        equal(
            Object.values(project.reflections).map((r) => r.name),
            ["typedoc"]
        );
    },

    gh1903b(project) {
        equal(
            Object.values(project.reflections).map((r) => r.name),
            ["typedoc"]
        );
    },

    gh1907(_project, logger) {
        logger.expectMessage(
            'warn: The --name option was not specified, and package.json does not have a name field. Defaulting project name to "Documentation".'
        );
        logger.discardDebugMessages();
        logger.expectNoOtherMessages();
    },

    gh1913(project) {
        const fn = query(project, "fn");

        equal(
            fn.signatures?.[0].comment,
            new Comment(
                [],
                [new CommentTag("@returns", [{ kind: "text", text: "ret" }])]
            )
        );
    },

    gh1927(project) {
        const ref = query(project, "Derived.getter");

        equal(
            ref.getSignature?.comment,
            new Comment([{ kind: "text", text: "Base" }])
        );
    },

    gh1942(project) {
        equal(query(project, "Foo.A").type, new LiteralType(0));
        equal(query(project, "Foo.B").type, new IntrinsicType("number"));
        equal(query(project, "Bar.C").type, new LiteralType("C"));
    },
};
