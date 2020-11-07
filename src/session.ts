/**
 * The session state holds information about the current user session that is persisted
 * to file so that it can be restored after application close, when the user opens the
 * application.
 */
import fs from "fs";
import { Either } from "prelude-ts";

const SESSION_STATE_PATH = '.spikes-session'

export interface SessionState {
    windowHeight: number;
    windowWidth: number;
}

const defaultSessionState: SessionState = {
    windowWidth: 1200,
    windowHeight: 800
}

/**
 * Saves the session state to file
 * @param {SessionState} session The session state
 * @see saveWindowSize
 */
export function saveSessionState(session: SessionState): void {
    try {
        fs.writeFileSync(SESSION_STATE_PATH, JSON.stringify(session));
    } catch(err) {
        console.log(err)
    }
}

/**
 * Loads the session state or returns the default session state
 * @return The session state
 */
export function loadSessionState(): SessionState {
    return readSessionState().getOrElse(defaultSessionState);
}

/**
 * Attempts to read the session state and returns the session state or an error
 * @return The session state or an error
 */
function readSessionState(): Either<string, SessionState> {
    try {
        const buffer = fs.readFileSync(SESSION_STATE_PATH);
        return Either.right(JSON.parse(buffer.toString()));
    } catch(err) {
        return Either.left(err);
    }
}

/**
 * Saves the window size (width, height) to the session state file
 * @param width The window width
 * @param height The window height
 */
export function saveWindowSize(width: number, height: number): void {
    readSessionState()
        .ifRight(savedSession => saveSessionState({
            ...savedSession,
            windowWidth: width,
            windowHeight: height
        }));
}

/**
 * Loads the window size from the session state file
 * @return A 2-tuple with the width as the first element and the height as the second element
 */
export function loadWindowSize(): [width: number, height: number] {
    return readSessionState()
        .map<[width: number, height: number]>(state => ([state.windowWidth, state.windowHeight]))
        .getOrElse([defaultSessionState.windowWidth, defaultSessionState.windowHeight]);
}