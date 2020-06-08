#!/bin/bash
set -e
rm -rf chrome-aws-lambda
git clone --depth=1 https://github.com/alixaxel/chrome-aws-lambda.git
cd chrome-aws-lambda
make chrome_aws_lambda.zip
ls -lah chrome_aws_lambda.zip
echo -e "\033[33mLayer created successfully...\033[0m"