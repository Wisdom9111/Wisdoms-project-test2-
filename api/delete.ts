import { del } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ error: 'Server configuration error: Token missing' });
    }
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    await del(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return res.status(200).json({ message: 'Blob deleted successfully' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: error.message || 'Error deleting blob' });
  }
}
