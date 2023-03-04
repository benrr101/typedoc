import type { OptionsReader, Options } from "..";
import type { Logger } from "../../loggers";
/**
 * Obtains option values from command-line arguments
 */
export declare class ArgumentsReader implements OptionsReader {
    readonly name = "arguments";
    readonly priority: number;
    private args;
    constructor(priority: number, args?: string[]);
    read(container: Options, logger: Logger): void;
}
