type WorkerConstructor = () => Worker

declare module "worker:@/libraries/workers/mainGameThread" {
    const library: WorkerConstructor
    export default library
}
