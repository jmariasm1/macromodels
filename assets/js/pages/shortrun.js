// shortrun.js [SHORTRUN]
// Page entry for short-run.html. Imports the page engine and the three
// short-run model modules (Ch. 9, 11, 12) and boots the page.

import { initPage } from '../core.js';
import okun from '../models/okun.js';
import iscurve from '../models/iscurve.js';
import mppc from '../models/mppc.js';

initPage({ pageId: 'shortrun', models: [okun, iscurve, mppc] });
