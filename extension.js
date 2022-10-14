// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const { format } = require('path');
const cicd = require('./cicdyaml');
const xmlreader = require('./xmlreader')
var fsextra = require("fs-extra");
var spawnCommand = require('spawn-command');
const axios = require('axios');



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

	let disposable2 = vscode.commands.registerCommand('cicd-template.easybuild', function(){

		
		// easybuild trigger a remote jenkins build
		let projectRoot=vscode.workspace.workspaceFolders[0].uri.fsPath
		fs.promises.readFile(projectRoot+"/.git/HEAD")
				.then(data =>{
					
					// ref: refs/heads/master => master
					let branch= data.toString().replace("ref: refs/heads/","").trim()	
					fs.promises.readFile(projectRoot+"/cicd.yaml").then(data => {
						
						let buildOptions=cicd.readEasyBuildOptions(data.toString())
						buildOptions.job.branch=branch
						return buildOptions
					}).then(options=>{
						let reqUrl=options.jenkins.url+"/job/"+options.job.name+"/job/"+ options.job.branch+"/build?delay=0sec"
						axios.post(reqUrl,{},{
							auth: {
								username: options.auth.user,
								password: options.auth.token
							}
						}).then(response=>{
							if (response.status.toString().startsWith("2")){
								
								vscode.window.showInformationMessage(`${options.job.name}/${options.job.branch} trigger build success!`);
							}else{
								vscode.window.showErrorMessage(response.data)
								vscode.window.showErrorMessage("failed to trigger");
							}

						}).catch(err=>{
							vscode.window.showErrorMessage(err.message);
						})

					}).catch(err=>{
						vscode.window.showErrorMessage(err.message);
					})
					
				}).catch(err =>{

					vscode.window.showErrorMessage(err.message);
				})
		
		


	}); 


	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
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

	

	// parse package.json
	fs.readFile(projectRoot+"/package.json",(err,data)=>{
		if (err!=null){
			vscode.window.showInformationMessage(err.message);
		}else{
		    let packageJson = JSON.parse(Buffer.from(data))
			fs.writeFile(projectRoot+"/cicd.yaml",cicd.generateYaml(packageJson.name,"example-namespace",[packageJson.author],null,"nodejs"),callfunc)
			// generate nginx.conf
			const parseEnvFile = require('env-file-reader').parse;
			let envs = parseEnvFile(projectRoot+"/.env.production");
	
			let nginxConfig = []
			Object.keys(envs).forEach(attr =>{
				if(attr.startsWith("VITE_PROXY_PREFIX_")){
					console.log(attr+":"+envs[attr])
					// VITE_PROXY_PREFIX_DEFAULT=/api
					// VITE_PROXY_TARGET_DEFAULT=http://xxx:9003
					// targetPath is "DEFAULT", proxyPass is "VITE_PROXY_TARGET_DEFAULT"
					let targetPath=attr.replace("VITE_PROXY_PREFIX_","")
					let proxyPass="VITE_PROXY_TARGET_"+targetPath
					nginxConfig.push(`
					location ${envs[attr]}/ {
						proxy_pass ${envs[proxyPass]}/;
				
						proxy_set_header Upgrade $http_upgrade;
						proxy_set_header Connection "Upgrade";
				
						proxy_set_header Host $http_host;
						proxy_set_header X-Real-IP $remote_addr; #保留代理之前的真实客户端ip
						proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; #记录代理过程
				
						proxy_cookie_path ${envs[attr]} /;
					}
					
					`)
				}
			})
		let nginxTemplate = `
	# main-app配置
	server {

		listen 80;
		server_name ${packageJson.name};


		location / {
			if ($request_method = 'OPTIONS') {
				return 204;
			}
			root /usr/share/nginx/html/;
			index index.html index.htm;
			try_files $uri $uri/ /index.html; #解决页面刷新404问题
		}

	${nginxConfig.join("")}

		location @router {
		rewrite ^.*$ /index.html last;
		}

		error_page 404 /404.html;
		error_page 500 502 503 504 /50x.html;
		location = /50x.html {
		root html;
		}
	}
	`
  
  	fs.writeFile(projectRoot+"/nginx.conf.template",nginxTemplate,callfunc)
		}
	})

	
	// generate cicd mainifests
	let extPath=vscode.extensions.getExtension("oneslideicywater.cicd-template").extensionPath
	let nodejsPath = extPath+"/templates/nodejs"

	fs.copyFile(nodejsPath+"/Dockerfile",projectRoot+"/Dockerfile",callfunc)
	fs.copyFile(nodejsPath+"/Dockerfile-arm64",projectRoot+"/Dockerfile-arm64",callfunc)
	fs.copyFile(nodejsPath+"/build.sh",projectRoot+"/build.sh",callfunc)
	fs.copyFile(nodejsPath+"/nginx.conf.template",projectRoot+"/nginx.conf.template",callfunc)
	fs.copyFile(nodejsPath+"/.dockerignore",projectRoot+"/.dockerignore",callfunc)
	fs.copyFile(extPath+"/templates/Jenkinsfile",projectRoot+"/Jenkinsfile",callfunc)
	fsextra.copy(nodejsPath+"/.helm",projectRoot+"/.helm",callfunc)
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

// easy build




// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
