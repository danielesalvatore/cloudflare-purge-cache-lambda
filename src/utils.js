
const { ALLOWED_DOMAIN } = process.env


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
