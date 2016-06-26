import fs = require("fs");
import path = require("path");


import {DockerodePromesied} from "./DockerodePromesied";
import {WorkspaceStarter} from "./WorkspaceStarter";
import {WorkspaceDefinition, WorkspaceStatus} from "./api";
import {logger} from "./logger";

var Docker = require("./DockerPromise");
var Handlebars = require("handlebars");
var dockerOpts = require("dockerode-options");

export class Workspace {
  private workspaceDefinitionPath: string;
  private composeDefinition: any;
  private dockerWorkspaceHandler: WorkspaceStarter;
  private proxyContainer: dockerode.Container;
  private static docker: dockerode.Docker = new Docker(dockerOpts());
  private static dockerP = new DockerodePromesied(Workspace.docker, "workspace");

  constructor(public workspaceDefinition: WorkspaceDefinition, public workspaceId: string) {
    this.dockerWorkspaceHandler = new WorkspaceStarter(workspaceId, this.workspaceDefinition, Workspace.docker);
  }

  public async start(progress?: (string) => any) {
    try {

      console.log("start...")
      let teamNetwork = await this.getTeamNetwork();
      console.log("starter start...")
      await this.dockerWorkspaceHandler.start(teamNetwork, progress);
      await this.reloadWebProxy();
    } catch (error) {
      console.error(error);
    }
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
    let proxys = await Workspace.docker.listContainers({ filters: { label: ["workspace=proxy", "workspace-team=" + this.teamName] } });
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

      this.proxyContainer = await Workspace.docker.createContainer(containerOptions);
      await Workspace.dockerP.startContainer(this.proxyContainer);
    } else {
      this.proxyContainer = Workspace.docker.getContainer(proxys[0].Id);
    }
    await Workspace.dockerP.killContainer(this.proxyContainer, "HUP");
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
      .map(workspaceId => new Workspace(this.workspaceDefinition, workspaceId)) //FIXME: extract the definition using an special label in the workspace network
      .map(ws => ws.status());
    let statuses = await Promise.all(statusesP);
    let template = Handlebars.compile(fs.readFileSync(path.join(__dirname, "..", "haproxy.cfg.hbs")).toString().replace("@@TEAM@@", this.workspaceDefinition.team));
    let result = template({ statuses: statuses });
    fs.writeFileSync(path.join(this.UserConfigPath, "haproxy.cfg"), result);
    return statuses;

  }

  private teamNetwork: dockerode.Network;
  private async getTeamNetwork() {
    console.log("getTeamNetwork")
    if (!!this.teamNetwork) {
      console.log("returning team network static", this.teamNetwork);
      return this.teamNetwork;
    } else {
      let teamNetworkId: string;
      let networks = await Workspace.docker.listNetworks({ filters: { name: [this.teamName] } })
      console.log(networks)
      let teamNetworkInfo = networks[0];
      if (!teamNetworkInfo) {
        let networkSettings: dockerode.NetworkParameters = {
          Name: this.teamName,
          CheckDuplicate: true,
          Labels: {
            "workspace": "true"
          }
        };
        logger.info("[%s] creating team network '%s'", this.workspaceId, this.teamName);
        const result = await Workspace.docker.createNetwork(networkSettings)
        teamNetworkId = result.id;
        this.teamNetwork = Workspace.docker.getNetwork(teamNetworkId);
        console.log("returning team network just created", this.teamNetwork);
        return this.teamNetwork;
      } else {
        console.log("using workspaceNetwork")
        teamNetworkId = teamNetworkInfo.Id;
        this.teamNetwork = Workspace.docker.getNetwork(teamNetworkId);
        console.log("returning system network from system", this.teamNetwork);
        return this.teamNetwork;
      }
    }
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
