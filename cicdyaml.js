// generate npm project: cicd.yaml
const yaml = require('js-yaml');
const fs = require('fs');
function npmcicd(name,ns,maintainers){

    // npm project cicd.yaml content
    const content ={
        name: name,
        namespace: ns,
        maintainers: maintainers,
        path: ".",
        env: {
          JOB_BASE_PATH: "/jenkins/agent/workspace/"+ns+"_"+name,
          NODE_IMAGE: "registry.geoway.com/nodejs/node:14.20.0-buster-x86"
        },
        stages: [
            {
                name: "build",
                shell: [
                    "docker run --network host --rm -t -v ${JOB_BASE_PATH}_${BRANCH_NAME}:/opt/workdir ${NODE_IMAGE} /bin/bash /opt/workdir/build.sh"
                ]
            },
            {
                name: "docker",
                shell: [
                    "docker build -t ${CURRENT_DOCKER_IMAGE_TAG} .",
                    "docker push ${CURRENT_DOCKER_IMAGE_TAG}"
                ]
            },
            {
                name: "docker-arm64",
                shell: [
                    "docker buildx build -t ${CURRENT_DOCKER_IMAGE_TAG}-arm64 -f Dockerfile-arm64 --platform=linux/arm64 . --load",
                    "docker push ${CURRENT_DOCKER_IMAGE_TAG}-arm64"
                ]
            },
            {
                name: "helm",
                shell: [
                    "(test ${GIT_BRANCH} = 'master' && kubectl config use-context prod) ||true",
                    "(test ${GIT_BRANCH} = 'develop' && kubectl config use-context dev) ||true",
                    "cd .helm; rm -f *.tgz; helm package .",
                    "cd .helm; curl --data-binary \"@${CHART_NAME}-${CHART_VERSION}.tgz\" ${HELM_REGISTRY}/api/charts",
                    "helm repo update geoway;helm upgrade ${APP_NAME} geoway/${CHART_NAME} --version ${CHART_VERSION} --install -n ${NAMESPACE}",
                    "kubectl rollout restart deployment ${CHART_NAME} -n ${NAMESPACE}"
                ]
            },
            {
                name: "helm-arm64",
                shell: [
                    "(test ${GIT_BRANCH} = 'develop' && kubectl config use-context arm64) ||true",
                    "(test ${GIT_BRANCH} = 'develop' && helm repo update geoway && helm upgrade --set imageName=${CURRENT_DOCKER_IMAGE_TAG}-arm64 ${APP_NAME} geoway/${CHART_NAME} --version ${CHART_VERSION} --install -n ${NAMESPACE}) || true",
                    "(test ${GIT_BRANCH} = 'develop' && kubectl rollout restart deployment ${CHART_NAME} -n ${NAMESPACE} ) || true"
                ]
            }


        ],
        resources:[
            {
                name: "dist",
                source: "dist",
                dist: ""
            }
        ]

    }

    return content
}

function mavencicd(name,ns,maintainers,modules){

    let stage=[

        {
            name: "build",
            shell: [
                "docker run --network host --rm -t -v ${JOB_BASE_PATH}_${BRANCH_NAME}:/opt/workdir ${NODE_IMAGE} /bin/bash /opt/workdir/build.sh"
            ]
        },
        {
            name: "docker",
            shell: [
                "docker build -t ${CURRENT_DOCKER_IMAGE_TAG} .",
                "docker push ${CURRENT_DOCKER_IMAGE_TAG}"
            ]
        },
        {
            name: "docker-arm64",
            shell: [
                "docker buildx build -t ${CURRENT_DOCKER_IMAGE_TAG}-arm64 -f Dockerfile-arm64 --platform=linux/arm64 . --load",
                "docker push ${CURRENT_DOCKER_IMAGE_TAG}-arm64"
            ]
        },
        {
            name: "helm",
            shell: [
                "(test ${GIT_BRANCH} = 'master' && kubectl config use-context prod) ||true",
                "(test ${GIT_BRANCH} = 'develop' && kubectl config use-context dev) ||true",
                "cd .helm; rm -f *.tgz; helm package .",
                "cd .helm; curl --data-binary \"@${CHART_NAME}-${CHART_VERSION}.tgz\" ${HELM_REGISTRY}/api/charts",
                "helm repo update geoway;helm upgrade -f ${COMMON_VALUE} ${APP_NAME} geoway/${CHART_NAME} --version ${CHART_VERSION} --install -n ${NAMESPACE}",
                "kubectl rollout restart deployment ${CHART_NAME} -n ${NAMESPACE}"
            ]
        },
        {
            name: "helm-arm64",
            shell: [
                "(test ${GIT_BRANCH} = 'develop' && kubectl config use-context arm64) ||true",
                "(test ${GIT_BRANCH} = 'develop' && helm repo update geoway && helm upgrade -f ${COMMON_VALUE} --set imageName=${CURRENT_DOCKER_IMAGE_TAG}-arm64 ${APP_NAME} geoway/${CHART_NAME} --version ${CHART_VERSION} --install -n ${NAMESPACE}) || true",
                "(test ${GIT_BRANCH} = 'develop' && kubectl rollout restart deployment ${CHART_NAME} -n ${NAMESPACE} ) || true"
            ]
        }


    ]
    let resource=[
        {
            name: "jar",
            source: "target/*encrypted.jar",
            dist: ""
        },
        {
            name: "lic",
            source: "target/*encrypted.lic",
            dist: ""
        },
        {
            name: "yml-config",
            source: "target/classes/config/*.yml",
            dist: "config"
        }
    ]

    // npm project cicd.yaml content
    const content ={
        name: name,
        namespace: ns,
        maintainers: maintainers,
        path: ".",
        env: {
            COMMON_VALUE: "http://gitlab.geoway.com/awesome-drivers/kubernetes/-/raw/develop/common/common.yaml"
        }, 
        stages: [
            {
                name: "mvn",
                shell: [
                    "mvn clean install"
                ]
            },
        ],
        modules: []
    }
    if (modules == null || modules.length == 0){
        content.stages = JSON.parse(JSON.stringify(stage))
        content.stages.splice(0,0,{
            name: "mvn",
            shell: [
                "mvn clean install"
            ]
        })
        content.resources=JSON.parse(JSON.stringify(resource))
    }else{
        modules.forEach(m_name => {
            let stageCopy = JSON.parse(JSON.stringify(stage))
            let resourceCopy = JSON.parse(JSON.stringify(resource))
            let module ={
                name: m_name,
                path: m_name,
                stages: stageCopy,
                resources: resourceCopy
            }
            content.modules.push(module)
        });
    }

   
    return content

}



/**
 * @param {any} obj
 */
function ObjectToYaml(obj){
    return yaml.dump(obj)
}


// let data=npmcicd("cicd-test","rsmis",["lifengqian","chenbobin"])
// fs.writeFile("output.yaml",ObjectToYaml(data),(e)=>{
//     console.log(e)
// })
function generateYaml(name,ns,maintainers,pm,ptype){
    if (ptype === "nodejs"){
        return ObjectToYaml(npmcicd(name,ns,maintainers))
    }
    if (ptype === "maven"){
        return ObjectToYaml(mavencicd(name,ns,maintainers,pm))
    }
    return "only supported maven and nodejs"
}

// read from cicd.yaml and find options
function readEasyBuildOptions(content){
    let cicd=yaml.load(content)
    return {
        jenkins: {
            url: cicd["easybuild"]["jenkins"]["url"]
        },
        job:{
            name: cicd["easybuild"]["job"]["name"],
            branch: ""
        },
        auth:{
            user: cicd["easybuild"]["auth"]["user"],
            // default read from EASYBUILD_TOKEN
            token: cicd["easybuild"]["auth"]["token"]
        }
    }
}


module.exports = {
	generateYaml,
	ObjectToYaml,
    readEasyBuildOptions
}
