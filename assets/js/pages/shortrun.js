// Page bootstrap for the short-run models.
import { initPage, initSplit } from '../app.js';
import model from '../models/shortrun.js';

initPage({ pageId: 'shortrun', model, examSubject: 'shortrun' });
initSplit();
