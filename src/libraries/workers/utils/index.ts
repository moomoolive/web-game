import { sleepSeconds } from "@/libraries/misc"

export async function yieldForIncomingEvents(): Promise<void> {
    await sleepSeconds(0)
}
