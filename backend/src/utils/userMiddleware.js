/**
 * 사용자 정보 추출 미들웨어
 * X-User-Name 헤더에서 사용자명을 추출하여 req.userName에 저장
 * Base64 인코딩된 경우 자동으로 디코딩
 */
export function extractUserMiddleware(req, res, next) {
  // X-User-Name 헤더에서 사용자명 추출 (대소문자 구분 없이)
  const encodedName = req.headers['x-user-name'] || req.headers['X-User-Name'] || null;
  const isEncoded = req.headers['x-user-name-encoded'] || req.headers['X-User-Name-Encoded'] || null;
  
  let userName = encodedName;
  
  // Base64 인코딩된 경우 디코딩
  if (encodedName && isEncoded === 'base64') {
    try {
      // Node.js에서 Base64 디코딩: Buffer 사용
      const decodedBuffer = Buffer.from(encodedName, 'base64');
      userName = decodedBuffer.toString('utf8');
      console.log(`👤 User name decoded from Base64: ${userName}`);
    } catch (err) {
      console.error('⚠️ Failed to decode user name from Base64:', err);
      // 디코딩 실패 시 원본 사용
      userName = encodedName;
    }
  } else if (encodedName) {
    // 인코딩되지 않은 경우 그대로 사용
    userName = encodedName;
  }
  
  req.userName = userName;
  
  if (userName) {
    console.log(`👤 User name extracted from header: ${userName}`);
  }
  
  next();
}
