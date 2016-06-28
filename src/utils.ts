import fs = require("fs");
import os = require("os");
import path = require("path");
import crypto = require('crypto');
import JSONStream = require('JSONStream')

import { logger } from "./logger";

const es = require('event-stream')

const multiline = require('multiline-update')
const tar = require("tar-fs");

const parentDir = path.join(os.tmpdir(), "docker-workspace");
if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir);
}
export function createTempTarFromPath(imagePath: string, referenceInfo: string): Promise<string> {
    let promise = new Promise<string>((resolve, reject) => {
        let tarFileName = referenceInfo.replace(/[\/\\]/, "_");
        let tempDir = fs.mkdtempSync(path.join(parentDir, tarFileName));
        let tarPath = path.join(tempDir, tarFileName + ".tar");
        const sourcePath = path.resolve(imagePath);
        logger.debug("[ %s ] creating tar file : %s from %s", referenceInfo, tarPath, sourcePath);
        tar.pack(sourcePath).pipe(fs.createWriteStream(tarPath))
            .on("finish", () => {
                resolve(tarPath);
            })
            .on("error", reject);
    })
    return promise;
}


export function progressBars(buildStream, output) {
    var multi = multiline(output)

    buildStream.pipe(JSONStream.parse(null))
        .pipe(es.mapSync(function (data) {
            if(data.status) {
                var line = data.status
                if (data.progress) {
                    line += ' ' + data.progress
                }
                multi.update(data.id, line);
            } else if(data.stream) {
                output.write(data.stream.toString());
            }
            return data
        }))

    // buildStream.pipe(process.stdout);
}


// export function streamOutput(buildStream: NodeJS.ReadableStream, output: NodeJS.WritableStream) {

//     buildStream.pipe(JSONStream.parse('*'))
//         .pipe(es.mapSync(function (data) {
//             output.write(data.toString());
//             // console.log(data);
//             return data
//         }))
// }

export function md5(filePath: string) {
    const hash = crypto.createHash('md5');
    const input = fs.createReadStream(filePath);
    let promise = new Promise<string>((resolve, reject) => {
        input.on('readable', () => {
            var data = input.read();
            if (data)
                hash.update(data);
            else {
                resolve(`${hash.digest('hex')}`);
            }

        })
        input.on('error', reject); 
    });

    return promise;

}
