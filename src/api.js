import { isValidURL, getAWSResources, sendMessageToSQS } from './utils.js'

exports.handler = async (event) => {
  const { url } = JSON.parse(event.body);

  try {
    // 1. Input validation
    isValidURL(url);

    const { requestsAcceptedQueueUrl } = getAWSResources()
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

    // 2. Add URL to queue to be processed and proceed async
    await sendMessageToSQS({
      messageAttributes,
      sqsQueueUrl: requestsAcceptedQueueUrl,
      messageBody: "New URL to purge!"
    });

    return {
      statusCode: 200,
      body: `Purge cache request accepted for URL: ${url}`
    }

  } catch (error) {
    return {
      statusCode: 400,
      body: error.message
    }
  }
};