import Docker = require("dockerode");
import {logger} from "./logger";

export class DockerodePromesied {
  constructor(private docker: dockerode.Docker, private logMark: string) {}
  public listContainers = this.promisifyDocker1Arg("listing containers", this.docker.listContainers);
  public listNetworks = this.promisifyDocker1Arg("listing networks", this.docker.listNetworks);
  public run = this.promisifyDocker5Arg("running container", this.docker.run);
  public createContainer = this.promisifyDocker1Arg("creating container", this.docker.createContainer);
  public createNetwork = this.promisifyDocker1Arg("creating network", this.docker.createNetwork);


  public startContainer(container: dockerode.Container) {
    return this.promisifyDocker("start container", container.start, { context: container })();
  };
  public removeContainer(container: dockerode.Container, options: dockerode.ContainerRemoveOptions) {
    return this.promisifyDocker1Arg("remove container", container.remove, { context: container })(options);
  };
  public killContainer(container: dockerode.Container, signal: string) {
    return this.promisifyDocker1Arg("kill container", container.kill, { context: container })({signal: signal});
  };
  public async connectContainerToNetwork(containerName: string, network: dockerode.Network) {
    return this.promisifyDocker1Arg("connect network", network.connect, { context: network })({Container: containerName});
  };
  public removeNetwork(network: dockerode.Network) {
    return this.promisifyDocker("removing network", network.remove, { context: network })();
  };




  // -------------------------- Helper methds --------------------//
  private promisifyDocker5Arg<A1, A2, A3, A4, A5, T>(message: string, method: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: (err, response: T) => any) => any, context?: { context: any }): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Promise<T> {
    let contextCall = context ? context.context : this.docker;
    return (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => {
      return new Promise<T>((resolve, reject) => {
        logger.debug("[ %s ]: '%s' args: ", this.logMark, message, arg1, arg2, arg3, arg4, arg5);
        method.call(contextCall, arg1, arg2, arg3, arg4, arg5,(error, result) => {
          if (error) {
            logger.error("[ %s ] %s ", this.logMark, message, error);
            return reject(error);
          }
          logger.debug("[ %s ]: '%s' result - ", this.logMark, message, result);
          resolve(result);
        });
      });
    };
  }

  private promisifyDocker4Arg<A1, A2, A3, A4, T>(message: string, method: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: (err, response: T) => any) => any, context?: { context: any }): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Promise<T> {
    let contextCall = context ? context.context : this.docker;
    return (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => {
      return new Promise<T>((resolve, reject) => {
        logger.debug("[ %s ]: '%s' args: ", this.logMark, message, arg1, arg2, arg3, arg4);
        method.call(contextCall, arg1, arg2, arg3, arg4, (error, result) => {
          if (error) {
            logger.error("[ %s ] %s ", this.logMark, message, error);
            return reject(error);
          }
          logger.debug("[ %s ]: '%s' result - ", this.logMark, message, result);
          resolve(result);
        });
      });
    };
  }

  private promisifyDocker3Arg<A1, A2, A3, T>(message: string, method: (arg1: A1, arg2: A2, arg3: A3, callback: (err, response: T) => any) => any, context?: { context: any }): (arg1: A1, arg2: A2, arg3: A3) => Promise<T> {
    let contextCall = context ? context.context : this.docker;
    return (arg1: A1, arg2: A2, arg3: A3) => {
      return new Promise<T>((resolve, reject) => {
        logger.debug("[ %s ]: '%s' args: ", this.logMark, message, arg1, arg2, arg3);
        method.call(contextCall, arg1, arg2, arg3, (error, result) => {
          if (error) {
            logger.error("[ %s ] %s ", this.logMark, message, error);
            return reject(error);
          }
          logger.debug("[ %s ]: '%s' result - ", this.logMark, message, result);
          resolve(result);
        });
      });
    };
  }

  private promisifyDocker2Arg<A1, A2, T>(message: string, method: (arg1: A1, arg2: A2, callback: (err, response: T) => any) => any, context?: { context: any }): (arg1: A1, arg2: A2) => Promise<T> {
    let contextCall = context ? context.context : this.docker;
    return (arg1: A1, arg2: A2) => {
      return new Promise<T>((resolve, reject) => {
        logger.debug("[ %s ]: '%s' args: ", this.logMark, message, arg1, arg2);
        method.call(contextCall, arg1, arg2, (error, result) => {
          if (error) {
            logger.error("[ %s ] %s ", this.logMark, message, error);
            return reject(error);
          }
          logger.debug("[ %s ]: '%s' result - ", this.logMark, message, result);
          resolve(result);
        });
      });
    };
  }
  private promisifyDocker1Arg<A1, T>(message: string, method: (arg1: A1, callback: (err, response: T) => any) => any, context?: { context: any }): (arg: A1) => Promise<T> {
    let contextCall = context ? context.context : this.docker;
    return (arg: A1) => {
      return new Promise<T>((resolve, reject) => {
        logger.debug("[ %s ]: '%s' args: ", this.logMark, message, arg);
        method.call(contextCall, arg, (error, result) => {
          if (error) {
            logger.error("[ %s ] %s ", this.logMark, message, error);
            return reject(error);
          }
          logger.debug("[ %s ]: '%s' result - ", this.logMark, message, result);
          resolve(result);
        });
      });
    };
  }
  private promisifyDocker<T>(message: string, method: (callback: (err, response: T) => any) => any, context?: { context: any }): () => Promise<T> {
    let contextCall = context ? context.context : this.docker;
    return () => {
      return new Promise<T>((resolve, reject) => {
        method.call(contextCall, (error, result) => {
          if (error) {
            logger.error("[ %s ] %s ", this.logMark, message, error);
            return reject(error);
          }
          logger.debug("[ %s ]: '%s' result - ", this.logMark, message, result);
          resolve(result);
        });
      });
    };
  }
}

