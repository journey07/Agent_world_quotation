import express from 'express';
import {
  saveInquiry,
  getAllInquiries,
  updateInquiry,
  deleteInquiry,
} from '../services/inquiryService.js';

const router = express.Router();

/**
 * GET /api/inquiry/list
 * 모든 문의 내역 조회
 */
router.get('/list', async (req, res) => {
  try {
    const inquiries = await getAllInquiries();
    res.json(inquiries);
  } catch (error) {
    console.error('Failed to get inquiries:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET / (프론트엔드 호환성)
 * 모든 문의 내역 조회
 */
router.get('/', async (req, res) => {
  try {
    const inquiries = await getAllInquiries();
    res.json(inquiries);
  } catch (error) {
    console.error('Failed to get inquiries:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/inquiry/save
 * 새 문의 저장
 */
router.post('/save', async (req, res) => {
  try {
    const inquiry = await saveInquiry(req.body);
    res.json(inquiry);
  } catch (error) {
    console.error('Failed to save inquiry:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST / (프론트엔드 호환성)
 * 새 문의 저장
 */
router.post('/', async (req, res) => {
  try {
    const inquiry = await saveInquiry(req.body);
    res.json(inquiry);
  } catch (error) {
    console.error('Failed to save inquiry:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/inquiry/update/:id
 * 문의 수정
 */
router.put('/update/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await updateInquiry(id, req.body);
    res.json({ inquiry: updated });
  } catch (error) {
    console.error('Failed to update inquiry:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /:id (프론트엔드 호환성)
 * 문의 수정
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await updateInquiry(id, req.body);
    res.json({ inquiry: updated });
  } catch (error) {
    console.error('Failed to update inquiry:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * DELETE /api/inquiry/delete/:id
 * 문의 삭제
 */
router.delete('/delete/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await deleteInquiry(id);
    res.json(deleted);
  } catch (error) {
    console.error('Failed to delete inquiry:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * DELETE /:id (프론트엔드 호환성)
 * 문의 삭제
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await deleteInquiry(id);
    res.json(deleted);
  } catch (error) {
    console.error('Failed to delete inquiry:', error);
    res.status(404).json({ error: error.message });
  }
});

export default router;
