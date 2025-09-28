import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT) || 3044;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
