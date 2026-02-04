import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://gxkwhbwklvwhqehwpfpt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  throw new Error('Supabase key is required. Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in .env file');
}

// Service role key를 사용하여 RLS를 우회하고 직접 테이블에 접근
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Save a new inquiry to Supabase
 */
export async function saveInquiry(inquiryData) {
    const newInquiry = {
        status: 'inquiry', // 기본 상태: 문의/견적중
        customer_name: inquiryData.contactName || inquiryData.companyName,
        customer_contact: inquiryData.contact,
        customer_email: inquiryData.email,
        customer_company: inquiryData.companyName,
        product: inquiryData.product,
        columns: inquiryData.columns,
        rows: inquiryData.tiers,
        material: inquiryData.options?.material,
        color: inquiryData.options?.lockerColor || inquiryData.options?.customColor,
        handle: inquiryData.options?.handle || false,
        control_type: inquiryData.options?.dualController ? 'dual' : 'single',
        compartment_config: inquiryData.tierConfig?.type,
        door_type: inquiryData.options?.acrylic ? 'acrylic' : 'standard',
        total_price: inquiryData.summary?.subtotal,
        final_price: inquiryData.summary?.total,
        notes: inquiryData.rawNote,
        raw_data: inquiryData,
    };

    const { data, error } = await supabase
        .from('inquiries')
        .insert([newInquiry])
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to save inquiry: ${error.message}`);
    }

    // 기존 형식으로 반환 (호환성)
    return {
        id: data.id,
        timestamp: data.created_at,
        status: data.status,
        ...inquiryData
    };
}

/**
 * Get all inquiries from Supabase
 */
export async function getAllInquiries() {
    const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to get inquiries: ${error.message}`);
    }

    // 기존 형식으로 변환 (호환성)
    return data.map(item => ({
        id: item.id,
        timestamp: item.created_at,
        status: item.status,
        columns: item.columns,
        tiers: item.rows,
        quantity: item.raw_data?.quantity || 1,
        controlPanelColumn: item.raw_data?.controlPanelColumn,
        controlPanelTiers: item.raw_data?.controlPanelTiers,
        tierConfig: item.raw_data?.tierConfig,
        options: {
            dualController: item.control_type === 'dual',
            acrylic: item.door_type === 'acrylic',
            perforation: item.raw_data?.options?.perforation,
            frameType: item.raw_data?.options?.frameType,
            lockerColor: item.color,
            customColor: item.raw_data?.options?.customColor,
            handle: item.handle,
        },
        region: item.raw_data?.region,
        installationBackground: item.raw_data?.installationBackground,
        companyName: item.customer_company,
        product: item.product,
        contact: item.customer_contact,
        email: item.customer_email,
        detailedLocation: item.raw_data?.detailedLocation,
        contactName: item.customer_name,
        industry: item.raw_data?.industry,
        installationDate: item.raw_data?.installationDate,
        budget: item.raw_data?.budget,
        total_lockers: item.raw_data?.total_lockers,
        rawNote: item.notes,
        summary: {
            subtotal: item.total_price,
            quantity: item.raw_data?.quantity || 1,
            total: item.final_price,
        },
        createdBy: item.raw_data?.createdBy,
        updatedAt: item.updated_at,
    }));
}

/**
 * Update an existing inquiry by ID
 */
export async function updateInquiry(id, updateData) {
    const updatePayload = {
        updated_at: new Date().toISOString(),
    };

    // 필드별 매핑
    if (updateData.status) updatePayload.status = updateData.status;
    if (updateData.contactName) updatePayload.customer_name = updateData.contactName;
    if (updateData.contact) updatePayload.customer_contact = updateData.contact;
    if (updateData.email) updatePayload.customer_email = updateData.email;
    if (updateData.companyName) updatePayload.customer_company = updateData.companyName;
    if (updateData.product !== undefined) updatePayload.product = updateData.product;
    if (updateData.columns) updatePayload.columns = updateData.columns;
    if (updateData.tiers) updatePayload.rows = updateData.tiers;
    if (updateData.options?.lockerColor) updatePayload.color = updateData.options.lockerColor;
    if (updateData.options?.handle !== undefined) updatePayload.handle = updateData.options.handle;
    if (updateData.rawNote) updatePayload.notes = updateData.rawNote;
    if (updateData.summary?.subtotal) updatePayload.total_price = updateData.summary.subtotal;
    if (updateData.summary?.total) updatePayload.final_price = updateData.summary.total;

    // raw_data 필드 전체 업데이트
    const { data: existing, error: fetchError } = await supabase
        .from('inquiries')
        .select('raw_data')
        .eq('id', id)
        .single();

    if (fetchError) {
        throw new Error(`Inquiry not found: ${fetchError.message}`);
    }

    updatePayload.raw_data = {
        ...existing.raw_data,
        ...updateData,
    };

    const { data, error } = await supabase
        .from('inquiries')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update inquiry: ${error.message}`);
    }

    // 기존 형식으로 반환 (getAllInquiries와 동일한 형식)
    return {
        id: data.id,
        timestamp: data.created_at,
        status: data.status,
        columns: data.columns,
        tiers: data.rows,
        quantity: data.raw_data?.quantity || 1,
        controlPanelColumn: data.raw_data?.controlPanelColumn,
        controlPanelTiers: data.raw_data?.controlPanelTiers,
        tierConfig: data.raw_data?.tierConfig,
        options: {
            dualController: data.control_type === 'dual',
            acrylic: data.door_type === 'acrylic',
            perforation: data.raw_data?.options?.perforation,
            frameType: data.raw_data?.options?.frameType,
            lockerColor: data.color,
            customColor: data.raw_data?.options?.customColor,
            handle: data.handle,
        },
        region: data.raw_data?.region,
        installationBackground: data.raw_data?.installationBackground,
        companyName: data.customer_company,
        product: data.product,
        contact: data.customer_contact,
        email: data.customer_email,
        detailedLocation: data.raw_data?.detailedLocation,
        contactName: data.customer_name,
        industry: data.raw_data?.industry,
        installationDate: data.raw_data?.installationDate,
        budget: data.raw_data?.budget,
        total_lockers: data.raw_data?.total_lockers,
        rawNote: data.notes,
        summary: {
            subtotal: data.total_price,
            quantity: data.raw_data?.quantity || 1,
            total: data.final_price,
        },
        createdBy: data.raw_data?.createdBy,
        updatedAt: data.updated_at,
    };
}

/**
 * Delete an inquiry by ID
 */
export async function deleteInquiry(id) {
    const { data, error } = await supabase
        .from('inquiries')
        .delete()
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to delete inquiry: ${error.message}`);
    }

    return {
        id: data.id,
        timestamp: data.created_at,
        ...data.raw_data,
    };
}
