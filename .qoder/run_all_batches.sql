-- Combined execution of all 8 batches for العراف cancelled contracts
-- This will process 392 contracts total

\echo 'Starting migration of 392 cancelled contracts...'
\echo ''

\i c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_01.sql
\echo 'Batch 1/8 complete (50 contracts)'

\i c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_02.sql
\echo 'Batch 2/8 complete (100 contracts)'

\i c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_03.sql
\echo 'Batch 3/8 complete (150 contracts)'

\i c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_04.sql
\echo 'Batch 4/8 complete (200 contracts)'

\i c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_05.sql
\echo 'Batch 5/8 complete (250 contracts)'

\i c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_06.sql
\echo 'Batch 6/8 complete (300 contracts)'

\i c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_07.sql
\echo 'Batch 7/8 complete (350 contracts)'

\i c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_08.sql
\echo 'Batch 8/8 complete (392 contracts)'

\echo ''
\echo '========================================='
\echo 'Migration complete!'
\echo 'All 392 cancelled contracts processed'
\echo '========================================='
