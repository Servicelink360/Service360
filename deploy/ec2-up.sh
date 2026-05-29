#!/bin/bash
# On EC2: start/update API + admin (open port 80 and 5301 in security group).
set -e
cd /opt/app
git pull
sudo docker compose -f deploy/docker-compose.aws-test.yml up -d --build
echo ""
echo "Admin:  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo YOUR-EC2-IP)/"
echo "API:    http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo YOUR-EC2-IP):5301/"
