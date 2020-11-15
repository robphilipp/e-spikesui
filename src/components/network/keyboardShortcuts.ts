import {Option} from "prelude-ts";

/**
 * Available keyboard shortcuts for editors
 */
export enum KeyboardShortcut {
    NEW = 'new',
    SAVE = 'save',
    LOAD = 'load',
}

/**
 * Translates the event to a keyboard shortcut and wraps it in an option
 * @param event The keyboard event
 * @return The keyboard shortcut wrapped in an option, or an empty option
 */
export function keyboardShortcutFor(event: KeyboardEvent): Option<KeyboardShortcut> {
    if (process.platform === 'darwin') {
        if (event.metaKey && event.key.toLocaleLowerCase() === 's') {
            return Option.of(KeyboardShortcut.SAVE);
        }
        if (event.metaKey && event.key.toLocaleLowerCase() === 'o') {
            return Option.of(KeyboardShortcut.LOAD);
        }
        if (event.metaKey && event.key.toLocaleLowerCase() === 'n') {
            return Option.of(KeyboardShortcut.NEW);
        }
    } else {
        if (event.ctrlKey && event.key.toLocaleLowerCase() === 's') {
            return Option.of(KeyboardShortcut.SAVE);
        }
        if (event.ctrlKey && event.key.toLocaleLowerCase() === 'o') {
            return Option.of(KeyboardShortcut.LOAD);
        }
        if (event.ctrlKey && event.key.toLocaleLowerCase() === 'n') {
            return Option.of(KeyboardShortcut.NEW);
        }
    }
    return Option.none();
}