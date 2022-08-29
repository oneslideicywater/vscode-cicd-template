#!/bin/bash
export REGISTRY=http://172.16.66.36:8081/repository/taobao-mirror/
export SAAS_REGISTRY=http://172.16.66.36:8081/repository/devops-npm-nodesaas/
cd /opt/workdir
npm set registry ${REGISTRY}
npm config set sass_binary_site ${SAAS_REGISTRY}
npm install -g @vue/cli
npm install -g @vue/cli-service
npm install && npm run build
