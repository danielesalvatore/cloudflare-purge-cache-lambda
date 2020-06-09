const chromium = require('chrome-aws-lambda');
const { ALLOWED_DOMAIN } = process.env

const isAllowedDomain = url => {

  // Remove protocol before to check
  url = url.replace(/http:\/\//g, '');
  url = url.replace(/https:\/\//g, '');
  return url.startsWith(`${ALLOWED_DOMAIN}`)
};

const isValidURL = url => {

  if (!url) {
    throw new Error(`Your body request does not include the mandatory URL parameter. Please specify a valid URL.`)
  }

  if (!isAllowedDomain(url)) {
    throw new Error(`URL not valid. Use ${ALLOWED_DOMAIN} instead, using HTTP or HTTPS procol. Received: ${url}`)
  }
}

exports.handler = async (event) => {
  let browser = null;
  let urls = [];
  const { url } = JSON.parse(event.body);

  try {
    isValidURL(url)
  } catch (error) {
    return {
      statusCode: 400,
      body: error.message
    }
  }

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
      urls.push(request._url)
      request.continue();
    });

    // Go to URL and wait for page fully loaded.
    // Javascript promise Race condition
    await Promise.all([
      page.goto(url),
      // https://pptr.dev/#?product=Puppeteer&version=v2.1.1&show=api-pagewaitfornavigationoptions
      page.waitForNavigation({
        waitUntil: 'domcontentloaded'
      })
    ]);

  } catch (error) {
    return {
      statusCode: 500,
      body: error.message
    }
  } finally {
    if (browser !== null) {
      browser.close();
    }
  }

  // Only return allowed URLs 
  urls = urls.filter(isAllowedDomain)


  return {
    statusCode: 200,
    body: JSON.stringify({
      urls
    })
  }

};