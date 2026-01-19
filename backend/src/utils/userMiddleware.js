/**
 * 사용자 정보 추출 미들웨어
 * X-User-Name 헤더에서 사용자명을 추출하여 req.userName에 저장
 */
export function extractUserMiddleware(req, res, next) {
  // X-User-Name 헤더에서 사용자명 추출
  const userName = req.headers['x-user-name'] || null;
  
  req.userName = userName;
  
  next();
}
