import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://gxkwhbwklvwhqehwpfpt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateInquiries() {
  try {
    // JSON 파일 읽기
    const dataFile = path.join(__dirname, '../data/inquiries.json');
    const fileContent = await fs.readFile(dataFile, 'utf-8');
    const inquiries = JSON.parse(fileContent);

    console.log(`Found ${inquiries.length} inquiries to migrate`);

    // 각 inquiry를 Supabase 형식으로 변환
    const supabaseRecords = inquiries.map(item => ({
      id: item.id,
      created_at: item.timestamp,
      updated_at: item.updatedAt || null,
      status: item.status || 'inquiry',
      customer_name: item.contactName || item.companyName || null,
      customer_contact: item.contact || null,
      customer_email: item.email || null,
      customer_company: item.companyName || null,
      columns: item.columns || null,
      rows: item.tiers || null,
      material: item.options?.material || null,
      color: item.options?.lockerColor || item.options?.customColor || null,
      handle: item.options?.handle || false,
      control_type: item.options?.dualController ? 'dual' : 'single',
      compartment_config: item.tierConfig?.type || null,
      door_type: item.options?.acrylic ? 'acrylic' : 'standard',
      total_price: item.summary?.subtotal || null,
      discount_rate: null,
      final_price: item.summary?.total || null,
      notes: item.rawNote || null,
      admin_notes: null,
      raw_data: item,
    }));

    // Supabase에 삽입 (배치로)
    let inserted = 0;
    let failed = 0;

    for (const record of supabaseRecords) {
      const { error } = await supabase
        .from('inquiries')
        .insert([record]);

      if (error) {
        console.error(`Failed to insert inquiry ${record.id}:`, error.message);
        failed++;
      } else {
        console.log(`✓ Migrated inquiry ${record.id}`);
        inserted++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Failed: ${failed}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateInquiries();
