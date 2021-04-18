/**
 * The session state holds information about the current user session that is persisted
 * to file so that it can be restored after application close, when the user opens the
 * application.
 */
export interface SessionState {
    windowHeight: number;
    windowWidth: number;
    topLeftX: number;
    topLeftY: number;
    backgroundColor: string
}

export const defaultSessionState: SessionState = {
    windowWidth: 1200,
    windowHeight: 800,
    topLeftX: 100,
    topLeftY: 100,
    backgroundColor: '#fff'
}
