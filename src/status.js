const { getAWSResources, getQueueAttributes } = require("./utils");

const getQueueStatus = async ({ sqsQueueUrl }) => {
    const queueObj = await getQueueAttributes({
        sqsQueueUrl
    });

    console.log(`Got queue attributes for ${sqsQueueUrl} \t✓`);

    return { [sqsQueueUrl]: queueObj };
};

const asyncGetQueueStatus = async param => getQueueStatus({ ...param });

const getQueuesStatus = async ({ queues }) =>
    Promise.all(queues.map(sqsQueueUrl => asyncGetQueueStatus({ sqsQueueUrl })));

module.exports.handler = async (event, context) => {
    const {
        requestsAcceptedQueueUrl
    } = getAWSResources();

    const queues = [
        requestsAcceptedQueueUrl
    ];

    try {
        const result = await getQueuesStatus({ queues });

        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    }
};