const chromium = require('chrome-aws-lambda');
import { isAllowedDomain, deleteMessageToSQS, getAWSResources, publishNotification } from './utils'
const cf = require('cloudflare')({
  token: process.env.CLOUDFLARE_ACCESS_TOKEN
});
const uniq = require("lodash/uniq")

exports.handler = async (event) => {
  let browser = null;
  let urls = [];

  try {
    // 1. Get URL for which we want to clear cache from SQS message
    const { Records } = event;
    const { messageAttributes } = Records[0];
    const url = messageAttributes.url.stringValue
    const { receiptHandle } = Records[0];

    if (!url) {
      console.error(event)
      throw Error("Impossible to parse URL from SQS message above.")
    }

    // 2. Launch headless Chromium
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    // 3. Open one new page as Desktop, another as mobile and track to Network requests
    let page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      urls.push(request._url)
      request.continue();
    });

    let mobile = await browser.newPage();
    //https://developers.whatismybrowser.com/useragents/explore/operating_platform/iphone/8
    await mobile.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 5_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B179 Safari/7534.48.3")
    await mobile.setRequestInterception(true);
    mobile.on('request', request => {
      urls.push(request._url)
      request.continue();
    });

    // 4. Go to URL and wait for page fully loaded.
    // Using Promise.all because is JavaScript Promise race condition
    await Promise.all([
      page.goto(url),
      mobile.goto(url),
      // https://pptr.dev/#?product=Puppeteer&version=v2.1.1&show=api-pagewaitfornavigationoptions
      page.waitForNavigation({
        waitUntil: ['domcontentloaded', 'networkidle0']
      })
    ]);

    // 5. Only return allowed URLs and remove duplicates
    urls = urls.filter(isAllowedDomain)
    urls = uniq(urls)

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

    await publishNotification({
      message: `Error on: FAO.org - Cloudflare clear cache lambda. ${error.message}`
    })

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