/**
 * Extract and decode user name from request headers
 * Handles Base64 decoding if the header is encoded
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} Decoded user name or null
 */
export function decodeUserNameFromHeaders(req) {
  const encodedName = req.headers['x-user-name'] || req.headers['X-User-Name'] || null;
  const isEncoded = req.headers['x-user-name-encoded'] || req.headers['X-User-Name-Encoded'] || null;
  
  if (!encodedName) {
    return null;
  }
  
  let userName = encodedName;
  
  // Base64 인코딩된 경우 디코딩
  if (isEncoded === 'base64') {
    try {
      // Base64 문자열이 유효한지 먼저 확인
      if (/^[A-Za-z0-9+/=]+$/.test(encodedName)) {
        const decodedBuffer = Buffer.from(encodedName, 'base64');
        userName = decodedBuffer.toString('utf8');
        // 디코딩 결과가 비어있거나 이상한 경우
        if (!userName || userName.length === 0) {
          console.error('⚠️ Decoded user name is empty');
          return null;
        }
      } else {
        console.error('⚠️ Invalid Base64 string:', encodedName);
        return null;
      }
    } catch (err) {
      console.error('⚠️ Failed to decode user name from Base64:', err);
      return null;
    }
  }
  
  return userName;
}
