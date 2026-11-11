-- Bayside/Mascot PAC frequency + address sync from local
BEGIN;
UPDATE sites SET address_name = 'Sites: Rockdale Park – 321 West Botany St, Ador Avenue Reserve, Arncliffe Park, Gardiner Park, Gujaga Park, Scarborough Park – Barton St, Scarborough Park Central – Production Av, Scarborough Park East – Monterey St, Tonbridge Reserve.' WHERE name = 'Bayside Public Amenities';
UPDATE sites SET address_name = 'Sites: 870 Botany Rd – Mascot, John Curtin Memorial Reserve, L''Estrange Park, Mascot Memorial Park, Mascot Oval.' WHERE name = 'Mascot Public Amenities';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = ' Rockdale Park-321 West Botany St'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = '870 Botany Rd-Mascot'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Ador Avenue Reserve'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Arncliffe Park'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_type = 'simple',
             frequency_times = 1,
             frequency_count = 1,
             frequency_period = 'day',
             frequency_mode = 'interval'
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Bayside Public Amenities'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Gardiner Park'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Gujaga Park'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'John Curtin memorial reserve'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'L'' Estrange Park'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Mascot Memorial Park'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Mascot Oval'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_type = 'simple',
             frequency_times = 1,
             frequency_count = 1,
             frequency_period = 'day',
             frequency_mode = 'interval'
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Mascot Public Amenities'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Scarborough Park - Barton St '
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Scarborough Park Central - Production Av'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Scarborough Park East-Monterey St'
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
         SET frequency_times = NULL,
             frequency_count = NULL,
             frequency_period = NULL,
             frequency_mode = NULL
         FROM sites st, services sv
         WHERE si.site_id = st.id AND si.service_id = sv.id
           AND st.name = 'Tonbridge Reserve '
           AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_type = 'simple',
           frequency_times = 1,
           frequency_count = 1,
           frequency_period = 'month',
           frequency_mode = 'interval'
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = ' Meriton Carpark'
         AND sv.name = 'Car park cleaning';
COMMIT;

-- verify
SELECT st.name, si.frequency_times, si.frequency_count, si.frequency_period
FROM site_items si
JOIN sites st ON st.id = si.site_id
JOIN services sv ON sv.id = si.service_id
WHERE sv.name = 'Public Amenities Cleaning'
  AND (st.name = ANY(ARRAY['Mascot Public Amenities','Bayside Public Amenities'])
       OR si.frequency_period = 'day')
ORDER BY st.name;