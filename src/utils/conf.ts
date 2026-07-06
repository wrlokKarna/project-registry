import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { parse, stringify } from 'smol-toml';

interface AppConfig {
    lastInitialized: string;
    debugging: boolean
}

const DEFAULT_CONFIG: AppConfig = {
    lastInitialized: new Date().toISOString(),
    debugging: false
};

export async function initConf(appDataPath: any, confFilePath: any, debug: boolean = false) {

    await fs.mkdir(appDataPath, { recursive: true });

    let config

    try {
        const rawData = await fs.readFile(confFilePath, 'utf8');
        config = parse(rawData);
        debug && console.log("Config loaded:", config);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            const tomlString = stringify(DEFAULT_CONFIG);
            await fs.writeFile(confFilePath, tomlString, 'utf8');
            config = tomlString
            debug && console.log("Default configuration created.");
        } else {
            throw err;
        }
    }
    const isParameters = "";
    return { appDataPath, config };
}

function createConfFile() {

}

/**
 * Updates specific keys in the configuration file.
 * Uses Partial<AppConfig> so you can pass only the fields you want to change.
 */
export async function updateConfig(confFilePath: string, newSettings: Partial<AppConfig>): Promise<void> {
    try {
        // 1. Read the current file
        const rawData = await fs.readFile(confFilePath, 'utf8');
        const currentConfig = parse(rawData) as any;

        // 2. Merge changes
        const updatedConfig = { ...currentConfig, ...newSettings };

        // 3. Write back to file
        const tomlString = stringify(updatedConfig);
        await fs.writeFile(confFilePath, tomlString, 'utf8');

        console.log("Configuration updated successfully.");
    } catch (err) {
        console.error("Failed to update config:", err);
        throw err;
    }
}



export function getAppDataDir(): string {
    switch (process.platform) {
        case 'win32':
            return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming', 'ProjectRegistry');
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support');
        default:
            return process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    }
}

export function getConfPath(appDataPath: string): string {
    return path.join(appDataPath, 'conf.toml')
}

export function getRegistryPath(appDataPath: string): string {
    return path.join(appDataPath, 'registry.json')
}