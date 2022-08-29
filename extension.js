// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const { format } = require('path');
const cicd = require('./cicdyaml');
const xmlreader = require('./xmlreader')
var fsextra = require("fs-extra");
var spawnCommand = require('spawn-command');



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cicd-template" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('cicd-template.easycicd', function () {
		

		let projectType=judgeType()
		if(projectType === "nodejs"){
			nodejsGenerate()
		}
		if(projectType === "maven"){
			mavenGenerate()
		}
		if(projectType === "unknown"){
			vscode.window.showErrorMessage("unsupported project type,support list: [nodejs,maven]");
		}
		//console.log(vscode.extensions.getExtension("oneslideicywater.cicd-template").extensionPath)

		// Display a message box to the user
		vscode.window.showInformationMessage('generate cicd manifest success :) ');
	});

	context.subscriptions.push(disposable);
}

function mavenGenerate(){
	let projectRoot=vscode.workspace.workspaceFolders[0].uri.fsPath
	// generate cicd mainifests
	let extPath=vscode.extensions.getExtension("oneslideicywater.cicd-template").extensionPath
	let mvnPath = extPath+"/templates/maven"

	let callfunc = (e) => {
		console.log(e);
		vscode.window.showInformationMessage(e.message);
	}
	// copy Jenkinsfile
	fs.copyFile(extPath+"/templates/Jenkinsfile",projectRoot+"/Jenkinsfile",callfunc)
	// generate cicd.yaml
	let pm = xmlreader.analysisProject(projectRoot)
	fs.writeFile(projectRoot+"/cicd.yaml",cicd.generateYaml(pm.project,"example-namespace",["your_name"],pm.mods,"maven"),callfunc)

	if (pm.mods == null || pm.mods.length == 0){
		fs.copyFile(mvnPath+"/Dockerfile",projectRoot+"/Dockerfile",callfunc)
		fs.copyFile(mvnPath+"/Dockerfile-arm64",projectRoot+"/Dockerfile-arm64",callfunc)
		fsextra.copy(mvnPath+"/.helm",projectRoot+"/.helm",callfunc)
		fsextra.copy(mvnPath+"/deploy",projectRoot+"/deploy",callfunc)
	}else{
		// copy files for each module, include Dockerfile and helm charts
		pm.mods.forEach(mod => {
			let mod_path = projectRoot +"/" + mod
			fs.copyFile(mvnPath+"/Dockerfile",mod_path+"/Dockerfile",callfunc)
			fs.copyFile(mvnPath+"/Dockerfile-arm64",mod_path+"/Dockerfile-arm64",callfunc)
			fsextra.copy(mvnPath+"/.helm",mod_path+"/.helm",callfunc)
			fsextra.copy(mvnPath+"/deploy",mod_path+"/deploy",callfunc)
		})
	}
	
 }


function nodejsGenerate(){
	let callfunc = (e) => {
		console.log(e);
		vscode.window.showInformationMessage(e.message);
	}
	let projectRoot=vscode.workspace.workspaceFolders[0].uri.fsPath
	// generate cicd mainifests
	let extPath=vscode.extensions.getExtension("oneslideicywater.cicd-template").extensionPath
	let nodejsPath = extPath+"/templates/nodejs"
	fs.writeFile(projectRoot+"/cicd.yaml",cicd.generateYaml("example","example-namespace",["your_name"],null,"nodejs"),callfunc)
	fs.copyFile(nodejsPath+"/Dockerfile",projectRoot+"/Dockerfile",callfunc)
	fs.copyFile(nodejsPath+"/Dockerfile-arm64",projectRoot+"/Dockerfile-arm64",callfunc)
	fs.copyFile(nodejsPath+"/build.sh",projectRoot+"/build.sh",callfunc)
	fs.copyFile(nodejsPath+"/nginx.conf.template",projectRoot+"/nginx.conf.template",callfunc)
	fs.copyFile(extPath+"/templates/Jenkinsfile",projectRoot+"/Jenkinsfile",callfunc)
}
// judge project type, supported type: ["nodejs","maven"]
function judgeType(){
	const projectRoot=vscode.workspace.workspaceFolders[0].uri.fsPath
	if(fs.existsSync(projectRoot+"/package.json") || !fs.existsSync(projectRoot+"/pom.xml")){
		return "nodejs"
	}
	if(!fs.existsSync(projectRoot+"/package.json") || fs.existsSync(projectRoot+"/pom.xml")){
		return "maven"
	} 
	return "unknown"
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
