# Supabase MCP Server - Complete Fix Guide

## 🔍 Root Cause Analysis

The error **"context deadline exceeded"** was caused by **two critical issues**:

1. **Wrong Package Name**: The MCP configuration was using `@modelcontextprotocol/server-supabase` (doesn't exist)
2. **Missing Personal Access Token**: The Supabase MCP server requires a Personal Access Token (PAT) from your Supabase account

## ✅ Solutions Applied

### 1. Corrected Package Name
- ❌ **Wrong**: `@modelcontextprotocol/server-supabase`
- ✅ **Correct**: `@supabase/mcp-server-supabase` (v0.5.7)

### 2. Updated Configuration Files
The following files have been updated:
- `.qoder/mcp-settings.json` - Project-level config
- `setup-mcp-supabase.ps1` - Setup automation script
- `C:\Users\khami\AppData\Roaming\Qoder\mcp-settings.json` - User-level config

## 🔐 Required: Get Your Supabase Personal Access Token

The MCP server needs a **Personal Access Token (PAT)** to access your Supabase Management API.

### Steps to Get Your PAT:

1. **Go to Supabase Account Settings**:
   - Visit: https://supabase.com/dashboard/account/tokens
   - Or: Supabase Dashboard → Account → Access Tokens

2. **Create a New Token**:
   - Click **"Generate New Token"**
   - Name: `Qoder MCP Server` (or any name you prefer)
   - Scopes: Select **"All"** or at minimum:
     - `projects.read`
     - `projects.write`
     - `database.read`
     - `database.write`

3. **Copy the Token**:
   - ⚠️ **IMPORTANT**: Copy it immediately - you won't be able to see it again!
   - Format: Starts with `sbp_` (e.g., `sbp_abc123def456...`)

4. **Add to Configuration**:

   **Option A: Manual Update** (Recommended)
   ```bash
   # Edit the file:
   notepad C:\Users\khami\AppData\Roaming\Qoder\mcp-settings.json
   
   # Replace this line:
   "SUPABASE_ACCESS_TOKEN": "your-supabase-personal-access-token-here"
   
   # With your actual token:
   "SUPABASE_ACCESS_TOKEN": "sbp_your_actual_token_here"
   ```

   **Option B: PowerShell Command**
   ```powershell
   # Replace YOUR_TOKEN with your actual token
   $token = "sbp_your_actual_token_here"
   
   # Update the config file
   $configPath = "$env:APPDATA\Qoder\mcp-settings.json"
   $config = Get-Content $configPath | ConvertFrom-Json
   $config.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN = $token
   $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
   ```

## 📋 Current Configuration

Your MCP configuration now includes:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_PROJECT_REF": "qwhunliohlkkahbspfiu",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ...",
        "SUPABASE_URL": "https://qwhunliohlkkahbspfiu.supabase.co",
        "SUPABASE_ACCESS_TOKEN": "your-supabase-personal-access-token-here"
      }
    }
  }
}
```

## 🚀 Next Steps

1. **Get your Supabase Personal Access Token** (see above)
2. **Update the configuration** with your token
3. **Restart Qoder IDE** completely (close all windows and reopen)
4. **Verify the MCP server starts** without errors

## ✅ Verification

After adding your token and restarting, the MCP server should:
- ✅ Start without "context deadline exceeded" error
- ✅ Connect to your Supabase project
- ✅ Show "Supabase MCP: Connected" in Qoder status bar
- ✅ Enable Supabase-specific code assistance

## 🐛 Troubleshooting

### If you still see "context deadline exceeded":
1. Verify your PAT is correct and has proper scopes
2. Check internet connection
3. Ensure the token hasn't expired
4. Check Qoder IDE Output panel for detailed logs

### If you see "401 Unauthorized":
- Your Service Role Key or Access Token is incorrect
- Token may have expired or been revoked

### If you see "404 Not Found":
- Package name is wrong (should be `@supabase/mcp-server-supabase`)
- npm registry might be unreachable

## 📚 Additional Resources

- **Supabase MCP Server**: https://www.npmjs.com/package/@supabase/mcp-server-supabase
- **Supabase Access Tokens**: https://supabase.com/dashboard/account/tokens
- **Qoder MCP Docs**: https://docs.qoder.com/troubleshooting/mcp-common-issue

## 🔒 Security Notes

⚠️ **Important Security Reminders**:
- Keep your Personal Access Token secret
- Never commit it to version control
- It has full access to your Supabase account
- Rotate tokens regularly for security
- Store in IDE settings (not in project files)

---

**Status**: 🟡 Pending - Waiting for Personal Access Token
**Last Updated**: 2025-10-24
