const chromium = require('chrome-aws-lambda');
const { DOMAIN } = process.env

const isAllowedDomain = url => url.startsWith(`${DOMAIN}`) || url.startsWith(`${DOMAIN}`);

exports.handler = async (event, context, callback) => {
  let result = null;
  let browser = null;
  let urls = [];

  const { url } = event;

  // if (!isAllowedDomain(url)) {
  //   return callback("The provided URL is not relative to FAO website");
  // }

  try {

    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', request => {
      console.log(request)
      urls.push(request._url)
      request.continue();
    });

    await page.goto(url || 'http://www.fao.org/home/en/');

    result = await page.title();

  } catch (error) {
    return callback(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  // Filter only FAO URLs
  urls = urls.filter(isAllowedDomain)

  return callback(null, {
    title: result,
    urls
  }
  );
};