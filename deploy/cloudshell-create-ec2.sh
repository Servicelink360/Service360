#!/bin/bash
# Paste ALL of this in AWS CloudShell (already logged into AWS — no access keys)
set -e
REGION=ap-southeast-2
VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query Vpcs[0].VpcId --output text --region $REGION)
SUBNET=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC --query Subnets[0].SubnetId --output text --region $REGION)
SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=service360-api-sg --query SecurityGroups[0].GroupId --output text --region $REGION 2>/dev/null || true)
if [ "$SG" = "None" ] || [ -z "$SG" ]; then
  SG=$(aws ec2 create-security-group --group-name service360-api-sg --description "Service360 API" --vpc-id $VPC --query GroupId --output text --region $REGION)
fi
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 5301 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true
AMI=$(aws ec2 describe-images --owners amazon --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text --region $REGION)
UD=$(printf '#!/bin/bash\ncurl -fsSL https://raw.githubusercontent.com/Servicelink360/Service360/main/deploy/ec2-install.sh | bash\n' | base64 -w 0)
INSTANCE=$(aws ec2 run-instances --image-id "$AMI" --instance-type t3.small --subnet-id "$SUBNET" --security-group-ids "$SG" --user-data "$UD" --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=service360-api}]' --query Instances[0].InstanceId --output text --region $REGION)
echo "Creating $INSTANCE ..."
aws ec2 wait instance-running --instance-ids "$INSTANCE" --region $REGION
IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE" --query Reservations[0].Instances[0].PublicIpAddress --output text --region $REGION)
echo ""
echo "DONE"
echo "Instance: $INSTANCE"
echo "API URL:  http://$IP:5301/"
echo "Wait 10 min for install, then open API URL in browser."
