# BAAPMSG Deployment Guide (AWS/Linux)

The BAAPMSG backend uses `whatsapp-web.js`, which relies on **Puppeteer (Chromium)**. Linux servers (like AWS Ubuntu) often lack the necessary graphical libraries to run Chromium in headless mode.

## 1. Fix missing libraries (Error 127)

If you see an error like `libatk-1.0.so.0: cannot open shared object file`, you need to install the missing dependencies.

### Automatic Fix (Recommended)
We have provided a script to install everything at once. Run these commands on your AWS instance:

```bash
# Make the script executable
chmod +x setup_linux.sh

# Run the script
./setup_linux.sh
```

### Manual Fix
If you prefer running commands manually:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

## 2. PostgreSQL Configuration

Ensure your AWS instance can reach your PostgreSQL database.
1. Update `.env` with your DB details.
2. If using a local DB on AWS, ensure PostgreSQL is installed: `sudo apt install postgresql`.

## 3. Running with PM2 (Production)

For production, use PM2 to keep the server running even after crashes:

```bash
# Install PM2
npm install pm2 -g

# Start the server
pm2 start src/index.js --name baap-msg

# View logs
pm2 logs baap-msg
```

## 4. WhatsApp Sessions

The session data is stored in the `./sessions` folder. Ensure the application has write permissions to this folder:
```bash
mkdir -p sessions
chmod 777 sessions
```
