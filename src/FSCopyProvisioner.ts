import fs = require("fs");
import os = require("os");
import path = require("path");

import { WorkspaceDefinition } from "./api";
import { Provisioner} from "./Provisioner";
import { logger } from "./logger";

var tar = require("tar-fs");

export class FSCopyProvisioner implements Provisioner {
  constructor(private params: {path: string}){}

  addContent(workspaceId: string,
    definition: WorkspaceDefinition,
    container: dockerode.Container,
    progress: (string) => void)
    : Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let sourcePath = path.resolve(this.params.path);
      if (!fs.existsSync(sourcePath)) {
        logger.error("[ %s ] source path do not exists: %s", workspaceId, sourcePath);
        return reject("source path do not exists: " + sourcePath);
      }
      if (path.extname(sourcePath) != "tar") {
        logger.debug("[ %s ] making a tar file with the provided content: %s", workspaceId, sourcePath);
        const parentDir = path.join(os.tmpdir(), "docker-workspace");
        if(!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir);
        }
        let tempDir = fs.mkdtempSync(path.join(parentDir, "fsCopy-"));
        let tarPath = path.join(tempDir, workspaceId+"-code.tar");
        logger.debug("[ %s ] creating tar file : %s", workspaceId, tarPath);
        tar.pack(sourcePath).pipe(fs.createWriteStream(tarPath))
            .on("finish", () => {
              putArchive(workspaceId, container, tarPath, definition.development.code.path, resolve, reject);
        });
      } else {
        putArchive(workspaceId, container, sourcePath, definition.development.code.path, resolve, reject);
      }
    });
  }
}

function putArchive(logMark: string, container: dockerode.Container, sourcePath: string, destinationPath: string, resolve, reject) {
  container.putArchive(sourcePath, { path: destinationPath }, (error, response) => {
    if (error) {
      logger.error("[ %s ] error put archive to container", logMark, error);
      return reject(error);
    }
    logger.debug("[ %s ] put archive success", logMark);
    resolve();
  });
}