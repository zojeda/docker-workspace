// Generated by typings
// Source: additionalTYpings/dockerode.d.ts
declare module "dockerode" {
//https://docs.docker.com/engine/reference/api/docker_remote_api_v1.22/#create-a-container
interface CreateContainerReq {
       name?: string;
       Hostname?: string;
       Domainname?: string;
       User?: string;
       AttachStdin?: boolean;
       AttachStdout?: boolean;
       AttachStderr?: boolean;
       Tty?: boolean;
       OpenStdin?: boolean;
       StdinOnce?: boolean;
       Env?: string[];
       Cmd?: string[]|string;
       Entrypoint?: string;
       Image: string;
       Labels?: {[label: string]: string};
       Mounts?: {
           Name?: string;
           Source?: string;
           Destination?: string;
           Driver?: string;
           Mode?: string;
           RW?: boolean;
           Propagation?: string;
       }[];
       WorkingDir?: string;
       NetworkDisabled?: boolean;
       MacAddress?: string;
       ExposedPorts?: {
               [port: string]: {}
       };
       StopSignal?: string;
       HostConfig?: {
         Binds?: string[],
         Links?: string[],
         Memory?: number;
         MemorySwap?: number;
         MemoryReservation?: number;
         KernelMemory?: number;
         CpuShares?: number;
         CpuPeriod?: number;
         CpuQuota?: number;
         CpusetCpus?: string;
         CpusetMems?: string;
         BlkioWeight?: number;
         BlkioWeightDevice?: [{}];
         BlkioDeviceReadBps?: [{}];
         BlkioDeviceReadIOps?: [{}];
         BlkioDeviceWriteBps?: [{}];
         BlkioDeviceWriteIOps?: [{}];
         MemorySwappiness?: number;
         OomKillDisable?: boolean;
         OomScoreAdj?: number;
         PortBindings?: { [port: string]: [{ HostPort?: string }] },
         PublishAllPorts?: boolean;
         Privileged?: boolean;
         ReadonlyRootfs?: boolean;
         Dns?: string[];
         DnsOptions?: string[];
         DnsSearch?: string[];
         ExtraHosts?: string[];
         VolumesFrom?: string[];
         CapAdd?: string[];
         CapDrop?: string[];
         GroupAdd?: string[];
         RestartPolicy?: { Name?: string; MaximumRetryCount?: number };
         NetworkMode?: string;
         Devices?: [{PathOnHost?: string, PathInContainer?: string, CgroupPermissions?: string}];
         Ulimits?: [{}];
         LogConfig?: {
                                         Type?: string, //json-file, syslog, journald, gelf, awslogs, splunk, none. json-file 
                                         Config?: {} };
         SecurityOpt?: string[];
         CgroupParent?: string;
         VolumeDriver?: string;
         ShmSize?: number;
      };
  }

  interface ContainerInfo {
      Id: string;
      Names: string[];
      Image: string;
      ImageID: string;
      Command: string;
      Created: number;
      Status: string;
      Ports: {
        IP: string,
        PrivatePort: number,
        PublicPort: number;
        Type: string
      }[];
      Labels: {};
      SizeRw: number;
      SizeRootFs: number;
      NetworkSettings: {
              Networks: {
                      [name: string]: {
                              NetworkID: string;
                              EndpointID: string;
                              Gateway: string;
                              IPAddress: string;
                              IPPrefixLen: number;
                              IPv6Gateway: string;
                              GlobalIPv6Address: string;
                              GlobalIPv6PrefixLen: number;
                              MacAddress: string;
                      }
              }
      };

  }
  interface ErrorObject {
    reason: string;
    statusCode: number;
    json: string;
  }
  interface Container {
    id: string;
    inspect(options: {
      size: boolean
    }, done?: (err: Error, info: any) => any); //TODO info
    inspect(done?: (err: Error, info: any) => any); //TODO
    //rename
    //update
    //changes
    //export
    start(params: {detachKeys: string}, done?: (err?: Error) => any);
    start(done?: (err?: ErrorObject) => any);
    //pause
    //unpause
    //exec
    //commit
    //stop
    restart(done: (err?: Error) => any);
    restart(params: {t: number}, done: (err?: Error) => any);
    //kill
    //resize
    //attach
    //wait
    //remove
    //copy
    //getArchive
    //infoArchive
    //putArchivo
    logs(options: {
       follow?: boolean; // - 1/True/true or 0/False/false, return stream. Default false.
       stdout?: boolean, // – 1/True/true or 0/False/false, show stdout log. Default false.
       stderr?: boolean, // – 1/True/true or 0/False/false, show stderr log. Default false.
       since?: number,   // – UNIX timestamp (integer) to filter logs. Specifying a timestamp will only output log-entries since that timestamp. Default: 0 (unfiltered)
       timestamps?: boolean, // – 1/True/true or 0/False/false, print timestamps for every log line. Default false.
       tail?: number;
    }, callback: (error, stream:  NodeJS.ReadableStream)=>any);
    //stats
  }

  interface ListQueryParameters {
      all?: boolean;
      limit?: number;
      since?: string;
      before?: string;
      size?: boolean;
      filters?: {
        //  -- containers with exit code of <int>
        exited?: number[],
        status?: ("created"|"restarting"|"running"|"paused"|"exited"|"dead")[],
        label?: string[],
        isolation?: ("default"|"process"|"hyperv")[]// (Windows daemon only)
      };
  }

  interface EventsQueryParameters {
    since?: number;
    until?: number;
    filters?: {
      // -- container to filter
      container?: string[],
      // -- event to filter
      event?: string[],
      // -- image to filter
      image?: string[],
      // -- image and container label to filter
      label?: string[],
      // -- either container or image or volume or network
      type?: ("container"|"image"|"volume"|"network")[],
      // -- volume to filter
      volume?: string[],
      // -- network to filter
      network?: string[]
    };
  }

  interface AuthConfig {
    username: string;
    password: string;
    auth: '';
    email?: string;
    serveraddress: string;
  }

  class Modem {
    followProgress(stream: NodeJS.ReadableStream, onFinished: (error, output) => any, onProgress: (event) => any);
  }

  class Docker {
    modem: Modem;
    constructor(dockerHost?: any);
    pull(tag: string, auth: {"authconfig": AuthConfig}, done: (err, stream) => any);
    pull(tag: string, done: (err: ErrorObject, stream: NodeJS.ReadableStream) => any);
    listContainers(options: ListQueryParameters, done: (err: ErrorObject, containers: ContainerInfo[]) => any );
    listContainers(done: (err: ErrorObject, containers: ContainerInfo[]) => any );
    getContainer(id: string): Container;
    createContainer(configuration: CreateContainerReq, callback: (err: ErrorObject, container: Container) => any );
    getEvents(options: EventsQueryParameters, callback: (err: ErrorObject, events: NodeJS.ReadableStream) => any )
  }
  export = Docker;
}
