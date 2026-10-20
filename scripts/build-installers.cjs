const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const http = require('http');
const os = require('os');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const npmCli = process.env.npm_execpath
  || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const version = JSON.parse(fs.readFileSync(path.join(rootDir, 'version.json'), 'utf8')).version;
let smokeLicenseToken = null;
let smokeApiOrigin = null;

const apps = {
  tadjir: {
    name: 'TADJIR POS',
    dist: 'dist-tadjir',
    entry: 'electron/main-tadjir.cjs',
    config: 'electron-builder-tadjir.json',
    output: 'tadjir',
    stage: '.build/apps/tadjir',
    executable: 'TADJIR.exe',
    installer: 'TADJIR-Setup.exe',
    title: 'DzPOS Pro',
    expectedText: 'معرّف هذا الجهاز',
  },
  'license-manager': {
    name: 'TADJIR LICENCE MANAGER',
    dist: 'dist-license-manager',
    entry: 'electron/main-license-manager.cjs',
    config: 'electron-builder-license-manager.json',
    output: 'license-manager',
    stage: '.build/apps/license-manager',
    executable: 'TADJIR-Licence-Manager.exe',
    installer: 'TADJIR-Licence-Manager-Setup.exe',
    title: 'TADJIR License Manager',
    expectedText: 'DEVELOPER ACCESS ONLY',
  },
};

function run(command, args, env = {}, cwd = rootDir) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

function removePath(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function clean(target) {
  const selected = target === 'all' || target === 'clean'
    ? Object.values(apps)
    : [apps[target]];
  for (const app of selected) {
    removePath(path.join(rootDir, app.dist));
    removePath(path.join(releaseDir, app.output));
    removePath(path.join(rootDir, app.stage));
  }
  removePath(path.join(rootDir, 'dist'));
  for (const legacyDist of [
    path.join(rootDir, 'dist-electron-lm'),
    path.join(rootDir, 'license-manager', 'dist'),
    path.join(rootDir, 'license-manager', 'dist-electron-lm'),
  ]) {
    removePath(legacyDist);
  }

  for (const legacyPath of [
    path.join(releaseDir, 'win-unpacked'),
    path.join(releaseDir, 'license-manager-unpacked'),
    path.join(rootDir, 'win-unpacked'),
    path.join(releaseDir, 'TADJIR-Setup.exe'),
    path.join(releaseDir, 'TADJIR-Licence-Manager-Setup.exe'),
    path.join(releaseDir, 'TADJIR-License-Manager-Setup.exe'),
    path.join(releaseDir, 'TADJIR-License-Manager-Setup-1.0.0.exe'),
  ]) {
    removePath(legacyPath);
  }

}

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} was not generated: ${filePath}`);
  }
}

function smokeLicensePayload(token) {
  const prefix = 'TADJIR-LIC-';
  if (!token?.startsWith(prefix)) {
    throw new Error('Build smoke test received an invalid license token');
  }
  const encodedBundle = Buffer.from(token.slice(prefix.length), 'base64').toString('utf8');
  return JSON.parse(decodeURIComponent(encodedBundle)).payload;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`Debug endpoint returned HTTP ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.setTimeout(1000, () => request.destroy(new Error('Debug endpoint timed out')));
    request.on('error', reject);
  });
}

async function startSmokeLicenseServer() {
  const port = 37000 + Math.floor(Math.random() * 5000);
  const dataDir = path.join(os.tmpdir(), `tadjir-license-api-test-${process.pid}`);
  removePath(dataDir);
  const child = spawn(process.execPath, [path.join(rootDir, 'server.ts')], {
    cwd: rootDir,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      TADJIR_LICENSE_DATA_DIR: dataDir,
    },
  });

  let exited = false;
  let exitCode = null;
  child.once('exit', (code) => {
    exited = true;
    exitCode = code;
  });

  const apiOrigin = `http://127.0.0.1:${port}`;
  let failure;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (exited) {
      removePath(dataDir);
      throw new Error(`Temporary license API exited during startup (code ${exitCode})`);
    }
    try {
      await requestJson(`${apiOrigin}/api/licenses`);
      return {
        apiOrigin,
        dataDir,
        child,
        async stop() {
          if (!exited) {
            child.kill();
            await Promise.race([
              new Promise((resolve) => child.once('exit', resolve)),
              new Promise((resolve) => setTimeout(resolve, 5000)),
            ]);
          }
          removePath(dataDir);
        },
      };
    } catch (error) {
      failure = error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  if (!exited) child.kill();
  removePath(dataDir);
  throw new Error(`Temporary license API did not start: ${failure?.message || 'timeout'}`);
}

async function postSmokeApi(endpoint, payload) {
  if (!smokeApiOrigin) {
    throw new Error('Temporary license API is not running');
  }
  const response = await fetch(`${smokeApiOrigin}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(`Temporary license API rejected ${endpoint}: HTTP ${response.status}`);
  }
  return result;
}

async function evaluatePage(target, expression = '({ title: document.title, url: location.href, ready: document.readyState, rendered: Boolean(document.querySelector("#root")?.children.length), text: document.body?.innerText?.slice(0, 2000) || "" })') {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not connect to Electron renderer')), { once: true });
  });

  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Renderer evaluation timed out')), 5000);
      socket.addEventListener('message', (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
          return;
        }
        if (message.id !== 1) return;
        clearTimeout(timeout);
        if (message.error || message.result?.exceptionDetails) {
          reject(new Error(message.error?.message || message.result.exceptionDetails.text));
          return;
        }
        resolve(message.result.result.value);
      });
      socket.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression,
          returnByValue: true,
          awaitPromise: true,
        },
      }));
    });
  } finally {
    socket.close();
  }
}

async function smokeLaunch(executablePath, app) {
  const port = 49150 + Math.floor(Math.random() * 1000);
  const profileDir = path.join(os.tmpdir(), `tadjir-${app.output}-profile-${process.pid}`);
  removePath(profileDir);
  console.log(`\n[Smoke test] Launching ${executablePath}`);
  const child = spawn(executablePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-gpu',
  ], {
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, APPDATA: profileDir, LOCALAPPDATA: profileDir },
  });

  let exited = false;
  let exitCode = null;
  child.once('exit', (code) => {
    exited = true;
    exitCode = code;
  });

  let generatedLicenseToken = null;
  try {
    let browserInfo;
    let failure;
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (exited) {
        throw new Error(`${app.name} exited before opening (code ${exitCode})`);
      }
      try {
        browserInfo = await requestJson(`http://127.0.0.1:${port}/json/version`);
        break;
      } catch (error) {
        failure = error;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
    if (!browserInfo) {
      throw new Error(`${app.name} did not start its renderer: ${failure?.message || 'timeout'}`);
    }

    let state;
    let page;
    const renderDeadline = Date.now() + 30000;
    while (Date.now() < renderDeadline) {
      const pages = await requestJson(`http://127.0.0.1:${port}/json/list`);
      page = pages.find((candidate) => candidate.type === 'page' && candidate.webSocketDebuggerUrl);
      if (page) {
        state = await evaluatePage(page);
        if (state.ready === 'complete' && state.rendered
          && state.text.trim() && state.title.includes(app.title)
          && state.text.includes(app.expectedText)) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!state || state.ready !== 'complete' || !state.rendered || !state.text.trim()
      || !state.title.includes(app.title) || !state.text.includes(app.expectedText)) {
      throw new Error(`${app.name} renderer did not load correctly: ${JSON.stringify(state)}`);
    }
    console.log(`[Smoke test] ${app.name} renderer loaded: "${state.title}"`);

    if (app.output === 'license-manager') {
      const filled = await evaluatePage(
        page,
        '(() => { const button = document.querySelector(\'button[title="انقر للتعبئة التلقائية"]\'); if (!button) return false; button.click(); return true; })()',
      );
      if (!filled) {
        throw new Error('Licence Manager developer login autofill control is missing');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const submitted = await evaluatePage(
        page,
        '(() => { const button = document.querySelector(\'form button[type="submit"]\'); if (!button || button.disabled) return false; button.click(); return true; })()',
      );
      if (!submitted) {
        throw new Error('Licence Manager developer login could not be submitted');
      }

      const managerDeadline = Date.now() + 15000;
      while (Date.now() < managerDeadline) {
        state = await evaluatePage(page);
        if (state.text.includes('توليد ترخيص جديد (Signer)')) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (!state.text.includes('توليد ترخيص جديد (Signer)')) {
        const authState = await evaluatePage(
          page,
          '({ authenticated: Boolean(sessionStorage.getItem("tadjir_lm_active_session")), attempts: localStorage.getItem("tadjir_lm_failed_attempts"), passwordLength: document.querySelector(\'input[type="password"]\')?.value.length || 0, loginError: Boolean(document.querySelector(".text-rose-400")) })',
        );
        throw new Error(`Licence Manager administrator session did not open the license generator: ${JSON.stringify(authState)}`);
      }

      const formReady = await evaluatePage(
        page,
        '(() => { const input = document.querySelector("main form input[type=text]"); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(input, "Build Smoke Test"); input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true })); return true; })()',
      );
      if (!formReady) {
        throw new Error('Licence Manager license-generation form is missing its customer field');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const generated = await evaluatePage(
        page,
        '(() => { const form = document.querySelector("main form"); if (!form) return false; form.requestSubmit(); return true; })()',
      );
      if (!generated) {
        throw new Error('Licence Manager license-generation form could not be submitted');
      }
      const generationDeadline = Date.now() + 15000;
      while (Date.now() < generationDeadline) {
        state = await evaluatePage(page);
        if (state.text.includes('تم إصدار وتوقيع الترخيص بنجاح!')) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      const recordStatus = await evaluatePage(
        page,
        '(() => { const records = JSON.parse(localStorage.getItem("tadjir_lm_database_v1") || "[]"); return { count: records.length, signed: Boolean(records[0]?.signature && records[0]?.activationToken), customer: records[0]?.customerName, licenseId: records[0]?.licenseId, token: records[0]?.activationToken }; })()',
      );
      if (!state.text.includes('تم إصدار وتوقيع الترخيص بنجاح!')
        || recordStatus.count !== 1
        || !recordStatus.signed
        || recordStatus.customer !== 'Build Smoke Test') {
        throw new Error(`Licence Manager failed to generate and persist a signed test license: ${JSON.stringify(recordStatus)}`);
      }
      generatedLicenseToken = recordStatus.token;

      const syncDeadline = Date.now() + 10000;
      let centralLicense;
      while (Date.now() < syncDeadline) {
        const centralState = await requestJson(`${smokeApiOrigin}/api/licenses`);
        centralLicense = centralState.licenses?.find((record) => record.licenseId === recordStatus.licenseId);
        if (centralLicense) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!centralLicense || centralLicense.status !== 'active') {
        throw new Error('Licence Manager did not sync the signed test license to the central API');
      }

      await evaluatePage(
        page,
        '(() => { const tab = Array.from(document.querySelectorAll("button")).find((button) => button.innerText.includes("Registry")); if (!tab) return false; tab.click(); return true; })()',
      );
      const registryDeadline = Date.now() + 10000;
      while (Date.now() < registryDeadline) {
        state = await evaluatePage(page);
        if (state.text.includes('Build Smoke Test')) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (!state.text.includes('Build Smoke Test')) {
        throw new Error('Licence Manager registry did not show the generated license');
      }
      console.log('[Smoke test] Licence Manager authenticated, signed a test license, and listed it in the registry.');
    }

    if (app.output === 'tadjir' && smokeLicenseToken) {
      const tokenLiteral = JSON.stringify(smokeLicenseToken);
      const inputReady = await evaluatePage(
        page,
        `(() => { const input = document.querySelector('form input[placeholder^="TADJIR-XXXX"]'); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(input, ${tokenLiteral}); input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`,
      );
      if (!inputReady) {
        throw new Error('TADJIR activation serial-key field is missing');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const submitted = await evaluatePage(
        page,
        '(() => { const button = document.querySelector("form button[type=submit]"); if (!button) return false; button.click(); return true; })()',
      );
      if (!submitted) {
        throw new Error('TADJIR activation form could not be submitted');
      }

      const activationDeadline = Date.now() + 15000;
      let activationState;
      while (Date.now() < activationDeadline) {
        activationState = await evaluatePage(
          page,
          '({ active: Boolean(localStorage.getItem("tadjir_active_license_v1")), activationPrompt: Boolean(document.querySelector(\'form input[placeholder^="TADJIR-XXXX"]\')), text: document.body?.innerText?.slice(0, 2000) || "" })',
        );
        if (activationState.active && !activationState.activationPrompt) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (!activationState.active || activationState.activationPrompt) {
        throw new Error(`TADJIR failed to activate from a Licence Manager signed test certificate: ${JSON.stringify(activationState)}`);
      }

      const tokenPayload = smokeLicensePayload(smokeLicenseToken);
      await postSmokeApi('/api/licenses/status', {
        licenseId: tokenPayload.licenseId,
        status: 'revoked',
        reason: 'Build smoke test',
      });
      await evaluatePage(page, '(() => { window.dispatchEvent(new Event("focus")); return true; })()');
      const revocationDeadline = Date.now() + 15000;
      let revocationState;
      while (Date.now() < revocationDeadline) {
        revocationState = await evaluatePage(
          page,
          '({ stored: Boolean(localStorage.getItem("tadjir_active_license_v1")), activationPrompt: Boolean(document.querySelector(\'form input[placeholder^="TADJIR-XXXX"]\')), revoked: document.body?.innerText?.includes("License Revoked") || document.body?.innerText?.includes("الترخيص ملغى من الإدارة") })',
        );
        if (!revocationState.stored && revocationState.activationPrompt && revocationState.revoked) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (revocationState.stored || !revocationState.activationPrompt || !revocationState.revoked) {
        throw new Error(`TADJIR did not lock after remote revocation: ${JSON.stringify(revocationState)}`);
      }
      console.log('[Smoke test] TADJIR accepted and persisted the signed license, then locked after central revocation.');
    }

    const closeSocket = new WebSocket(browserInfo.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      closeSocket.addEventListener('open', resolve, { once: true });
      closeSocket.addEventListener('error', reject, { once: true });
    });
    closeSocket.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    closeSocket.close();
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    if (!exited) child.kill();
  } catch (error) {
    throw error;
  } finally {
    if (!exited) {
      child.kill();
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    }
    removePath(profileDir);
  }
  return generatedLicenseToken;
}

async function smokeInstall(installerPath, app) {
  const installDir = path.join(os.tmpdir(), `tadjir-${app.output}-install-test-${process.pid}`);
  removePath(installDir);
  try {
    console.log(`\n[Smoke test] Installing ${installerPath} silently to ${installDir}`);
    run(installerPath, ['/S', `/D=${installDir}`]);
    const installedExe = path.join(installDir, app.executable);
    assertExists(installedExe, `Installed ${app.executable}`);
    return await smokeLaunch(installedExe, app);
  } finally {
    removePath(installDir);
  }
}

function securityAudit(app) {
  if (app !== apps.tadjir) return;
  const forbiddenTerms = [
    'Byjtc9rtQIjHkKA5MW2RgfSMy_RhrFAdKshburjCHoM',
    'Admin@Tajir2026!',
    'MASTER_PRIVATE_KEY_JWK',
    'LicenseGenerator',
    'DeveloperLogin',
    'TestVerificationBench',
    'PRE_AUTHENTICATED_LICENSES',
    'LIC-2026-LIFETIME-001',
    'TADJIR-A8F2-9901-BC4D-7E1A',
  ];
  const distDir = path.join(rootDir, app.dist);
  assertExists(path.join(distDir, 'index.html'), `${app.name} frontend`);

  function scan(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const itemPath = path.join(directory, item.name);
      if (item.isDirectory()) {
        scan(itemPath);
      } else if (/\.(?:js|html|css|json)$/i.test(item.name)) {
        const content = fs.readFileSync(itemPath, 'utf8');
        for (const term of forbiddenTerms) {
          if (content.includes(term)) {
            throw new Error(`TADJIR client bundle contains forbidden developer material: ${term}`);
          }
        }
      }
    }
  }
  scan(distDir);
}

function prepareApp(app) {
  const stageDir = path.join(rootDir, app.stage);
  const stageElectronDir = path.join(stageDir, 'electron');
  const stageResourcesDir = path.join(stageDir, 'build-resources');
  removePath(stageDir);
  fs.mkdirSync(stageElectronDir, { recursive: true });
  fs.mkdirSync(stageResourcesDir, { recursive: true });
  fs.cpSync(path.join(rootDir, app.dist), path.join(stageDir, app.dist), { recursive: true });
  fs.copyFileSync(path.join(rootDir, app.entry), path.join(stageElectronDir, path.basename(app.entry)));
  fs.copyFileSync(path.join(rootDir, 'electron', 'preload.cjs'), path.join(stageElectronDir, 'preload.cjs'));
  fs.copyFileSync(path.join(rootDir, 'electron', 'license-api.cjs'), path.join(stageElectronDir, 'license-api.cjs'));
  const iconName = app.output === 'tadjir' ? 'icon-tadjir' : 'icon-license-manager';
  for (const extension of ['ico', 'png']) {
    fs.copyFileSync(
      path.join(rootDir, 'build-resources', `${iconName}.${extension}`),
      path.join(stageResourcesDir, `${iconName}.${extension}`),
    );
  }
  fs.writeFileSync(path.join(stageDir, 'package.json'), `${JSON.stringify({
    name: app.output === 'tadjir' ? 'tadjir-pos' : 'tadjir-licence-manager',
    version,
    private: true,
    main: app.entry,
    description: app.name,
  }, null, 2)}\n`);

  const builderConfig = JSON.parse(fs.readFileSync(path.join(rootDir, app.config), 'utf8'));
  builderConfig.directories.app = '.';
  builderConfig.directories.output = path.join(releaseDir, app.output);
  builderConfig.electronVersion = require('electron/package.json').version;
  const stagedConfig = path.join(stageDir, 'electron-builder.json');
  fs.writeFileSync(stagedConfig, `${JSON.stringify(builderConfig, null, 2)}\n`);
  return stagedConfig;
}

async function buildApp(app) {
  console.log(`\n========== Building ${app.name} v${version} ==========`);
  run(process.execPath, [npmCli, 'run', 'build'], {
    APP_TARGET: app.output === 'tadjir' ? 'tadjir' : 'license-manager',
  });
  securityAudit(app);

  const configPath = prepareApp(app);
  const outputDir = path.join(releaseDir, app.output);
  const unpackedDir = path.join(outputDir, 'win-unpacked');
  const builderArgs = ['exec', '--', 'electron-builder', 'build', '--win', 'dir', '--x64', '--config', configPath];
  run(process.execPath, [npmCli, ...builderArgs], {}, path.dirname(configPath));

  const unpackedExe = path.join(unpackedDir, app.executable);
  assertExists(unpackedExe, `Unpacked ${app.executable}`);
  smokeLicenseToken = await smokeLaunch(unpackedExe, app) || smokeLicenseToken;
  if (app.output === 'tadjir' && smokeLicenseToken) {
    const payload = smokeLicensePayload(smokeLicenseToken);
    await postSmokeApi('/api/licenses/status', {
      licenseId: payload.licenseId,
      status: 'active',
      reason: 'Reset between unpacked and installed smoke tests',
    });
  }

  run(process.execPath, [
    npmCli,
    'exec',
    '--',
    'electron-builder',
    'build',
    '--win',
    'nsis',
    '--x64',
    '--config',
    configPath,
  ], {}, path.dirname(configPath));

  const installerPath = path.join(outputDir, app.installer);
  assertExists(installerPath, `${app.name} installer`);
  smokeLicenseToken = await smokeInstall(installerPath, app) || smokeLicenseToken;
  console.log(`\n✓ ${app.name} build and install checks passed.`);
}

async function main() {
  const target = process.argv[2] || 'all';
  if (target === 'clean') {
    clean(target);
    console.log('Removed known generated application builds and legacy installer outputs.');
    return;
  }
  if (target !== 'all' && !apps[target]) {
    throw new Error(`Unknown build target "${target}". Use "tadjir", "license-manager", "all", or "clean".`);
  }

  clean(target);
  console.log(`Building Windows x64 installers for version ${version}.`);
  const selected = target === 'all'
    ? [apps['license-manager'], apps.tadjir]
    : [apps[target]];
  const previousApiOrigin = process.env.TADJIR_LICENSE_API_URL;
  const smokeServer = await startSmokeLicenseServer();
  smokeApiOrigin = smokeServer.apiOrigin;
  process.env.TADJIR_LICENSE_API_URL = smokeApiOrigin;
  try {
    for (const app of selected) {
      await buildApp(app);
    }
    console.log('\nAll requested application installers were built, installed, and launched successfully.');
  } finally {
    smokeApiOrigin = null;
    if (previousApiOrigin === undefined) {
      delete process.env.TADJIR_LICENSE_API_URL;
    } else {
      process.env.TADJIR_LICENSE_API_URL = previousApiOrigin;
    }
    await smokeServer.stop();
  }
}

main().catch((error) => {
  console.error('\nBUILD FAILED:', error.stack || error.message || error);
  process.exitCode = 1;
});
