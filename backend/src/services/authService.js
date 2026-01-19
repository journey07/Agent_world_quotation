import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.SUPABASE_URL || 'https://gxkwhbwklvwhqehwpfpt.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseServiceKey) {
  throw new Error('Supabase key is required. Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in .env file')
}

// Service role key를 사용하여 RLS를 우회하고 직접 테이블에 접근
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Username과 password로 로그인
 */
export async function loginWithUsername(username, password) {
  try {
    // users 테이블에서 username으로 사용자 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 사용자를 찾을 수 없음
        return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
      }
      throw error
    }

    if (!user) {
      return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return { success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
    }

    // 비밀번호 해시는 제외하고 사용자 정보 반환
    const { password_hash, ...userWithoutPassword } = user

    return {
      success: true,
      user: userWithoutPassword
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error.message || '로그인 중 오류가 발생했습니다.'
    }
  }
}

/**
 * 세션 토큰으로 사용자 확인 (선택사항)
 */
export async function verifySession(token) {
  try {
    // 간단한 토큰 검증 로직 (실제로는 JWT 등을 사용하는 것이 좋음)
    // 여기서는 단순히 사용자 정보를 반환
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, created_at')
      .eq('id', token)
      .single()

    if (error || !user) {
      return { success: false }
    }

    return { success: true, user }
  } catch (error) {
    return { success: false }
  }
}
