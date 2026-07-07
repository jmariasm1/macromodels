// longrun.js [LONGRUN]
// Page entry for long-run.html: wires the single INTEGRATED long-run model
// (Jones 6e, chapters 5, 7 and 8 merged into one consistent economy) into the
// framework page engine. The tab bar auto-hides for a single-model page.

import { initPage } from '../core.js';
import longrunModel from '../models/longrun.js';

initPage({ pageId: 'longrun', models: [longrunModel] });
