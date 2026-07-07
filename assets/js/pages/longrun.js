// longrun.js [LONGRUN]
// Page entry for long-run.html: wires the three long-run model modules
// (Jones 6e, chapters 5, 7 and 8) into the framework page engine.

import { initPage } from '../core.js';
import solow from '../models/solow.js';
import labor from '../models/labor.js';
import inflation from '../models/inflation.js';

initPage({ pageId: 'longrun', models: [solow, labor, inflation] });
