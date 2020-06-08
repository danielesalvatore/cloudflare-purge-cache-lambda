const chromium = require('chrome-aws-lambda');

const args = [
  '--remote-debugging-port=9222',
  '--window-size=1280,1696'
];

module.exports.handler = async () => {
  try {
    const executablePath = await chromium.executablePath;
    const options = {
      args: chromium.args.concat(args),
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
      executablePath
    };
    await chromium.puppeteer.launch(options);

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          message: 'Go Serverless v1.0! Your function executed successfully! OK',
        },
        null,
        2
      ),
    };

  } catch (error) {
    console.error('Error launching Chrome: ', error);
    return error;
  }
};