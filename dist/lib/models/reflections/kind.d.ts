/**
 * Defines the available reflection kinds.
 */
export declare enum ReflectionKind {
    Project = 1,
    Module = 2,
    Namespace = 4,
    Enum = 8,
    EnumMember = 16,
    Variable = 32,
    Function = 64,
    Class = 128,
    Interface = 256,
    Constructor = 512,
    Property = 1024,
    Method = 2048,
    CallSignature = 4096,
    IndexSignature = 8192,
    ConstructorSignature = 16384,
    Parameter = 32768,
    TypeLiteral = 65536,
    TypeParameter = 131072,
    Accessor = 262144,
    GetSignature = 524288,
    SetSignature = 1048576,
    ObjectLiteral = 2097152,
    TypeAlias = 4194304,
    Reference = 8388608
}
/** @hidden */
export declare namespace ReflectionKind {
    const All: number;
    const ClassOrInterface: number;
    const VariableOrProperty: number;
    const FunctionOrMethod: number;
    const ClassMember: number;
    const SomeSignature: number;
    const SomeModule: number;
    const SomeType: number;
    const SomeValue: number;
    const SomeMember: number;
    const SomeExport: number;
    const ExportContainer: number;
    /** @internal */
    const Inheritable: number;
    /** @internal */
    const ContainsCallSignatures: number;
    /**
     * Note: This does not include Class/Interface, even though they technically could contain index signatures
     * @internal
     */
    const SignatureContainer: number;
}
