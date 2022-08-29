#! /bin/bash

export app=rsmis-eureka-service

# shellcheck disable=SC2046
cd $(dirname $0)
nohup /usr/bin/gava -jar ${app}-${RSMIS_VERSION}-encrypted.jar > /tmp/${app}.log 2>&1 &

