# cicd-template

It's a very simple tools to generate pipeline manifests.

## Features

- manifest generate for maven project
- manifest generate for npm project


## Requirements


### Generate cicd manifest

input `Ctrl+Shift+P`, enter `easycicd`. you're done, That's it!

### Trigger remote build

since v3.0.0, you can trigger remote pipeline build, with some code snippet under `cicd.yaml`


a working example: 


> how to get a token?  login to jenkins, Click your username at left-top, `Configure` -> `API Token`

- cicd.yaml
```yaml
easybuild: 
  jenkins:
    url: http://xxx.xxx.xxx.xxx:8080
  job: 
    name: "myapp"
  auth:
    user: "admin"
    token: ""  # your token here
```

after add it to `cicd.yaml`. Enter `Ctrl+Shift+P`, input `easybuild`. you'll trigger a job build.


## Extension Settings

none

## Known Issues

none

## Release Notes

Users appreciate release notes as you update your extension.

### 2.0.0

deprecate cicd-template binary, only install via vscode marketplace

### 1.0.1

fix Dockerfile generating error

### 1.0.0

Initial release of cicd-template

- basic cicd manifest generating, maven and npm project

as cicd pipeline updating, we'll update this plugin assp.


