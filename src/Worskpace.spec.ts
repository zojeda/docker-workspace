import chai = require('chai');
import cp = require('child_process');
import {WorkspaceDefinition} from './api';
import {Workspace} from './Workspace';

chai.should();

let sampleWorkspaceDefinition: WorkspaceDefinition = {
  development: {
    image: "busybox",
    code: { path: "/code" },
    tools: {
      "tool1": {
        command: "/bin/tail -f /dev/null",
        type: "process"
      },
      "tool2": {
        command: "/bin/tail -f /dev/null",
        type: "process"
      }
    }
  }
}
describe('Workspace', () => {
  describe('start', () => {
    it('should start all tools and services', async function () {
      this.timeout(1200000)
      const ws = new Workspace("testWorkspace");
      await ws.start(sampleWorkspaceDefinition, process.stdout);
      let containers = await listContainers("testWorkspace");
      let containersIds = containers.split(/\s+/).filter(containerId => !!containerId);
      containersIds.should.have.length(2);
    });
  })
  after(async () => {
    try {
      await cleanup("testWorkspace");

    } catch (e) {
      console.error("cleanup error", e);
    }
  })
});

async function listContainers(workspaceId) {
  return execute(`docker ps -q --filter "label=workspace.id=${workspaceId}"`);
}

async function cleanup(workspaceId: string) {
  let removeRuntimes = `docker ps -q --filter "label=workspace.id=${workspaceId}" | xargs docker rm -f `;
  let removeVolumes = `docker volume ls -q --filter "name=${workspaceId}.code" | xargs docker volume rm`;
  let removeWorkspaceNetwork = `docker network rm ${workspaceId}`;
  
  await execute(removeRuntimes);
  await execute(removeVolumes);
}


function execute(command: string): Promise<String> {
  return new Promise<String>((resolve, reject) => {
    cp.exec(command, (error, output) => {
      if(error) {
        return reject(error);
      }
      resolve(output);
    })
  });
}