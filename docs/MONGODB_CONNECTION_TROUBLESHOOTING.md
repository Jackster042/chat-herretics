# MongoDB Connection Troubleshooting Guide

## Issue: DNS Resolution Error with Bun Runtime

### Problem Description
When running the backend with Bun, MongoDB Atlas connections using `mongodb+srv://` protocol fail with:

```
DNSException: querySrv ECONNREFUSED _mongodb._tcp.cluster0.beel0iz.mongodb.net
  syscall: "querySrv",
 hostname: "_mongodb._tcp.cluster0.beel0iz.mongodb.net",
    errno: 11,
     code: "ECONNREFUSED"
```

### Root Cause
Bun's DNS resolver has issues querying SRV records on some Windows systems, preventing `mongodb+srv://` connection strings from resolving to actual MongoDB shard hostnames.

**Note:** This issue does NOT occur with Node.js (MongoDB Compass works fine with SRV strings).

## Solution

Use the **standard MongoDB connection string** format instead of SRV:

### Before (SRV - Fails with Bun):
```
mongodb+srv://<username>:<password>@cluster0.beel0iz.mongodb.net/<database>?retryWrites=true&w=majority
```

### After (Standard - Works with Bun):
```
mongodb://<username>:<password>@ac-li3gqix-shard-00-00.beel0iz.mongodb.net:27017,ac-li3gqix-shard-00-01.beel0iz.mongodb.net:27017,ac-li3gqix-shard-00-02.beel0iz.mongodb.net:27017/<database>?ssl=true&authSource=admin&retryWrites=true&w=majority
```

## Step-by-Step Fix

1. **Get the correct shard hostnames** by querying the SRV record:
   ```bash
   nslookup -type=SRV _mongodb._tcp.<cluster-name>.mongodb.net
   ```

2. **Build the standard connection string**:
   - Protocol: `mongodb://` (not `mongodb+srv://`)
   - Include all shard hostnames separated by commas
   - Specify port `:27017` for each hostname
   - Add required parameters: `?ssl=true&authSource=admin`

3. **Update your `.env` file**:
   ```env
   MONGO_URI=mongodb://username:password@shard1.host:27017,shard2.host:27017,shard3.host:27017/database?ssl=true&authSource=admin&retryWrites=true&w=majority
   ```

## Troubleshooting Other Common Issues

### Issue 2: IP Not Whitelisted
**Error:** `Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted.`

**Fix:**
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add your current IP or "Allow Access from Anywhere" (0.0.0.0/0)

### Issue 3: Firewall Blocking Port 27017
**Error:** `Server selection timed out after X ms` with empty servers map

**Fix:**
- Check Windows Defender Firewall → Allow port 27017 outbound
- Disable VPN temporarily (corporate VPNs often block non-standard ports)
- Try different network (mobile hotspot)

### Issue 4: Incorrect Shard Hostnames
**Error:** `Could not resolve host` or DNS errors

**Fix:**
Always query the actual SRV records to get correct hostnames:
```bash
nslookup -type=SRV _mongodb._tcp.cluster0.beel0iz.mongodb.net
```

Hostnames change format from:
- ❌ Wrong: `cluster0-shard-00-00.beel0iz.mongodb.net`
- ✅ Correct: `ac-li3gqix-shard-00-00.beel0iz.mongodb.net`

## Quick Reference: Connection String Format

```
mongodb://username:password@host1:port1,host2:port2,host3:port3/database?ssl=true&authSource=admin&retryWrites=true&w=majority
```

**Required parameters:**
- `ssl=true` - Enable TLS/SSL
- `authSource=admin` - Authentication database
- `retryWrites=true` - Retry failed writes
- `w=majority` - Write concern

## Testing Connection

### Test 1: DNS Resolution
```bash
nslookup -type=SRV _mongodb._tcp.<cluster>.mongodb.net
```

### Test 2: Port Connectivity
```bash
curl -v telnet://<shard-host>:27017 --connect-timeout 5
```

### Test 3: Compass Verification
Always verify the connection works in MongoDB Compass first - if Compass works but Bun doesn't, it's likely the SRV DNS issue.

## Environment Configuration

**File:** `backend/.env`

```env
NODE_ENV=development
PORT=3000

# Standard format (use this with Bun)
MONGO_URI=mongodb://user:pass@host1:27017,host2:27017,host3:27017/db?ssl=true&authSource=admin&retryWrites=true&w=majority

# Alternative: SRV format (works with Node.js/Compass, may fail with Bun)
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority
```

## When to Use Each Format

| Runtime | SRV Format | Standard Format |
|---------|-----------|-----------------|
| Node.js | ✅ Works | ✅ Works |
| Bun | ❌ DNS Issues | ✅ Works |
| MongoDB Compass | ✅ Works | ✅ Works |
| Mongoose (Node) | ✅ Works | ✅ Works |
| Mongoose (Bun) | ❌ DNS Issues | ✅ Works |

## Related Files

- Connection logic: `backend/src/config/database.ts`
- Environment variables: `backend/.env`
- Example config: `backend/.env.example`

---

**Last Updated:** January 2026  
**Applies to:** Backend running on Bun with MongoDB Atlas
