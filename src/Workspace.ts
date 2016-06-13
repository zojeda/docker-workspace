import fs = require("fs");
import path = require("path");
import Docker = require("dockerode");


import {DockerodePromesied} from "./DockerodePromesied";
import {DockerodeHandler} from "./DockerodeHandler";
import {WorkspaceDefinition, WorkspaceStatus} from "./api";
import {logger} from "./logger";
var Handlebars = require("handlebars");

export class Workspace {
  private workspaceDefinitionPath: string;
  private composeDefinition: any;
  private dockerWorkspaceHandler: DockerodeHandler;
  private proxyContainer: dockerode.Container;
  private static docker = new Docker();
  private static dockerP = new DockerodePromesied(Workspace.docker, "workspace");

  constructor(public workspaceDefinition: WorkspaceDefinition, public workspaceId: string) {
    this.dockerWorkspaceHandler = new DockerodeHandler(workspaceId, this.workspaceDefinition, Workspace.docker);
  }

  public async start(progress?: (string) => any) {
    let teamNetwork = await this.getTeamNetwork();
    await this.dockerWorkspaceHandler.start(teamNetwork, progress);
    await this.reloadWebProxy();
  }

  public async delete(progress?: (string) => any) {
    await this.dockerWorkspaceHandler.delete(progress);
    await this.reloadWebProxy();
  }

  public async status(): Promise<WorkspaceStatus> {
    let status = await this.dockerWorkspaceHandler.status();
    return status;
  }

  public async reloadWebProxy() {
    await this.getTeamNetwork();
    logger.info("restarting proxy conf");
    await this.regenerateHAProxyConf();
    let proxys = await Workspace.dockerP.listContainers({ filters: { label: ["workspace=proxy", "workspace-team=" + this.teamName] } });
    if (proxys.length === 0) {
      let containerOptions: dockerode.CreateContainerReq = {
        name: "workspace.proxy",
        Image: "haproxy",
        Tty: false,
        Labels: { workspace: "proxy", "workspace-team": this.teamName },
        ExposedPorts: {
          "8080/tcp": {}
        },
        HostConfig: {
          NetworkMode: this.teamName,
          Binds: [`${path.join(this.UserConfigPath, "haproxy.cfg")}:/usr/local/etc/haproxy/haproxy.cfg`],
          PortBindings: { "8080/tcp": [{ HostPort: "8080" }] }
        }
      };

      this.proxyContainer = await Workspace.dockerP.createContainer(containerOptions);
      await Workspace.dockerP.startContainer(this.proxyContainer);
    } else {
      this.proxyContainer = Workspace.docker.getContainer(proxys[0].Id);
    }
    await Workspace.dockerP.killContainer(this.proxyContainer, "HUP");
  }


  public static async list(team?: string) {
    let networks = await Workspace.dockerP.listNetworks({});
    return networks.filter(network => team
      ? network.Labels["workspace.team"] === team
      : network.Labels["workspace.id"] !== undefined).map(network => network.Labels["workspace.id"]);
  }

  public async regenerateHAProxyConf() {
    let workspaceIds = await Workspace.list();
    let statusesP = workspaceIds
      .map(workspaceId => new Workspace(this.workspaceDefinition, workspaceId)) //FIXME: extract the definition using an special label in the workspace network
      .map(ws => ws.status());
    let statuses = await Promise.all(statusesP);
    let template = Handlebars.compile(fs.readFileSync(path.join(__dirname, "..", "haproxy.cfg.hbs")).toString().replace("@@TEAM@@", this.workspaceDefinition.team));
    let result = template({ statuses: statuses });
    fs.writeFileSync(path.join(this.UserConfigPath, "haproxy.cfg"), result);
    return statuses;

  }

  private systemNetwork: dockerode.Network;
  private async getTeamNetwork() {
    if (!this.systemNetwork) {
      let workspaceSystemNetworkId: string;
      let networks = await Workspace.dockerP.listNetworks({ filters: { name: [this.teamName] } });
      let workspaceSystemNetworkInfo = networks[0];
      if (!workspaceSystemNetworkInfo) {
        let networkSettings: dockerode.NetworkParameters = {
          Name: this.teamName,
          CheckDuplicate: true,
          Labels: {
            "workspace": "true"
          }
        };
        let result = await Workspace.dockerP.createNetwork(networkSettings);
        workspaceSystemNetworkId = result.id;
      } else {
        workspaceSystemNetworkId = workspaceSystemNetworkInfo.Id;
      }
      this.systemNetwork = Workspace.docker.getNetwork(workspaceSystemNetworkId);
    }
    return this.systemNetwork;
  }

  private get teamName() {
    return this.workspaceDefinition.team || "workspace.generic";
  }

  public get UserConfigPath() {
    var mkdirp = require("mkdirp");
    let userConfigPath = path.join(process.env.HOME || process.env.USERPROFILE, ".docker-workspace", this.workspaceDefinition.team);
    if (!fs.existsSync(userConfigPath)) {
      mkdirp.sync(userConfigPath);
      logger.info("created workspace config dir : ", userConfigPath);
    }
    return userConfigPath;
  }

}
