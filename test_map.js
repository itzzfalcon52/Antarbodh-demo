const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
    });
    
    page.on('response', response => {
      if (response.url().includes('geojson') || response.url().includes('json')) {
        console.log('RESPONSE:', response.url(), response.status());
      }
    });

    await page.goto('http://localhost:5173/explore', { waitUntil: 'networkidle0', timeout: 30000 });
    
    const debugText = await page.evaluate(() => {
      const debugPanel = document.querySelector('div[style*="lime"]');
      return debugPanel ? debugPanel.innerText : 'Debug panel not found';
    });
    
    console.log('--- DEBUG TEXT ---');
    console.log(debugText);
    console.log('------------------');
    
    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
