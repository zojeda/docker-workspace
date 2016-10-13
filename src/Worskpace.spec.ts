import cp = require('child_process');

import chai = require('chai');
import chaiAsPromised = require("chai-as-promised");

import {WorkspaceDefinition} from './api';
import {Workspace} from './Workspace';

chai.use(chaiAsPromised);
chai.should();

let sampleWorkspaceDefinition: WorkspaceDefinition = {
  development: {
    image: "busybox",
    code: { path: "/code" },
    tools: {
      "tool1": {
        command: "/bin/tail -f /dev/null",
        type: "process"
      }
    },
    services: {
      "service1": {
        command: "/bin/tail -f /dev/null",
        type: "process"
      }

    }
  }
}
describe('Workspace', () => {
  const testWorkspace = "testWorkspace";
  describe('A running workspace ', () => {
    before(async function () {
      this.timeout(1200000);
      const ws = new Workspace(testWorkspace);
      await ws.start(sampleWorkspaceDefinition, process.stdout);
    })
    it('should start all tools and services', async function () {
      let containers = await listContainers(testWorkspace);
      let containersIds = containers.split(/\s+/).filter(containerId => !!containerId);
      containersIds.should.have.length(2);
    });
    it('should be visible each service to each other', async function () {
      return Promise.all([
        checkConnection("tool1.testWorkspace", "service1").should.eventually.be.ok,
        checkConnection("service1.testWorkspace", "tool1").should.eventually.be.ok
      ])
    });
  })
  after(async () => {
    await cleanup(testWorkspace);
  })
});

async function checkConnection(containerName: string, targetHost: string) {
  return await execute(`docker exec -i ${containerName} ping -c 1 ${targetHost} `);
}
async function listContainers(workspaceId) {
  return execute(`docker ps -q --filter "label=workspace.id=${workspaceId}"`);
}

async function cleanup(workspaceId: string) {
  let removeRuntimes = `docker ps -q --filter "label=workspace.id=${workspaceId}" | xargs docker rm -f `;
  let removeVolumes = `docker volume ls -q --filter "name=${workspaceId}.code" | xargs docker volume rm`;
  let removeWorkspaceNetwork = `docker network rm ${workspaceId}`;

  await execute(removeRuntimes);
  await execute(removeVolumes);
  // await execute(removeWorkspaceNetwork);
}


function execute(command: string): Promise<String> {
  return new Promise<String>((resolve, reject) => {
    cp.exec(command, (error, output) => {
      if (error) {
        return reject(error);
      }
      resolve(output);
    })
  });
}