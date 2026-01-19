/**
 * 사용자 생성 스크립트
 * 
 * 사용법:
 * node scripts/create-user.js <username> <password>
 * 
 * 예시:
 * node scripts/create-user.js admin mypassword123
 */

import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || 'https://gxkwhbwklvwhqehwpfpt.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createUser(username, password) {
  try {
    // 비밀번호 해싱
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // 사용자 생성
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          username,
          password_hash: passwordHash
        }
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        console.error(`❌ 오류: 사용자명 "${username}"이 이미 존재합니다.`)
      } else {
        console.error('❌ 오류:', error.message)
      }
      process.exit(1)
    }

    console.log('✅ 사용자가 성공적으로 생성되었습니다!')
    console.log('📋 사용자 정보:')
    console.log(`   - ID: ${data.id}`)
    console.log(`   - Username: ${data.username}`)
    console.log(`   - Created: ${data.created_at}`)
  } catch (err) {
    console.error('❌ 예상치 못한 오류:', err)
    process.exit(1)
  }
}

// 명령줄 인자 확인
const username = process.argv[2]
const password = process.argv[3]

if (!username || !password) {
  console.log('사용법: node scripts/create-user.js <username> <password>')
  console.log('예시: node scripts/create-user.js admin mypassword123')
  process.exit(1)
}

createUser(username, password)
