import Dexie from "dexie"

import { globals } from "@/consts"

export class AppDatabase extends Dexie {
    saves!: Dexie.Table<GameSave, Id>

    constructor() {
        super("app-database")
        this.version(parseFloat(globals.APP_VERSION)).stores({
            saves: "++id,type,createdAt,updatedAt,stringifiedState"
        })
    }

    private timestamps(): Timestamps {
        const now = Date.now()
        return {
            createdAt: now,
            updatedAt: now,
        }
    }

    // saves interfaces

    private async createSave(stringifiedState: string, type: SaveType, name: string): Promise<number> {
        try {
            const res = await this.saves.add({
                type,
                name,
                ...this.timestamps(),
                stringifiedState
            })
            return res
        } catch(err) {
            throw err
        }
    }

    async createCrashSave(stringifiedState: string): Promise<number> {
        try {
            const res = await this.createSave(
                stringifiedState,
                "crash-save",
                "crash-save-" + new Date().toLocaleString("en-US")
            )
            return res
        } catch(err) {
            throw err
        }
    }

    async getLatestCrashSave(): Promise<GameSave | null> {
        try {
            const type: SaveType = "crash-save"
            const res = await this.saves
                .where("type")
                .equals(type)
                .last()
            return res || null
        } catch(err) {
            throw err
        }
    }
}

type Id = number
interface Timestamps {
    createdAt: number
    updatedAt: number
}

type SaveType = "auto-save" | "crash-save" | "quick-save" | "manual-save"

interface GameSave extends Timestamps {
    id?: Id
    type: SaveType
    name: string
    stringifiedState: string
}