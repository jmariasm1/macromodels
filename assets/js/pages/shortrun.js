// shortrun.js [SHORTRUN]
// Page entry for short-run.html. The short run is now ONE integrated model of the
// business cycle (Jones Ch. 9 + 11 + 12): IS + MP + Phillips + Okun.

import { initPage } from '../core.js';
import shortrunModel from '../models/shortrun.js';

initPage({ pageId: 'shortrun', models: [shortrunModel] });
