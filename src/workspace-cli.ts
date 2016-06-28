#!/usr/bin/env node

import fs = require("fs");
import path = require("path");
import yargs = require("yargs");

import {Workspace, WorkspaceDefinition} from "./api";

var prettyjson = require("prettyjson");

// import {capaMongoWorkspace} from './mongoTrainingDefinition.ts';
// fs.writeFileSync('./workspace-definition.json', JSON.stringify(capaMongoWorkspace, null, 2));

yargs
  .usage("Usage: dw <command> [options]")
  .command("start", "Start a workspace from a definition", startWorkspace)
  .command("stop", "Stop a running workspace", stopWorkspace)
  .command("status", "get the status of a running workspace", statusWorkspace)
  .command("list", "list all running workspaces", listWorkspaces)
  .demand(1)

  .help("h")
  .alias("h", "help")
  .epilog("copyright 2016")
  .argv;


function  startWorkspace(ya: yargs.Yargs) {
  let argv = ya
    .usage("usage: dw start [workspaceIds] [options]")
    .example("dw <command> -w <workspace-def.json>", "start one or more workspaces with provided ids")
    .options({
      w: {
        alias: "ws-def",
        default: "workspace-definition.json",
        describe: "Workspace Defininition file (json format)",
        type: "string"
      }
    })
    .help("h")
    .alias("h", "help")
    .argv;

  try {
    let workspaceIds = argv._.slice(1) || [path.basename(process.cwd())];
    let workspaceDefinition: WorkspaceDefinition = JSON.parse(fs.readFileSync((argv as any).w).toString());
    console.log("starting : ", workspaceIds)
    let starts = workspaceIds.map(workspaceId => {
      let workspace = new Workspace(workspaceId);
      workspace.start(workspaceDefinition, console.log);
    });
    Promise.all(starts).then(() => "all started");
  } catch (error) {
    console.error(error);
  }
}

function stopWorkspace(ya: yargs.Yargs) {
  let argv = ya
    .usage("usage: dw stop [workspaceId]")
    .example("dw <command>", "stop one or more workspaces with provided ids")
    .options({
      w: {
        alias: "ws-def",
        default: "workspace-definition.json",
        describe: "Workspace Defininition file (json format)",
        type: "string"
      }
    })
    .help("h")
    .alias("h", "help")
    .argv;

  let workspaceIds = argv._.slice(1) || [path.basename(process.cwd())];
  workspaceIds.forEach(workspaceId => {
    let workspace = new Workspace(workspaceId);
    workspace.delete();
  });
}

function statusWorkspace(ya: yargs.Yargs) {
  let argv = ya
    .usage("usage: dw status [workspaceId]")
    .example("dw <command>", "get the runtime status of workspace with the given id")
    .help("h")
    .alias("h", "help")
    .argv;

  let workspaceId = argv._[1] || path.basename(process.cwd());
  console.log("getting status workspace with id :", workspaceId);
  let workspace = new Workspace(workspaceId);
  workspace.status()
    .then(status => console.log(prettyjson.render(status)))
    .catch(error => console.error(error));
}

function listWorkspaces(ya: yargs.Yargs) {
  let argv = ya
    .usage("usage: dw list [team]")
    .example("dw <command>", "list all active workspaces in the given team")
    .help("h")
    .alias("h", "help")
    .argv;

  let team = argv._[1];
  Workspace.list(team).then(workspaces => workspaces.forEach((w) => console.log(w)));
}


