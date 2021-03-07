import {networkManagementRepo, NetworkManagementRepo} from "./networkManagementRepo";
import ServerSettings from "../settings/serverSettings";

export interface RemoteRepositories {
    networkManagement: NetworkManagementRepo
}

export function createRemoteRepositories(serverSettings: ServerSettings): RemoteRepositories {
    return {
        networkManagement: networkManagementRepo(serverSettings),
    }
}