import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_ORIGINS || '').split(',') }));
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes are added here in Step 5 and Step 6

app.use(errorHandler); // must stay last

export default app;