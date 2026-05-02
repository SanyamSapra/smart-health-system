# SECURITY CLEANUP GUIDE

## Current Status ✅

All current files have been secured:
- Real secrets replaced with placeholders
- `.gitignore` hardened
- Code structure cleaned

## ⚠️ Important: Git History Still Contains Exposed Secrets

The exposed Gemini API key exists in **git history** (commit `b49fbc8`).

### Why This Matters:
- If your GitHub repo is **PUBLIC**, anyone who cloned or viewed the repo has the key
- If your GitHub repo is **PRIVATE**, only authorized users have access
- The key is still accessible via `git log` and `git show`

---

## STEP 1: Rotate ALL Exposed Keys Immediately

**DO THIS FIRST** before anything else:

### Google Gemini:
1. Go to: https://console.cloud.google.com/
2. Delete the old API key with ID starting with `AIzaSy...`
3. Create a new API key
4. Update `backend/.env` with new key

### MongoDB:
1. Go to MongoDB Atlas: https://account.mongodb.com/
2. Change the database user password
3. Update `MONGO_URI` in `backend/.env`

### SMTP (Brevo):
1. Go to: https://app.brevo.com/account/login
2. Change SMTP password
3. Update `SMTP_USER` and `SMTP_PASS` in `backend/.env`

### Cloudinary:
1. Go to: https://cloudinary.com/console
2. Regenerate API secret
3. Update `CLOUDINARY_API_SECRET` in `backend/.env`

### JWT Secret:
1. Generate new secret: `openssl rand -base64 32`
2. Update `JWT_SECRET` in `backend/.env`

---

## STEP 2: Clean Git History (Choose One Option)

### Option A: Using BFG Repo-Cleaner (Recommended, Simpler)

**Prerequisites:**
```powershell
# Install BFG (one-time setup)
choco install bfg-repo-cleaner
# OR download from: https://rtyley.github.io/bfg-repo-cleaner/
```

**Execute:**
```powershell
cd d:\smart-health-system

# Create file with patterns to remove
@"
AIzaSyBjZlt9pXGFYl7fAvCdIJc7E6K6tO2RG04
AIzaSyD8Wa-VuWMz6WZrFsYQ0nYkqmFLLv1nCfk
GyeuVGGleqt6FC4q
supersecretkey
PJC6HLSvRv8li_P3z-JL2Ug516w
"@ | Out-File secrets.txt

# Mirror clone the repo
git clone --mirror https://github.com/YOUR_USERNAME/smart-health-system.git smart-health-system.git

# Clean secrets from history
bfg --replace-text secrets.txt smart-health-system.git

# Apply and force push
cd smart-health-system.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --mirror https://github.com/YOUR_USERNAME/smart-health-system.git
cd ..
Remove-Item -Recurse -Force smart-health-system.git

# In original repo, fetch clean history
git pull --rebase
```

### Option B: Using git-filter-repo (More Control)

```powershell
# Install
pip install git-filter-repo

cd d:\smart-health-system

# Create replace file
@"
AIzaSyBjZlt9pXGFYl7fAvCdIJc7E6K6tO2RG04==>REMOVED_SECRET
GyeuVGGleqt6FC4q==>REMOVED_SECRET
"@ | Out-File replace.txt

# Run filter
git filter-repo --replace-text replace.txt

# Force push
git push --force-with-lease
```

### Option C: Full History Rewrite (If Secrets Are Recent)

```powershell
# Only safe if secrets were added in last 1-2 commits
git reset --soft HEAD~2  # Go back 2 commits
git reset HEAD .env.example
git commit -m "Removed .env.example with exposed keys"
git push --force-with-lease
```

---

## STEP 3: Verify Cleanup

```powershell
cd d:\smart-health-system

# Check for secret patterns in current files
git grep "AIzaSy" -- "*/.env*" || Write-Host "✅ No Gemini keys found"
git grep "mongodb.*://.*@" -- "*" || Write-Host "✅ No MongoDB credentials found"

# Verify latest commits don't have secrets
git log -p -2 | Select-String "AIzaSy|GyeuVG|PJC6HLS" || Write-Host "✅ Recent commits clean"
```

---

## STEP 4: After History Rewrite

All team members must:

```powershell
# Clone fresh repo
git clone https://github.com/YOUR_USERNAME/smart-health-system.git smart-health-fresh

# If already cloned, hard reset to new clean history
cd existing-clone
git fetch origin
git reset --hard origin/main
```

---

## Summary of Exposed Credentials

| Credential | Type | Status | Action |
|-----------|------|--------|--------|
| Gemini API Key (AIzaSyBj...) | API Key | 🔴 EXPOSED | ✅ Rotated |
| Gemini API Key (AIzaSyD8...) | API Key | 🔴 EXPOSED | ✅ Placeholder |
| MongoDB Password | Password | 🔴 EXPOSED | ⏳ Rotate |
| JWT Secret | Secret | 🔴 EXPOSED | ⏳ Rotate |
| SMTP Password | Password | 🔴 EXPOSED | ⏳ Rotate |
| Cloudinary Secret | Secret | 🔴 EXPOSED | ⏳ Rotate |
| Sender Email | Email | 🟠 EXPOSED | ⏳ Monitor |

---

## Next Steps For Team

1. ✅ Tell all team members about the breach
2. ✅ Rotate all keys (ASAP)
3. ✅ Follow history cleanup steps
4. ✅ Verify cleanup with git commands above
5. ✅ Update local `.env` files with new credentials
6. ✅ Test application thoroughly
7. ✅ Monitor services for suspicious activity

---

## Questions?

For more info on each service:
- Gemini: https://cloud.google.com/docs/authentication/api-keys
- MongoDB: https://docs.mongodb.com/manual/core/security-internal-authentication/
- Brevo SMTP: https://help.brevo.com/hc/en-us/articles/209467485-Set-up-SMTP
- Cloudinary: https://cloudinary.com/documentation/api_security

Good luck! 🔒
