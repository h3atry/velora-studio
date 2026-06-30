/**
 * Preenche e guarda o app Velora Studio no TikTok Developer Portal.
 * Uso: npm run tiktok:portal
 */
import { chromium } from 'playwright';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const APP_URL = 'https://developers.tiktok.com/app/7656905260585437191/pending';
const stateFile = path.join(root, '.tiktok-dev-session', 'storage.json');
const iconPath = path.join(root, 'public/brand/icon-1024.png');
const demoPath = path.join(root, 'scripts/tiktok-demo/tiktok-login-demo.mp4');

const DESCRIPTION =
  'Velora Studio is a desktop app for multistreaming to TikTok and Twitch with scenes, unified chat, and OAuth login.';
const TERMS = 'https://h3atry.github.io/velora-studio/terms.html';
const PRIVACY = 'https://h3atry.github.io/velora-studio/privacy.html';
const WEBSITE = 'https://h3atry.github.io/velora-studio/';
const REDIRECT = 'https://127.0.0.1:17564/callback/tiktok';
const REVIEW =
  'Velora Studio is a Windows desktop multistreaming app. Login Kit opens TikTok OAuth in the system browser; after authorization the app receives the callback at https://127.0.0.1:17564/callback/tiktok, stores the token, and shows the connected TikTok username in settings. Scope user.info.basic is used only to identify the logged-in creator.';

function ensureDemoVideo() {
  if (fs.existsSync(demoPath)) return;
  fs.mkdirSync(path.dirname(demoPath), { recursive: true });
  const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (ffmpeg.status !== 0) throw new Error('ffmpeg ausente');
  spawnSync(
    'ffmpeg',
    [
      '-y', '-loop', '1', '-i', iconPath, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black',
      '-t', '15', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', demoPath,
    ],
    { stdio: 'inherit' }
  );
}

async function setTextarea(page, id, value) {
  await page.evaluate(({ id, value }) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, { id, value });
}

async function waitForForm(page) {
  console.log('>>> Se pedir login, entra na janela Edge que abriu (até 5 min)…');
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText ?? '';
      return t.includes('Basic information') || t.includes('App name') || t.includes('Velora Studio');
    },
    { timeout: 300_000 }
  );
}

async function main() {
  if (!fs.existsSync(iconPath)) throw new Error(`Ícone ausente: ${iconPath}`);
  ensureDemoVideo();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--start-maximized'],
  });

  const context = await browser.newContext(
    fs.existsSync(stateFile) ? { storageState: stateFile } : { viewport: null }
  );
  const page = await context.newPage();
  page.setDefaultTimeout(300_000);

  console.log('A abrir', APP_URL);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitForForm(page);
  await context.storageState({ path: stateFile });

  console.log('A preencher…');

  await setTextarea(page, ':r31:_textArea', DESCRIPTION);
  await page.getByRole('textbox', { name: 'Terms of Service URL' }).fill(TERMS);
  await page.getByRole('textbox', { name: 'Privacy Policy URL' }).fill(PRIVACY);

  await page.evaluate(() => {
    const root = document.getElementById('platform-configuration');
    if (!root) return;
    for (const label of root.querySelectorAll('label.TUXCheckbox-label')) {
      const text = label.textContent?.trim() ?? '';
      const input = label.querySelector('input[type=checkbox]');
      if (!input) continue;
      const want = text === 'Desktop';
      if (input.checked !== want) label.click();
    }
  });

  await page.getByRole('textbox', { name: 'Web/Desktop URL' }).fill(WEBSITE);

  const catBtn = page.locator('#\\:r30\\:_button');
  if (await catBtn.isVisible()) {
    const catText = await catBtn.textContent();
    if (!catText?.includes('Others')) {
      await catBtn.click();
      await page.getByRole('option', { name: 'Others', exact: true }).click();
    }
  }

  const loginKitVisible = await page.locator('a:has-text("Login Kit"), text=Login Kit').first().isVisible().catch(() => false);
  if (!loginKitVisible) {
    await page.getByRole('button', { name: 'Add products' }).first().click();
    await page.getByText('Login Kit', { exact: true }).click();
    await page.getByRole('button', { name: 'Done' }).click().catch(() => page.keyboard.press('Escape'));
  }

  await page.getByRole('button', { name: /Desktop/i }).click().catch(() => {});
  const hasRedirect = await page.locator(`input[value="${REDIRECT}"]`).count();
  if (!hasRedirect) {
    const empty = page.locator('input[id*="input"]').filter({ hasNotText: REDIRECT }).last();
    await page.locator('input[placeholder*="127"], input[id*="input"]').last().fill(REDIRECT).catch(() => {});
    await page.getByRole('button', { name: 'Add a URI' }).click().catch(() => {});
  }

  await page.evaluate(() => document.querySelector('#app-review')?.scrollIntoView());
  await setTextarea(page, ':r38:_textArea', REVIEW);

  await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(iconPath);
  console.log('Ícone OK');
  await page.locator('input[type="file"][accept*="video"]').first().setInputFiles(demoPath);
  console.log('Vídeo OK');

  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(5000);

  const body = await page.evaluate(() => document.body.innerText);
  const errors = body.match(/This form has (\d+) errors/)?.[0];
  if (errors) {
    console.log('⚠ Ainda há erros:', errors);
    await page.screenshot({ path: path.join(root, 'scripts/tiktok-demo/save-result.png'), fullPage: true });
  } else {
    console.log('✓ Guardado — confirma no portal (Draft / sem banner de erros).');
  }

  await context.storageState({ path: stateFile });
  console.log('Revê Credentials → Client secret. Fecha a janela Edge quando quiseres.');
  await page.waitForTimeout(120_000);
  await browser.close();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
