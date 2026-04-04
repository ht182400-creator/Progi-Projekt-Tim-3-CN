/**
 * 1) npm run build (app/client)
 * 2) 启动 cloudflared quick tunnel → 解析 https://*.trycloudflare.com
 * 3) 设置 FRONTEND_URL / NODE_ENV=production 后启动 app/server
 *
 * 需已安装 cloudflared：https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
 * 若未安装 cloudflared，可先手动运行 ngrok：ngrok http 8080，再设置 FRONTEND_URL 后执行 npm run start:prod
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const serverDir = path.join(root, 'app/server');
const clientDir = path.join(root, 'app/client');
const clientDist = path.join(clientDir, 'dist', 'index.html');

function runBuild() {
    console.log('[tunnel] Building client (vite build)...');
    execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });
    if (!fs.existsSync(clientDist)) {
        throw new Error(`Build output missing: ${clientDist}`);
    }
}

function tryNgrokPublicUrl() {
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
            let data = '';
            res.on('data', (c) => {
                data += c;
            });
            res.on('end', () => {
                try {
                    const j = JSON.parse(data);
                    const t = j.tunnels || [];
                    const https = t.find((x) => x.proto === 'https');
                    const url = https?.public_url || t[0]?.public_url;
                    resolve(url || null);
                } catch {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(null);
        });
    });
}

function startServerWithEnv(frontendUrl) {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = frontendUrl;
    process.chdir(serverDir);
    require(path.join(serverDir, 'server.js'));
}

function spawnCloudflaredAndParseUrl(port) {
    return new Promise((resolve, reject) => {
        const cloudflared = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let buf = '';
        let done = false;
        const re = /https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/;
        const timer = setTimeout(() => {
            if (!done) {
                done = true;
                cloudflared.kill('SIGTERM');
                reject(new Error('Timeout waiting for *.trycloudflare.com URL from cloudflared.'));
            }
        }, 60000);

        const tryResolve = () => {
            const m = buf.match(re);
            if (m && !done) {
                done = true;
                clearTimeout(timer);
                resolve({ url: m[0], child: cloudflared });
            }
        };

        const onData = (chunk) => {
            buf += chunk.toString();
            tryResolve();
        };
        cloudflared.stdout.on('data', onData);
        cloudflared.stderr.on('data', onData);

        cloudflared.on('error', (err) => {
            if (!done) {
                done = true;
                clearTimeout(timer);
                reject(err);
            }
        });
        cloudflared.on('close', (code) => {
            if (!done && code !== 0) {
                done = true;
                clearTimeout(timer);
                reject(new Error(`cloudflared exited with code ${code}. Is it installed?`));
            }
        });
    });
}

async function main() {
    runBuild();

    const port = process.env.PORT || '8080';
    process.env.PORT = port;

    let frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
        console.log('[tunnel] Starting cloudflared (quick tunnel)...');
        try {
            const { url, child } = await spawnCloudflaredAndParseUrl(port);
            frontendUrl = url;
            console.log('[tunnel] Public URL:', frontendUrl);
            child.stderr?.on('data', (d) => process.stderr.write(d));
            child.stdout?.on('data', (d) => process.stderr.write(d));
            const stop = () => {
                try {
                    child.kill('SIGTERM');
                } catch {
                    /* ignore */
                }
            };
            process.on('SIGINT', () => {
                stop();
                process.exit(0);
            });
            process.on('SIGTERM', stop);
        } catch (e) {
            console.warn('[tunnel] cloudflared failed:', e.message);
            console.log('[tunnel] Polling ngrok API (127.0.0.1:4040) — start in another window: ngrok http ' + port);
            await new Promise((r) => setTimeout(r, 2000));
            const fromNgrok = await tryNgrokPublicUrl();
            if (fromNgrok) {
                frontendUrl = fromNgrok;
                console.log('[tunnel] Using ngrok URL:', frontendUrl);
            }
        }
    }

    if (!frontendUrl) {
        console.error(
            [
                '[tunnel] Could not determine public URL.',
                'Option A: Install cloudflared and re-run: npm run tunnel',
                'Option B: Run: ngrok http ' + port,
                '        Then: set FRONTEND_URL to the https URL and run: npm run start:prod',
                'See docs/DEPLOY-TUNNEL.md',
            ].join('\n')
        );
        process.exit(1);
    }

    console.log('[tunnel] FRONTEND_URL=' + frontendUrl);
    console.log('[tunnel] Starting API + SPA on port ' + port + ' ...');
    startServerWithEnv(frontendUrl);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
