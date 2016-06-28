import fs = require("fs");
import path = require("path");


import {DockerodePromesied} from "./DockerodePromesied";
import {WorkspaceStarter} from "./WorkspaceStarter";
import {WorkspaceDefinition, WorkspaceStatus, RuntimeStatus, RuntimeDefinition} from "./api";
import {logger} from "./logger";
import * as util from './utils';

var Docker = require("./DockerPromise");
var Handlebars = require("handlebars");
var dockerOpts = require("dockerode-options");
var streamToPromise = require("stream-to-promise")

export class Workspace {
  private proxyContainer: dockerode.Container;
  private static docker: dockerode.Docker = new Docker(dockerOpts());

  constructor(public workspaceId: string) {
  }

  public async start(workspaceDefinition: WorkspaceDefinition, progress?: (string) => any) {
    try {
      const workspaceStarter = new WorkspaceStarter(this.workspaceId, workspaceDefinition, Workspace.docker);

      let teamNetwork = await this.getTeamNetwork(workspaceDefinition);
      await workspaceStarter.start(teamNetwork, progress);
      await this.reloadWebProxy();
    } catch (error) {
      console.error(error);
    }
  }

  public async delete(progress?: (string) => any) {
  try {
      let containers = await Workspace.docker.listContainers({
        all: true,
        filters: { label: [`workspace.id=${this.workspaceId}`] }
      });
      await Promise.all(containers.map((container) => this.removeContainer(container)));
      await this.removeWorkspaceNetwork();
      progress && progress(`[ ${this.workspaceId} ] workspace deleted`);
      logger.info("[ %s ] workspace deleted", this.workspaceId);
    } catch (error) {
      logger.error("[ %s ] error deleting workspace", this.workspaceId, error);
      throw error;
    }

    await this.reloadWebProxy();
  }

  public async getWorkspaceDefinition() {
      const network = Workspace.docker.getNetwork(this.workspaceId);
      const networkInfo = await network.inspect();
      const wd : WorkspaceDefinition = JSON.parse(networkInfo.Labels['workspace.definition']);
      return wd;
  }

  public async status() {
    const containers = await Workspace.docker.listContainers({
      all: true,
      filters: { label: [`workspace.id=${this.workspaceId}`] }
    });
    if (containers.length === 0) {
      logger.error("[ %s ] workspace does not exist", this.workspaceId);
      throw new Error("workspace does not exist");
    }
    try {
      let status: WorkspaceStatus = {
        workspaceId: this.workspaceId,
        runtimes: {}
      };
      const wd = await this.getWorkspaceDefinition();
      containers.forEach((containerInfo) => {
        let runtimeDefinition = Workspace.getRuntimeDefinitionByPath(containerInfo, wd);
        let networkSettings = containerInfo.NetworkSettings;
        let runtimeStatus: RuntimeStatus = status.runtimes[containerInfo.Labels["workspace.application.name"]] = {
          status: containerInfo.Status,
          type: runtimeDefinition.type,
          network: {
            ip: networkSettings.Networks[this.workspaceId].IPAddress,
            port: runtimeDefinition.port,
            additional: {}
          },
          definition: runtimeDefinition
        };
        Object.keys(networkSettings.Networks).forEach((networkName) => {
          let network = networkSettings.Networks[networkName];
          if (networkName != this.workspaceId) {
            runtimeStatus.network.additional[networkName] = network.IPAddress;
          }
        });
      });
      return status;
    } catch (error) {
      logger.error("[ %s ] error getting status", this.workspaceId, error);
      throw error;
    }
  }

  public async reloadWebProxy() {
    await this.getTeamNetwork();
    logger.info("restarting proxy conf");
    await this.regenerateHAProxyConf();
    const teamName = await this.getTeamName();
    let proxys = await Workspace.docker.listContainers({ filters: { label: ["workspace=proxy", "workspace-team=" + teamName] } });
    if (proxys.length === 0) {
      let userConfigPathToDocker =  await this.getUserConfigPath();
      const isWin = /^win/.test(process.platform);
      if (isWin) {
        userConfigPathToDocker = userConfigPathToDocker.replace(/[\\]/g, '/').replace(/^(\w):/, '/$1');
        userConfigPathToDocker = '/' + userConfigPathToDocker[1].toLowerCase() + userConfigPathToDocker.substring(2);
      }
      console.log(userConfigPathToDocker);
      //pull if not found 
      const pullStream = await Workspace.docker.pull('haproxy:latest');
      util.progressBars(pullStream, process.stdout);
      await streamToPromise(pullStream);

      let containerOptions: dockerode.CreateContainerOptions = {
        name: "workspace.proxy",
        Image: "haproxy",
        Tty: false,
        Labels: { workspace: "proxy", "workspace-team": teamName },
        ExposedPorts: {
          "8080/tcp": {}
        },
        HostConfig: {
          NetworkMode: teamName,
          Binds: [`${userConfigPathToDocker}/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg`],
          PortBindings: { "8080/tcp": [{ HostPort: "8080" }] }
        }
      };

      const proxyInfo = await Workspace.docker.createContainer(containerOptions);
      this.proxyContainer = Workspace.docker.getContainer(proxyInfo.id);
      await this.proxyContainer.start();
    } else {
      this.proxyContainer = Workspace.docker.getContainer(proxys[0].Id);
    }
    await this.proxyContainer.kill({signal: "HUP"});
  }


  public static async list(team?: string) {
    let networks = await Workspace.docker.listNetworks({});
    return networks.filter(network => team
      ? network.Labels["workspace.team"] === team
      : network.Labels["workspace.id"] !== undefined).map(network => network.Labels["workspace.id"]);
  }

  public async regenerateHAProxyConf() {
    let workspaceIds = await Workspace.list();
    let statusesP = workspaceIds
      .map(workspaceId => new Workspace(workspaceId)) //FIXME: extract the definition using an special label in the workspace network
      .map(ws => ws.status());
    let statuses = await Promise.all(statusesP);
    const teamName = await this.getTeamName();

    let template = Handlebars.compile(
        fs.readFileSync(path.join(__dirname, "..", "haproxy.cfg.hbs")).toString()
          .replace("@@TEAM@@", teamName));
    let result = template({ statuses: statuses });
    const userPath = await this.getUserConfigPath();
    fs.writeFileSync(path.join(userPath, "haproxy.cfg"), result);
    return statuses;

  }

  private teamNetwork: dockerode.Network;
  private async getTeamNetwork(workspaceDefinition?: WorkspaceDefinition) {
    if (!!this.teamNetwork) {
      return this.teamNetwork;
    } else {
      let teamNetworkId: string;
      const teamName = await this.getTeamName(workspaceDefinition);
      let networks = await Workspace.docker.listNetworks({ filters: { name: [teamName] } })
      let teamNetworkInfo = networks[0];
      if (!teamNetworkInfo) {
        let networkSettings: dockerode.CreateNetworkOptions = {
          Name: teamName,
          CheckDuplicate: true,
          Labels: {
            "workspace": "true"
          }
        };
        logger.info("[%s] creating team network '%s'", this.workspaceId, teamName);
        const result = await Workspace.docker.createNetwork(networkSettings);
        teamNetworkId = result.id;
        this.teamNetwork = Workspace.docker.getNetwork(teamNetworkId);
        return this.teamNetwork;
      } else {
        logger.info("[%s] using workspaceNetwork", this.workspaceId);
        teamNetworkId = teamNetworkInfo.Id;
        this.teamNetwork = Workspace.docker.getNetwork(teamNetworkId);
        logger.info("[%s] returning system network from system", this.workspaceId);
        return this.teamNetwork;
      }
    }
  }

  private removeContainer(containerInfo: dockerode.ContainerInfo) {
    logger.debug("[ %s ] removing container : ", this.workspaceId, containerInfo.Names);
    let container = Workspace.docker.getContainer(containerInfo.Id);
    return container.remove({ force: true });
  }

  private removeWorkspaceNetwork() {
    logger.debug("[ %s ] removing workspace network : ", this.workspaceId);
    let network = Workspace.docker.getNetwork(this.workspaceId);
    return network.remove();
  }

  private static getRuntimeDefinitionByPath(containerInfo: dockerode.ContainerInfo, workspaceDefinition: WorkspaceDefinition): RuntimeDefinition {
    let path = containerInfo.Labels["workspace.application.path"];
    let lastNode = workspaceDefinition as any;
    path.split(".").forEach(node => {
      lastNode = lastNode[node];
    });
    return lastNode;
  }


  private async getTeamName(workspaceDefinition?: WorkspaceDefinition) {
    const wd = workspaceDefinition || await this.getWorkspaceDefinition();
    return wd.team || "workspace.generic";
  }

  public async getUserConfigPath() {
    var mkdirp = require("mkdirp");
    let teamName = await this.getTeamName();
    let userConfigPath = path.join(process.env.USERPROFILE || process.env.HOME , ".docker-workspace", teamName);
    if (!fs.existsSync(userConfigPath)) {
      mkdirp.sync(userConfigPath);
      logger.info("created workspace config dir : ", userConfigPath);
    }
    logger.debug("using workspace config dir : ", userConfigPath);
    return userConfigPath;
  }

}
