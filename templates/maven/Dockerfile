# FROM: 指定基础镜像
FROM registry.geoway.com/jdk/gdk:1.8-x86

# MAINTAINER: 创建镜像的作者信息
MAINTAINER lvxiaofei <lvxiaofei@geoway.com.cn>

# 工作目录
WORKDIR /var/spool/rsmis/service

COPY target/rsmis-*encrypted.jar ./webapp.jar
COPY target/rsmis-*encrypted.lic ./webapp.lic
COPY target/classes/config/* /var/spool/rsmis/service/config/

# shell形式:
ENTRYPOINT ~/setup_hasp.sh && gava -jar webapp.jar