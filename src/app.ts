#!/usr/bin/env node
import * as path from 'path';
import fs, { cp, link } from 'fs'
import chalk from "chalk";
import { program } from "commander"
import { getAppDataDir, getConfPath, getRegistryPath, initConf } from "./utils/conf.js"
import { ProjectRegistry, registry, createGetProject, type Project, getProject } from "./utils/registry.js";
import { pcTxt, isValidPath, cPrint, getSelector, openInApp } from './utils/helpers.js';


const appDataPath = path.join(getAppDataDir(), 'ProjectRegistry');
const confFilePath = getConfPath(appDataPath);
const registryFilePath = getRegistryPath(appDataPath);


const registryClass: any = new ProjectRegistry(appDataPath, registryFilePath);
const registryData = registryClass.registryData as Project[]


/* Note Commit Review
//const registryData = registry.getAll({ appDataDir: appDataPath, filePath: registryFilePath })
const getProjectF = createGetProject(registryData);
//console.log("factory", getProjectF('id', 2))
*/


program
	.name("prl")
	.description(pcTxt("Project Registry Linker") + chalk.white("- Manage your projects across directories"))
	.version("0.0.1")


program
	.command('init')
	.description(pcTxt("Use this command to initialize a Project | Solution | Library"))
	//.option('--project [name]', 'Initialize as project')
	//.option('--solution [name]', 'Initialize as solution')
	//.option('--library [name]', 'Initialize as library')
	// .helpGroup('Metrics & Reporting:')
	.action((opts) => {
		//if (Object.keys(opts).length === 0) return console.log(chalk.redBright("Please provide atleast one Option"))

		const currentPath = process.cwd()
		const proj = getProject('path', currentPath, registryData)

		initConf(appDataPath, confFilePath).then((config: any) => {
			const isValid = Object.keys(opts).length === 1
			if (config.config.hintsEnabled) {
				Object.keys(opts).forEach((k) => {
					if (!isValid) console.log(`please use only one option ie prl init --${k}`)
				})
			}
			return
		})
		if (proj) {
			console.log()
			console.log(chalk.redBright(`[Error]: Project found in registry`) + ` -> path: ${currentPath}`)
			console.log("[Hint]: use " + chalk.green(`prl get <${proj.project.id}|${proj.project.name}|${proj.project.path}>`))
			return
		}
		const newProject: Project = {
			id: (registryData[registryData.length - 1]?.id ?? -1) + 1,
			name: path.basename(currentPath),
			path: currentPath,
			dir: path.basename(currentPath),
			//type: type,
			timestamp: Date.now().toString()
		}
		const result = registryClass.add(newProject)
		console.log(result.msg)

		/* Note Code Review
		return
		if (Object.keys(opts).length !== undefined) {
			// 1. Identify which flag was used
			const types = ['project', 'solution', 'library'];
			const chosenType = types.find(t => opts[t] !== undefined);

			// Validate: only one allowed
			const activeOptions = Object.keys(opts).filter(k => opts[k] !== undefined);
			if (activeOptions.length > 1) {
				console.error(chalk.red("Error: Choose only one type."));
				return;
			}

			const type = chosenType || 'project';
			const folderName = opts[type] === true ? '.' : opts[type];
			const targetPath = path.resolve(process.cwd(), folderName);

			// 2. Check existence in registry
			const existingProject = registryData.find(p => p.path === targetPath);
			if (existingProject) {
				console.log(chalk.yellow("Project already exists in registry:"), existingProject);
				return;
			}

			const lastProject = registryData && registryData.length > 0
				? registryData[registryData.length - 1]
				: null;

			try {
				fs.writeFileSync(registryFilePath, JSON.stringify(registryData, null, 2), 'utf-8');
				console.log(chalk.green(`Successfully initialized ${type} at ${targetPath}`));
			} catch (err) {
				console.error(chalk.red("Failed to save registry:"), err);
			}

		}

		console.log("no options")
		*/
	});

program
	.command("add [selector]")
	.description(pcTxt("Register an existing folder to your project metadata"))
	.option('--name -n <name>')
	.option('--path -p <path>')
	.action((args, opts) => {
		const projectPath = path.resolve(opts.path ? opts.path : '') // cwd()  process.cwd()
		const proj = getProject('path', projectPath, registryData)
		if (proj) {
			return console.log(chalk.red('project found in registry'))
		}
		const newProject: Project = {
			id: registryData?.length === 0 ? 0 :
				(registryData[registryData.length - 1]?.id ?? 0) + 1,
			//id: (registryData[registryData.length - 1]?.id ?? -1) + 1,
			name: opts.name ? opts.name : path.basename(projectPath),
			path: projectPath,
			dir: path.basename(projectPath) ?? null,
			timestamp: Date.now().toString()
		}

		const result = registryClass.add(newProject)
		console.log(result.msg)
	})
program
	.command("remove <id|name|path>")
	.alias('rm')
	.description(pcTxt("Unregister a folder from your project metadata"))
	.action((arg) => {
		const result = registryClass.remove(arg)
		console.log(
			result.status ?
				chalk.greenBright(result.msg) :
				chalk.redBright(result.msg)
		)
	})
program
	.command("list")
	.alias('ls')
	.action(() => {
		registryData.forEach((record) => {
			console.log(chalk.cyan(`${record.id}:`), record.name)
		})
	})
program
	.command("update <id|name|path>")
	.option('--name <name>')
	.option('--alias <alias>')
	.option('--path <path>')
	.option('--link <link...>')
	.option('--docs <docs...>')
	.action((args, opts) => {

		const optsKeys = Object.keys(opts)
		if (optsKeys.length === 0) {
			return console.log(chalk.redBright("❌ Please provide atleast one option"))
		}

		const selectorType = getSelector(args)
		const proj = getProject(selectorType.type, selectorType.value, registryData)
		if (proj === null) {
			return console.log("❌ Project doesnot exist in registry")
		}

		const updates: Record<string, any> = {};
		for (const opt of optsKeys) {
			if (opt === 'path') {
				const absolutePath = path.resolve(opts[opt]);
				if (!isValidPath(absolutePath).status) {
					return console.log('❌', chalk.redBright("Please provide valid Folder"), absolutePath);
				}

				const existingProj = getProject('path', absolutePath, registryData); //registryData.find(p => p.path.toLowerCase() === absolutePath.toLowerCase()) 
				if (existingProj && existingProj.index !== proj.index) {
					return console.log('❌ path already exists in another project');
				}
				updates[opt] = absolutePath;
			}
			updates[opt] = opts[opt];

		}
		updates.timestamp = Date.now().toString()

		const result = registryClass.update(proj.project, updates)
		console.log(
			result.status ?
				chalk.greenBright(result.msg) :
				chalk.redBright(result.msg)
		)
	})
program
	.command('show <project>')
	//.command('reveal <project>') 
	// //.command('explore <project>')
	.option('-f')
	//.alias('dir')
	.description(pcTxt('Open project folder in File Explorer'))
	.action((args) => {
		console.log('[n]', args, Number(args))
		const selectorType = getSelector(args)
		const proj = getProject(selectorType.type, selectorType.value, registryData)
		if (!(proj && proj.project.path)) {
			return cPrint('error', "Path Doesnot Exists")
		}
		openInApp('explorer', proj.project.path)
		console.log('[In Open Cmd]', selectorType, proj)
	});

program
	.command('open <project>')
	//.alias('o')
	.description(pcTxt('Open project in configured application'))
	.action((args) => {
		const selectorType = getSelector(args)
		const proj = getProject(selectorType.type, selectorType.value, registryData)
		if (!(proj && proj.project.path)) {
			return cPrint('error', "Path Doesnot Exists")
		}
		openInApp('code', proj.project.path)
		console.log('[In Open Cmd]', selectorType, proj)
	});


program.parse()
