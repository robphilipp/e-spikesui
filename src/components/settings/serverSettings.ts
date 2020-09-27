/**
 * Holds the API server settings. The application needs to connect to a spikes neural
 * network server that creates, executes, and accepts sensor signals from this application.
 * The server settings hold the URL components to connect to this REST service.
 */
export default interface ServerSettings {
    host: string;
    port: number;
    basePath: string;
}
