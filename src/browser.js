const chromium = require('chrome-aws-lambda');
import { isAllowedDomain, deleteMessageToSQS, getAWSResources } from './utils'
const cf = require('cloudflare')({
  token: process.env.CLOUDFLARE_ACCESS_TOKEN
});

exports.handler = async (event) => {
  let browser = null;
  let urls = [];

  try {
    // 1. Get URL from SQS event
    const { Records } = event;
    const { messageAttributes } = Records[0];
    const url = messageAttributes.url.stringValue
    const { receiptHandle } = Records[0];

    if (!url) {
      console.error(event)
      throw Error("Impossible to parse URL from SQS event above.")
    }

    // 2. Launch headless Chromium
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    // 3. Open a new browser page and listen to Network requests
    let page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      urls.push(request._url)
      request.continue();
    });

    // 4. Go to URL and wait for page fully loaded.
    // Using Promise.all because is JavaScript Promise race condition
    await Promise.all([
      page.goto(url),
      // https://pptr.dev/#?product=Puppeteer&version=v2.1.1&show=api-pagewaitfornavigationoptions
      page.waitForNavigation({
        waitUntil: 'domcontentloaded'
      })
    ]);

    // 5. Only return allowed URLs 
    urls = urls.filter(isAllowedDomain)

    // 6. Purge URLS cache
    const cloudflareResult = await cf.zones.purgeCache(process.env.CLOUDFLARE_ZONE_ID, {
      files: urls
    })

    // 7. Delete message from SQS as it was successfully processed by cloudflare
    const { requestsAcceptedQueueUrl } = getAWSResources()
    const deleteMessageResult = await deleteMessageToSQS({
      sqsQueueUrl: requestsAcceptedQueueUrl,
      receiptHandle
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        urls,
        cloudflareResult,
        deleteMessageResult
      })
    }

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
};