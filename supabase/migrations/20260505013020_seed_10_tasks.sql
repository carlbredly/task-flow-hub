-- Seed 10 sample tasks with varied statuses, priorities and categories

DO $$
DECLARE
  ws_id uuid;
  uid uuid;
  cat_work_id uuid;
  cat_personal_id uuid;
  cat_sport_id uuid;
BEGIN
  -- Get first workspace
  SELECT id INTO ws_id FROM public.workspaces LIMIT 1;
  IF ws_id IS NULL THEN
    RAISE NOTICE 'No workspace found — skipping task seed';
    RETURN;
  END IF;

  -- Get test user
  SELECT id INTO uid FROM auth.users WHERE email = 'test@test.com' LIMIT 1;
  IF uid IS NULL THEN
    SELECT id INTO uid FROM auth.users LIMIT 1;
  END IF;
  IF uid IS NULL THEN
    RAISE NOTICE 'No user found — skipping task seed';
    RETURN;
  END IF;

  -- Ensure profile exists for the user
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (uid, 'test@test.com', 'Test User')
  ON CONFLICT (id) DO NOTHING;

  -- Get category IDs
  SELECT id INTO cat_work_id FROM public.categories WHERE workspace_id = ws_id AND name = 'Work' LIMIT 1;
  SELECT id INTO cat_personal_id FROM public.categories WHERE workspace_id = ws_id AND name = 'Personal' LIMIT 1;
  SELECT id INTO cat_sport_id FROM public.categories WHERE workspace_id = ws_id AND name = 'Sport' LIMIT 1;

  -- If no categories exist, create defaults
  IF cat_work_id IS NULL THEN
    INSERT INTO public.categories (workspace_id, name, color, icon)
    VALUES (ws_id, 'Work', '#6366F1', 'Briefcase')
    RETURNING id INTO cat_work_id;
  END IF;
  IF cat_personal_id IS NULL THEN
    INSERT INTO public.categories (workspace_id, name, color, icon)
    VALUES (ws_id, 'Personal', '#10B981', 'User')
    RETURNING id INTO cat_personal_id;
  END IF;
  IF cat_sport_id IS NULL THEN
    INSERT INTO public.categories (workspace_id, name, color, icon)
    VALUES (ws_id, 'Sport', '#F59E0B', 'Dumbbell')
    RETURNING id INTO cat_sport_id;
  END IF;

  -- Delete existing seed tasks to avoid duplicates
  DELETE FROM public.tasks WHERE workspace_id = ws_id AND title LIKE '[Seed] %';

  -- Insert 10 varied tasks
  INSERT INTO public.tasks (workspace_id, title, description, status, priority, category_id, assigned_to, created_by, due_date, sort_order)
  VALUES
    (ws_id, '[Seed] Finaliser le design de la landing page',
     'Maquette Figma a valider avec le client. Choisir les couleurs et typographies.', 'done', 'high',
     cat_work_id, ARRAY[uid], uid, now() - INTERVAL '3 days', 0),

    (ws_id, '[Seed] Rédiger le rapport mensuel',
     'Inclure les KPI, le budget et les prévisions Q2.', 'in_progress', 'urgent',
     cat_work_id, ARRAY[uid], uid, now() + INTERVAL '1 day', 1),

    (ws_id, '[Seed] Mise en place CI/CD',
     'Configurer GitHub Actions pour deploy automatique sur staging.', 'todo', 'high',
     cat_work_id, ARRAY[uid], uid, now() + INTERVAL '5 days', 2),

    (ws_id, '[Seed] Revue de code PR #142',
     'Verifier les modifications du module authentification.', 'delayed', 'medium',
     cat_work_id, ARRAY[uid], uid, now() - INTERVAL '1 day', 3),

    (ws_id, '[Seed] Acheter les courses de la semaine',
     'Fruits, legumes, pain complet, fromage, cafe.', 'todo', 'low',
     cat_personal_id, ARRAY[uid], uid, now() + INTERVAL '2 days', 4),

    (ws_id, '[Seed] Appeler le dentiste',
     'Prendre rendez-vous pour le detartrage annuel.', 'done', 'low',
     cat_personal_id, ARRAY[uid], uid, now() - INTERVAL '7 days', 5),

    (ws_id, '[Seed] Planifier les vacances d''ete',
     'Rechercher vols + hotels pour la Grece. Budget max 1200 EUR.', 'in_progress', 'medium',
     cat_personal_id, ARRAY[uid], uid, now() + INTERVAL '14 days', 6),

    (ws_id, '[Seed] Entrainement fractionne',
     '10 x 400m a 90% VMA avec 1min30 de recup.', 'todo', 'high',
     cat_sport_id, ARRAY[uid], uid, now() + INTERVAL '1 day', 7),

    (ws_id, '[Seed] Yoga matinal 20 min',
     'Routine souplesse et respiration avant le travail.', 'done', 'medium',
     cat_sport_id, ARRAY[uid], uid, now() - INTERVAL '2 days', 8),

    (ws_id, '[Seed] Reunion sprint planning',
     'Preparer les stories pour le sprint 14. Estimer les tickets.', 'in_progress', 'urgent',
     cat_work_id, ARRAY[uid], uid, now() + INTERVAL '6 hours', 9)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '10 sample tasks seeded for workspace %', ws_id;
END;
$$;
