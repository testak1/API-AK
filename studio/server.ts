import express from 'express';
const router = express.Router();
router.get('/brands', (req, res) => res.json({ data: [] }));
export default router;