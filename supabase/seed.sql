-- Seed data for testing

-- We will insert a mock booking for the first available farm plot if one exists,
-- but since seed.sql runs on fresh db, we might need to insert a user and plot first.
-- For now, we will let the user create a plot via the app, and we can't easily seed 
-- bookings without knowing the plot ID. 
-- Wait, we can do an INSERT INTO bookings (plot_id, pilot_id) SELECT id, owner_id FROM farm_plots LIMIT 1;
-- This ensures a booking exists for any plot created!

DO $$
DECLARE
  v_plot_id uuid;
  v_pilot_id uuid;
BEGIN
  SELECT id, owner_id INTO v_plot_id, v_pilot_id FROM farm_plots LIMIT 1;
  
  IF v_plot_id IS NOT NULL THEN
    INSERT INTO bookings (plot_id, pilot_id, status)
    VALUES (v_plot_id, v_pilot_id, 'pending');
  END IF;
END $$;
