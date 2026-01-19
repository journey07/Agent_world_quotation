/**
 * 비밀번호 해시 생성 스크립트
 * 
 * 사용법:
 * node scripts/generate-password-hash.js <password>
 * 
 * 예시:
 * node scripts/generate-password-hash.js mypassword123
 */

import bcrypt from 'bcryptjs'

const password = process.argv[2]

if (!password) {
  console.log('사용법: node scripts/generate-password-hash.js <password>')
  console.log('예시: node scripts/generate-password-hash.js mypassword123')
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)

console.log('\n✅ 비밀번호 해시 생성 완료!\n')
console.log('원본 비밀번호:', password)
console.log('해시된 비밀번호:', hash)
console.log('\n📋 Supabase에서 사용할 SQL:')
console.log(`INSERT INTO users (username, password_hash) VALUES ('your_username', '${hash}');\n`)
