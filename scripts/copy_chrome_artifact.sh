#!/bin/bash
set -e
mv chrome-aws-lambda/chrome_aws_lambda.zip .serverless/chrome_aws_lambda.zip
rm -rf chrome-aws-lambda
echo -e "\033[33mArtifact copied successfully...\033[0m"