import {networkManagementRepo, NetworkManagementRepo} from "./networkManagementRepo";
import ServerSettings from "../settings/serverSettings";

export interface RemoteRepositories {
    serverSettings: ServerSettings;
    networkManagement: NetworkManagementRepo;
}

export function createRemoteRepositories(serverSettings: ServerSettings): RemoteRepositories {
    return {
        serverSettings,
        networkManagement: networkManagementRepo(serverSettings),
    }
}