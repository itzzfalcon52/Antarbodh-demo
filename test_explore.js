const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  page.on('console', msg => console.log('PAGE:', msg.text()));

  await page.goto('http://localhost:5173/explore', { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait a moment for rendering
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if API is connected
  const apiStatus = await page.evaluate(() => {
    return document.body.innerText.includes('API\nCONNECTED') || document.body.innerText.includes('CONNECTED');
  });
  
  // Check if UPDATING FIELD is gone
  const hasUpdatingOverlay = await page.evaluate(() => {
    return document.body.innerText.includes('UPDATING FIELD...');
  });
  
  console.log('API Status Connected:', apiStatus);
  console.log('Has Updating Overlay:', hasUpdatingOverlay);
  
  await page.screenshot({ path: 'explore_success.png' });
  await browser.close();
})();
