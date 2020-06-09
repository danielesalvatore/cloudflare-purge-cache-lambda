
const {
    ALLOWED_DOMAIN,
    IS_OFFLINE,
    PURGE_REQUESTS_ACCEPTED_QUEUE_URL,
    PURGE_REQUESTS_ACCEPTED_QUEUE_NAME,
    URLS_TO_PURGE_QUEUE_URL,
    URLS_TO_PURGE_QUEUE_NAME,
} = process.env
const AWS = require("aws-sdk");

const SQS = new AWS.SQS({ apiVersion: "2012-11-05" });

// ======= General

const _isProductionEnv = () => {
    return !IS_OFFLINE;
};
module.exports.isProductionEnv = _isProductionEnv;

// ======= URL

const _isAllowedDomain = url => {

    let _url = url;
    // Remove protocol before to check
    _url = _url.replace(/http:\/\//g, '');
    _url = _url.replace(/https:\/\//g, '');
    return _url.startsWith(`${ALLOWED_DOMAIN}`)
};
module.exports.isAllowedDomain = _isAllowedDomain

module.exports.isValidURL = url => {

    if (!url) {
        throw new Error(`Your body request does not include the mandatory URL parameter. Please specify a valid URL.`)
    }

    if (!_isAllowedDomain(url)) {
        throw new Error(`URL not valid. Use ${ALLOWED_DOMAIN} instead, using HTTP or HTTPS procol. Received: ${url}`)
    }
}

// ======= AWS

const _getAWSResources = () => {

    if (_isProductionEnv()) {
        return {
            requestsAcceptedQueueUrl: PURGE_REQUESTS_ACCEPTED_QUEUE_URL,
            URLsToPurgeQueueUrl: URLS_TO_PURGE_QUEUE_URL,
        };
    }

    return {
        requestsAcceptedQueueUrl: `http://localhost:9324/queue/${PURGE_REQUESTS_ACCEPTED_QUEUE_NAME}`,
        URLsToPurgeQueueUrl: `http://localhost:9324/queue/${URLS_TO_PURGE_QUEUE_NAME}`,
    };
};
module.exports.getAWSResources = _getAWSResources;

// ======= AWS / SQS

const _sendMessageToSQS = async ({
    messageAttributes,
    messageBody,
    sqsQueueUrl
}) => {
    const sqsParams = {
        DelaySeconds: 10,
        MessageAttributes: messageAttributes,
        MessageBody: messageBody,
        QueueUrl: sqsQueueUrl
    };

    try {
        const result = await SQS.sendMessage(sqsParams).promise();

        return result;
    } catch (err) {
        console.error(err);
        throw new Error(err);
    }
};
module.exports.sendMessageToSQS = _sendMessageToSQS;

const _getQueueAttributes = async ({ sqsQueueUrl }) => {
    const sqsParams = {
        QueueUrl: sqsQueueUrl,
        AttributeNames: ["All"]
    };

    try {
        const result = await SQS.getQueueAttributes(sqsParams).promise();

        return result;
    } catch (err) {
        console.log(err);
        throw new Error(err);
    }
};
module.exports.getQueueAttributes = _getQueueAttributes;