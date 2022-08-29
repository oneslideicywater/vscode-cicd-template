#! /bin/bash

export app=rsmis-eureka-service
# shellcheck disable=SC2009
PID=$(ps -ef | grep ${app}-${RSMIS_VERSION}-encrypted.jar | grep -v grep | awk '{print $2}')
# shellcheck disable=SC1009
if [ -z "$PID" ]; then
  echo '${app} is not running...'
else
  kill "$PID"
  sleep 3
  PID=$(ps -ef | grep ${app}-${RSMIS_VERSION}-encrypted.jar | grep -v grep | awk '{print $2}')
  if [ -z "$PID" ]; then
    echo "Stopped ${app} successfully."
  else
    # shellcheck disable=SC2016
    echo "Failed to stop the service.consider using [kill -9 ${PID}] to force stop."
  fi
fi