import fs from "fs";
import {Either} from "prelude-ts";
import {defaultSessionState, SessionState} from "../../session";

const SESSION_STATE_PATH = '.spikes-session'

/**
 * Saves the session state to file
 * @param {SessionState} session The session state
 * @see saveWindowDimensions
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
 * @param bounds The rectangle bounds of the window
 */
export function saveWindowDimensions(bounds: Electron.Rectangle): void {
    readSessionState()
        .ifRight(savedSession => saveSessionState({
            ...savedSession,
            windowWidth: bounds.width,
            windowHeight: bounds.height,
            topLeftX: bounds.x,
            topLeftY: bounds.y,
        }));
}

/**
 * Loads the window size from the session state file
 * @return The bounds of the window (x, y, width, height)
 */
export function loadWindowDimensions(): Electron.Rectangle {
    return readSessionState()
        .map(state => ({
            x: state.topLeftX,
            y: state.topLeftY,
            width: state.windowWidth,
            height: state.windowHeight
        }))
        .getOrElse({
            x: defaultSessionState.topLeftX,
            y: defaultSessionState.topLeftY,
            width: defaultSessionState.windowWidth,
            height: defaultSessionState.windowHeight
        });
}
