import {ITimeProvider} from "../../domain/ports/ITimeProvider";

export class SimpleTimeProvider implements ITimeProvider {
    now(): string {
        return new Date().toISOString();
    }
}