const chromium = require('chrome-aws-lambda');
import { isAllowedDomain, getAWSResources } from './utils'

const addURLToPurgeQueue = async ({ url }) => {

  const { URLsToPurgeQueueUrl } = getAWSResources()
  const messageAttributes = {
    try: {
      DataType: "String",
      StringValue: "1"
    },
    url: {
      DataType: "String",
      StringValue: url
    }
  };

  await sendMessageToSQS({
    messageAttributes,
    sqsQueueUrl: URLsToPurgeQueueUrl,
    messageBody: "New URL to purge!"
  });
};

const asyncAddURLToPurgeQueue = async param => addURLToPurgeQueue({ ...param });

const addURLsToPurgeQueue = async ({ urls }) =>
  Promise.all(urls.map(url => asyncAddURLToPurgeQueue({ url })));

exports.handler = async (event) => {
  let browser = null;
  let urls = [];

  try {
    // 1. Get URL from SQS event
    const { Records } = event;
    const { messageAttributes } = Records[0];
    const url = messageAttributes.url.stringValue

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

    urls = [urls[0]]

    // 6. Add each URLs to queue to be purged
    await addURLsToPurgeQueue({ urls })

    return {
      statusCode: 200,
      body: JSON.stringify({
        urls
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