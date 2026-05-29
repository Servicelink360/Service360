# Service360 online — 5 steps

## Done already
- Code on GitHub
- Database on RDS (with your data)

## You do these 5 steps

### 1. Launch server
EC2 → Launch instance → **Ubuntu 22.04**, **t3.small**  
Security group: open ports **22** and **5301**

### 2. Connect
EC2 → your instance → **Connect** → **EC2 Instance Connect** → **Connect**

### 3. Paste this (one block)
```bash
curl -fsSL https://raw.githubusercontent.com/Servicelink360/Service360/main/deploy/ec2-install.sh | sudo bash
```
Wait ~10 minutes.

### 4. Copy API address
EC2 → **Public IPv4** → your API is:
```
http://YOUR-IP:5301/
```

### 5. Point admin at API
Amplify → **Environment variables** → set:
```
REACT_APP_ORDER_API_URL=http://YOUR-IP:5301/
```
Redeploy Amplify.

---

**Open admin:** your Amplify URL (e.g. `https://main.xxxxx.amplifyapp.com`)

**RDS:** allow port **5432** from this EC2 security group (RDS → security group → inbound rule).
