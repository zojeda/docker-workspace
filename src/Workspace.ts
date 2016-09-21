import {loggerFactory} from "./logger";
import {WorkspaceDefinition, WorkspaceStatus, RuntimeStatus, RuntimeDefinition, Volume} from "./api";
import {WorkspaceVolume} from "./components/WorkspaceVolume";
import {Runtime} from "./components/Runtime";
import {Network} from "./components/Network";

type RuntimesMap = Map<string, { path: string, application: RuntimeDefinition }>;
/**
 * A Workspace is defined in this context as a development environment and is a composition of:
 * + Code : a directory containing source code (and later during the development process it will 
 *          also contain dependencies and generated artifacts).
 * + Runtimes : applications required during the development process to code/test the applications.
 *              In this context, all runtimes are volatile and they should not hold state in their filesystems.
 *              Only volumes can be used to preserve data between workspace executions.
 *      * Services : required applications that will be started at the begining of the start up process
 *                   for example: databases.
 *      * Tools : after all services are started any tool can also be started and in general provide some
 *                web content to explore/manipulate code or data services, for example : IDE, db managers.
 * Workspaces are isolated between each other, and can be identified by its workspaceId in the given environment :
 *  * local/remote docker engine
 *  * a docker swarm
 *  * 
 * Team : Workspaces can be grouped in order to provide visibitily whithin the group.
 * Each runtime can access to each other by runtime name and also can see the Code directory and manipulate it.
 * 
 * A Workspace can be either local or remote, so no access to client filesystem is allowed.
 * 
 * 
 * The implementation map these concepts with the following modules :
 * * CodeVolume: a volume named like the workspaceId.
 * * Runtimes: docker containers for Services and Tools with at least one volume pointing Code, and named acording to its definition and workspaceId.
 * * WorkspaceNetwork: a docker network named like the workspaceId providing visibitily between runtimes of the same workspace.
 * * TeamNetwork: a grouping network that provide visibitily to workspaces of the same Team.
 * * Proxy: reverse proxy to access web application tools and services for earch registered workspace 
 */
export class Workspace {
    private initialized = false;

    constructor(private workspaceId) {

    }

    async start(workspaceDefinition: WorkspaceDefinition, output: NodeJS.WritableStream) {
        const logger = loggerFactory(this.workspaceId, output);
        try {

            const codeVolume = new WorkspaceVolume(this.workspaceId);
            await codeVolume.create(output);

            const workspaceNetwork = new Network(this.workspaceId);
            await workspaceNetwork.start(output);

            const allRuntimes = this.getAllRuntimes(workspaceDefinition);
            let globalBindings = [workspaceDefinition.development.code];
            return await this.startAllRuntimes(allRuntimes, globalBindings, output);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    async status() {

    }

    async stop(output: NodeJS.WritableStream) {
        await Runtime.removeAll(this.workspaceId, output);
    }

    private async startAllRuntimes(allRuntimes: RuntimesMap, bindings: Volume[], output: NodeJS.WritableStream) {
        const allStarts = Array.from(allRuntimes.keys()).map(runtimeName => {
            const runtimeDef = allRuntimes.get(runtimeName);
            const runtime = new Runtime(this.workspaceId, runtimeName, runtimeDef.path, runtimeDef.application);
            return runtime.start(bindings, null, allRuntimes, output);
        });
        return await Promise.all(allStarts);
    }

    private getAllRuntimes(workspaceDefinition: WorkspaceDefinition): RuntimesMap {
        const allRuntimes = new Map<string, { path: string, application: RuntimeDefinition }>();
        let services = workspaceDefinition.development.services || {};
        Object.keys(services).forEach((serviceName) => {
            const service = services[serviceName];
            service.image = service.image || workspaceDefinition.development.image;
            allRuntimes.set(serviceName, { path: "development.services." + serviceName, application: service });
        });
        let tools = workspaceDefinition.development.tools || {};
        Object.keys(tools).forEach((toolName) => {
            const tool = tools[toolName];
            tool.image = tool.image || workspaceDefinition.development.image;
            allRuntimes.set(toolName, { path: "development.tools." + toolName, application: tool });
        });
        return allRuntimes;
    }
}
