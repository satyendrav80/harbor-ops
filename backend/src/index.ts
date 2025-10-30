import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import serversRouter from './routes/servers';
import servicesRouter from './routes/services';
import credentialsRouter from './routes/credentials';
import groupsRouter from './routes/groups';
import tagsRouter from './routes/tags';
import releaseNotesRouter from './routes/releaseNotes';
import usersRouter from './routes/users';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/servers', serversRouter);
app.use('/services', servicesRouter);
app.use('/credentials', credentialsRouter);
app.use('/groups', groupsRouter);
app.use('/tags', tagsRouter);
app.use('/release-notes', releaseNotesRouter);
app.use('/', usersRouter);

const port = Number(process.env.PORT) || 3044;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
