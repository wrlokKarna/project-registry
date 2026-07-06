import * as fs from 'fs'
import type path from 'path';
import { getSelector } from './helpers.js';




type letters = 'A' | '  B' | 'C' | 'D' | 'E' | 'F'
export type AbsolutePath = `${letters | Lowercase<letters>}:/${string}` | `/${string}`;

export type ProjectKeys = {
    id: number;
    name: string;
    path: string;
};
export interface Project extends ProjectKeys {
    alias?: string;
    dir?: string;
    timestamp: string;
    link?: string[]
}


function openRegistry(appDataDir: string, filePath: string): Project[] {
    if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true })
    if (!fs.existsSync(filePath)) {
        const writeData: Project[] = []
        fs.writeFileSync(filePath, JSON.stringify(writeData))
        return writeData
    }

    const fileData = fs.readFileSync(filePath, 'utf-8')
    return fileData ? JSON.parse(fileData) : [] as Project[]
}


/* [Note - feature]
// Lookups using this Map will be O(1)
const projectMap = new Map<any, { project: Project; index: number }>();

registryData.forEach((project, index) => {
    projectMap.set(project.someKey, { project, index });
});
*/
export function getProject<K extends keyof ProjectKeys>(key: K, value: ProjectKeys[K], registryData: Project[]) {
    let projectIndex = -1;
    const project = registryData.find((proj, index) => {
        if (proj[key] === value) {
            projectIndex = index;
            return true;
        }
        if (key === 'path' && typeof value === 'string' && proj.path && typeof proj.path === 'string') {
            if (value.toLowerCase() === proj.path.toLowerCase()) {
                projectIndex = index;
                return true
            }
        }
        return false;
    });
    if (projectIndex === -1 || !project) {
        return null;
    }
    return { queryKey: key, index: projectIndex, project };
}

//function updateProject(project: Project) {
//    console.log("update:", project)
//    return "status -> success / failure"
//}
//function removeProject(project: Project) {
//    console.log("remove:", project)
//    return "status -> success / failure"
//}

export type ProjectRegistryResult = {
    queryKey: string,
    index: number,
    project: string
}
export class ProjectRegistry {
    private registryData: Project[];
    private registryFilePath: string;
    private testFn: any

    constructor(appDataDir: string, filePath: string) {
        this.registryFilePath = filePath;
        this.registryData = openRegistry(appDataDir, filePath);
        this.testFn = (() => {
            console.log('[Auto Print]', appDataDir, filePath)
        })()
    }

    private writeToFile() {
        try {
            fs.writeFileSync(this.registryFilePath, JSON.stringify(this.registryData, null, 2));
            return {
                status: true,
                msg: `\x1b[32m✔\x1b[0m Successfully unregistered:`
            }
        } catch (error) {
            return {
                status: false,
                msg: "❌ Failed to save changes to registry file:",
                error: error  //error.message
            }
        }
    }

    public add(project: Project) {
        this.registryData.push(project);
        try {
            fs.writeFileSync(this.registryFilePath, JSON.stringify(this.registryData, null, 2), 'utf-8');
            return {
                msg: `Successfully initialized ${'project'} at ${project.path}`
            }
        } catch (err) {
            return { msg: "Failed to save registry:", err }
        }
    }

    public get<K extends keyof ProjectKeys>(key: K, value: ProjectKeys[K]) {
        const index = this.registryData.findIndex((proj) => {
            if (key === 'path' && typeof value === 'string' && proj.path && typeof proj.path === 'string') {
                return (value.toLowerCase() === proj.path.toLowerCase())
            }
            return proj[key] === value
        });
        if (index === -1) return null;

        return { queryKey: key, index, project: this.registryData[index] };
    }

    public update(project: Project, data: Project) {
        Object.assign(project, data);
        const result = this.writeToFile()
        return result

    }

    public remove(arg: string) {
        const type = getSelector(arg)
        const project = this.get(type.type, type.value)
        if (!project) {
            return {
                msg: "project not found in registry",
                status: false
            }
        }
        this.registryData.splice(project.index, 1)[0]
        const result = this.writeToFile()
        return result
    }
}

export function createGetProject(registryData: Project[]) {
    return function getProject<K extends keyof ProjectKeys>(
        key: K,
        value: ProjectKeys[K]
    ) {
        const index = registryData.findIndex((proj) => proj[key] === value);

        if (index === -1) return null;

        return {
            queryKey: key,
            index,
            project: registryData[index]
        };
    };
}

interface Registry {
    getAll: (parameters: { appDataDir: string; filePath: string }) => Project[];
    get: (idOrTitle: number | string) => void;
    //getById: (id: number) => void;
    //getByTitle: (title: string) => void; // Changed argument type to string assuming title is text
    //add: (para: Project) => void;        // Adjust 'void' to whatever your functions return
    //remove: (para: Project) => void;
    //update: (para: Project) => void;
}

export const registry: Registry = {
    getAll: (parameters: { appDataDir: string, filePath: string }): Project[] => openRegistry(parameters.appDataDir, parameters.filePath),
    get: (idOrTitle: number | string) => {
        if (typeof idOrTitle === "number") {
            console.log(`Fetching by ID: ${idOrTitle}`);
        } else {
            // TypeScript knows idOrTitle is a string here
            console.log(`Fetching by Title: ${idOrTitle}`);
        }
    },
    //getById: (id: number) => console.log(`get by id: ${id}`),
    //getByTitle: (title: string) => console.log(`get by title: ${title}`),
    //add: (para: Project) => addProject(para),
    //remove: (para: Project) => removeProject(para),
    //update: (para: Project) => updateProject(para)
}

//registry.get()
//registry.add({id: 0, name: "novelty"})
//registry.remove()
//registry.update()