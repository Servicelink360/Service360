-- Sync Bayside Council site frequencies/address from local (34 rows)
BEGIN;
UPDATE sites SET address_name = '200 Coward St, Mascot NSW 2020' WHERE name = ' Meriton Carpark';
UPDATE site_items si
       SET frequency_times = 1,
           frequency_count = 1,
           frequency_period = 'month',
           frequency_type = 'simple',
           frequency_mode = 'interval'
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = ' Meriton Carpark'
         AND sv.name = 'Car park cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = ' Meriton Carpark'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = ' 321 West Botany Street, Rockdale, New South Wales.' WHERE name = ' Rockdale Park-321 West Botany St';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = ' Rockdale Park-321 West Botany St'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = ' Rockdale Park-321 West Botany St'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = '870 Botany Rd, Mascot NSW 2020' WHERE name = '870 Botany Rd-Mascot';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = '870 Botany Rd-Mascot'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = '870 Botany Rd-Mascot'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = 'West Botany St, Rockdale NSW 2216' WHERE name = 'Ador Avenue Reserve';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Ador Avenue Reserve'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Ador Avenue Reserve'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = 'Arncliffe NSW 2205' WHERE name = 'Arncliffe Park';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Arncliffe Park'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Arncliffe Park'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = 'Sites: Rockdale Park – 321 West Botany St, Ador Avenue Reserve, Arncliffe Park, Gardiner Park, Gujaga Park, Scarborough Park – Barton St, Scarborough Park Central – Production Av, Scarborough Park East – Monterey St, Tonbridge Reserve.' WHERE name = 'Bayside Public Amenities';
UPDATE site_items si
       SET frequency_times = 1,
           frequency_count = 1,
           frequency_period = 'day',
           frequency_type = 'simple',
           frequency_mode = 'interval'
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Bayside Public Amenities'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Bayside Public Amenities'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = 'Wolli Creek Rd, Banksia NSW 2216' WHERE name = 'Gardiner Park';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Gardiner Park'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Gardiner Park'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = '341 W Botany St, Rockdale NSW 2216' WHERE name = 'Gujaga Park';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Gujaga Park'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Gujaga Park'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = '80 High St, Mascot NSW 2020' WHERE name = 'John Curtin memorial reserve';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'John Curtin memorial reserve'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'John Curtin memorial reserve'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = 'King Street &, 124 Sutherland St, Mascot NSW 2020' WHERE name = 'L'' Estrange Park';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'L'' Estrange Park'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'L'' Estrange Park'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = '149 Coward St, Mascot NSW 2020' WHERE name = 'Mascot Memorial Park';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Mascot Memorial Park'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Mascot Memorial Park'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = 'Coward st- O''Riordan St, Mascot NSW 2020' WHERE name = 'Mascot Oval';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Mascot Oval'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Mascot Oval'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = 'Sites: 870 Botany Rd – Mascot, John Curtin Memorial Reserve, L''Estrange Park, Mascot Memorial Park, Mascot Oval.' WHERE name = 'Mascot Public Amenities';
UPDATE site_items si
       SET frequency_times = 1,
           frequency_count = 1,
           frequency_period = 'day',
           frequency_type = 'simple',
           frequency_mode = 'interval'
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Mascot Public Amenities'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = 1,
           frequency_count = 1,
           frequency_period = 'day',
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Mascot Public Amenities'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = '67 Barton St, Monterey NSW 2217' WHERE name = 'Scarborough Park - Barton St ';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Scarborough Park - Barton St '
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Scarborough Park - Barton St '
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = '7 28/26 Phillips Rd, Kogarah NSW 2217' WHERE name = 'Scarborough Park Central - Production Av';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Scarborough Park Central - Production Av'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Scarborough Park Central - Production Av'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = '24FV+FG Monterey, New South Wales' WHERE name = 'Scarborough Park East-Monterey St';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Scarborough Park East-Monterey St'
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Scarborough Park East-Monterey St'
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
UPDATE sites SET address_name = 'Rotary Park, 24 Tonbridge St, Ramsgate NSW 2217' WHERE name = 'Tonbridge Reserve ';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = 'simple',
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Tonbridge Reserve '
         AND sv.name = 'Public Amenities Cleaning';
UPDATE site_items si
       SET frequency_times = NULL,
           frequency_count = NULL,
           frequency_period = NULL,
           frequency_type = NULL,
           frequency_mode = NULL
       FROM sites st, services sv
       WHERE si.site_id = st.id AND si.service_id = sv.id
         AND st.name = 'Tonbridge Reserve '
         AND sv.name = 'Reactive/Adhoc Maintenance Works';
COMMIT;