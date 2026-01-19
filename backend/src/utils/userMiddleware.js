/**
 * 사용자 정보 추출 미들웨어
 * X-User-Name 헤더에서 사용자명을 추출하여 req.userName에 저장
 * Base64 인코딩된 경우 자동으로 디코딩
 */
export function extractUserMiddleware(req, res, next) {
  // X-User-Name 헤더에서 사용자명 추출 (대소문자 구분 없이)
  const encodedName = req.headers['x-user-name'] || req.headers['X-User-Name'] || null;
  const isEncoded = req.headers['x-user-name-encoded'] || req.headers['X-User-Name-Encoded'] || null;
  
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userMiddleware.js:6',message:'extractUserMiddleware called',data:{encodedName,isEncoded,allHeaders:Object.keys(req.headers).filter(h=>h.toLowerCase().includes('user'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
  // #endregion
  
  console.log(`🔍 Header check - encodedName: ${encodedName}, isEncoded: ${isEncoded}`);
  
  let userName = encodedName;
  
  // Base64 인코딩된 경우 디코딩
  if (encodedName && isEncoded === 'base64') {
    try {
      // Node.js에서 Base64 디코딩: Buffer 사용
      // Base64 문자열이 유효한지 먼저 확인
      if (!/^[A-Za-z0-9+/=]+$/.test(encodedName)) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userMiddleware.js:16',message:'Invalid Base64 string',data:{encodedName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        console.error('⚠️ Invalid Base64 string:', encodedName);
        userName = null;
      } else {
        const decodedBuffer = Buffer.from(encodedName, 'base64');
        userName = decodedBuffer.toString('utf8');
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userMiddleware.js:20',message:'Base64 decoded',data:{encodedName,decoded:userName,length:userName.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        console.log(`👤 User name decoded from Base64: "${encodedName}" -> "${userName}"`);
        
        // 디코딩 결과가 비어있거나 이상한 경우
        if (!userName || userName.length === 0) {
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userMiddleware.js:25',message:'Decoded name is empty',data:{encodedName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          console.error('⚠️ Decoded user name is empty');
          userName = null;
        }
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userMiddleware.js:29',message:'Base64 decode error',data:{error:err.message,encodedName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      console.error('⚠️ Failed to decode user name from Base64:', err);
      console.error(`⚠️ Encoded value: ${encodedName}`);
      console.error(`⚠️ Error details:`, err.message);
      // 디코딩 실패 시 null로 설정
      userName = null;
    }
  } else if (encodedName) {
    // 인코딩되지 않은 경우 그대로 사용
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userMiddleware.js:35',message:'Using name as-is',data:{encodedName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    console.log(`👤 User name used as-is (not encoded): ${encodedName}`);
    userName = encodedName;
  }
  
  req.userName = userName;
  
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userMiddleware.js:38',message:'Final userName set',data:{userName,hasValue:!!userName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
  // #endregion
  
  if (userName) {
    console.log(`✅ Final user name: ${userName}`);
  } else {
    console.log(`⚠️ No user name found in headers. Available headers:`, Object.keys(req.headers).filter(h => h.toLowerCase().includes('user')));
  }
  
  next();
}
