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

export function saveSessionState(session: SessionState): void {
    try {
        fs.writeFileSync(SESSION_STATE_PATH, JSON.stringify(session));
    } catch(err) {
        console.log(err)
    }
}

export function loadSessionState(): SessionState {
    return readSessionState().getOrElse(defaultSessionState);
}

function readSessionState(): Either<string, SessionState> {
    try {
        const buffer = fs.readFileSync(SESSION_STATE_PATH);
        return Either.right(JSON.parse(buffer.toString()));
    } catch(err) {
        return Either.left(err);
    }
}

export function saveWindowSize(width: number, height: number): void {
    readSessionState()
        .ifRight(savedSession => saveSessionState({
            ...savedSession,
            windowWidth: width,
            windowHeight: height
        }));
}

export function loadWindowSize(): [width: number, height: number] {
    return readSessionState()
        .map<[width: number, height: number]>(state => ([state.windowWidth, state.windowHeight]))
        .getOrElse([defaultSessionState.windowWidth, defaultSessionState.windowHeight]);
}