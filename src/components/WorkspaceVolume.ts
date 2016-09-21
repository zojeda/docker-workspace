import {docker} from "../docker";
import {loggerFactory} from "../logger";


export class WorkspaceVolume {
    private volumeName: string;
    constructor(private workspaceId: string, name: string = "code", private group: string = "genericGroup") {
        this.volumeName = `${workspaceId}.${name}`;
    }


    public async create(output: NodeJS.WritableStream) {
        const logger = loggerFactory(this.workspaceId, output);
        const volume = await this.getVolume();
        if (volume) {
            logger.info("using existing volume ", this.volumeName);
            return false;
        }
        let volumeOptions: dockerode.CreateVolumeOptions = {
            Name: this.volumeName,
            Labels: {
                "workspace": "true",
                "workspace.id": this.volumeName,
                "workspace.group": this.group
            }
        };

        logger.info("creating a new volume", this.volumeName);
        await docker.createVolume(volumeOptions);
        return true;
    }

    public async remove() {
        throw new Error("not implemented");
        
    }

    public async getVolume() {
        const volumes = await docker.listVolumes();
        return volumes.Volumes && volumes.Volumes.find(volume => volume.Name === this.volumeName);
    }

}