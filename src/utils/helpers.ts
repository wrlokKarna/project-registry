import chalk from "chalk";
import { exec } from "child_process";
import path from "path";
import fs from 'fs';
import type { ProjectKeys } from "./registry.js";

type caseTxtKeys = {
    'error': string,
    'success': string
}
export function cPrint(caseTxt: keyof caseTxtKeys, txt: string) {
    if (caseTxt === 'error') {
        return console.error(`${chalk.redBright('x')}: ${txt}`)
    }
    console.log
}

export function isValidPath(adrs: string) {
    try {
        fs.statSync(adrs).isDirectory()
        return { status: true }
    } catch (err) {
        return { status: false, err }
    }

    //fs.realpathSync
}


export type SelectorResults = | { type: 'id'; value: number } | { type: 'name'; value: string } | { type: 'path'; value: string }
export function getSelector(arg: string): SelectorResults {
    const argNum = Number(arg)
    if (!Number.isNaN(argNum)) {
        return {
            type: 'id', value: argNum
        }
    }
    const isPath = arg.includes('\\') || arg.includes('/')

    return {
        type: isPath ? 'path' : 'name',
        value: isPath ? path.resolve(arg) : arg
    }
}





export function pcTxt(txt: string) {
    return chalk.green(txt)
}

export function getBy<K extends keyof ProjectKeys>(key: K, value: ProjectKeys[K]) {
    console.log(key, value);
}


type Apps = {
    explorer: string
    code: string
}
export function openInApp(appName: keyof Apps, adrs: string) {
    const apps = ['explorer', 'code']
    if (!apps.includes(appName)) return;

    const absolutePath = path.resolve(adrs)
    console.log(adrs, fs.statSync(absolutePath).isDirectory(), fs.statSync(absolutePath).isFile())

    try {
        if (!fs.existsSync(absolutePath)) {
            console.error(`Error: Path does not exist -> ${absolutePath}`);
            return
        }
        const isDir = fs.statSync(absolutePath);
        if (!isDir.isDirectory() || isDir.isFile()) {
            console.error(`Error: Path is a file, not a folder -> ${absolutePath}`);
            return;
        }
        exec(`${appName} "${absolutePath}"`);
    } catch (err) {
        console.error("Failed to process path or execute command:", err);
    }
}
