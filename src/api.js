import { isValidURL } from './utils.js'

exports.handler = async (event) => {
  const { url } = JSON.parse(event.body);

  try {
    isValidURL(url);

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