# Start ElasticMQ container
docker-compose up -d

sleep 1

# Create SQS queues

AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localhost:9324}

QUEUES="URLToPurgeQueue URLToPurgeQueue";
for QUEUE_NAME in $QUEUES
do 
    until aws sqs --endpoint-url ${AWS_ENDPOINT_URL} get-queue-url --queue-name ${QUEUE_NAME}  > /dev/null 2> /dev/null
    do
        echo "Creating queue $QUEUE_NAME"
        aws sqs --endpoint-url ${AWS_ENDPOINT_URL} create-queue \
            --queue-name ${QUEUE_NAME} \
            > /dev/null 2> /dev/null
    done
done

# Exit
trap - INT