import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkdvuimyxqabfccvqmsp.supabase.co';
const supabaseKey = 'sb_publishable_PwfvydfqTv13iGC-yLLalA_5jjPW8yp';

export const supabase = createClient(supabaseUrl, supabaseKey);
