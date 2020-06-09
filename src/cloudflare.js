'use strict';

module.exports.handler = async event => {

  try {
    // 1. Get URL from SQS event
    const { Records } = event;
    const { messageAttributes } = Records[0];
    const url = messageAttributes.url.stringValue

    if (!url) {
      console.error(event)
      throw Error("Impossible to parse URL from SQS event above.")
    }

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          message: 'Go Serverless v1.0! Your function executed successfully!',
          input: event,
        },
        null,
        2
      ),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: err.message
    };
  }
};
