#!/bin/bash
set -e
apt-get update -y
apt-get install -y docker.io docker-compose-plugin git
systemctl enable docker
systemctl start docker
rm -rf /opt/app
git clone https://github.com/Servicelink360/Service360.git /opt/app
cd /opt/app
docker compose -f deploy/docker-compose.aws-test.yml up -d --build
echo ""
echo "API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5301/"
