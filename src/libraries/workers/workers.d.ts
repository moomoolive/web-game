type WorkerConstructor = () => Worker

declare module "worker:@/libraries/workers/workerTypes/mainGameThread" {
    const library: WorkerConstructor
    export default library
}
