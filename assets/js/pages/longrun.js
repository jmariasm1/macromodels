// Page bootstrap for the long-run models.
import { initPage, initSplit } from '../app.js';
import model from '../models/longrun.js';

initPage({ pageId: 'longrun', model, examSubject: 'longrun' });
initSplit();
