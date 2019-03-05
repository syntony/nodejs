import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import typeAhead from './modules/typeAhead';

autocomplete( $('#address'), $('#lng'), $('#lat') );

typeAhead( $('.search') );
