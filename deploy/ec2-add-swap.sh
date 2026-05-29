#!/bin/bash
# Add 2GB swap on small EC2 (helps admin Docker build). Safe to run once.
set -e
if swapon --show | grep -q /swapfile; then
  echo "Swap already on."
  swapon --show
  exit 0
fi
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "Swap enabled:"
swapon --show
