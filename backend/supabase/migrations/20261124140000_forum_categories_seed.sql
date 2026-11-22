-- EPE LAWA — seed forum categories (owner-requested).
--
-- 20261102200010_forum.sql deliberately shipped zero category rows; that choice
-- stopped the forum from working at all (an empty forum_categories table renders
-- "No forum categories are available" everywhere). The owner has now explicitly
-- named the taxonomy to launch with. This seed is idempotent: re-running it or
-- re-applying to a restored database changes nothing that already exists, and
-- moderators keep full edit/deactivate control afterwards.

insert into public.forum_categories (slug, name, description, rules, sort_order)
values
  ('welcome',
   'Welcome & Announcements',
   'Start here: introduce yourself and read what is new in the EPE LAWA forum.',
   'Be warm to newcomers. No adverts here. Official announcements from the team are posted in this space.',
   10),
  ('general',
   'General Discussion',
   'Everyday talk about life in Epe — anything the other topics do not cover.',
   'Stay respectful. Local language is welcome. Keep one topic per thread.',
   20),
  ('community-matters',
   'Community Matters',
   'Roads, power, water, security, sanitation and other neighbourhood concerns.',
   'Report facts you witnessed. No incitement, no name-calling, no tribal or religious slurs.',
   30),
  ('marketplace',
   'Marketplace & Services',
   'Buying, selling and services around Epe. Arrange payment and delivery in person.',
   'Describe the item or service honestly. EPE LAWA does not process payments; agree terms directly and meet in a safe public place.',
   40),
  ('events',
   'Events & Festivals',
   'Ojude Epe and other festivals, town meetings, weddings, launches and gatherings.',
   'Post the date, venue and time. Share only events you can verify.',
   50),
  ('health',
   'Health & Wellbeing',
   'Clinics, pharmacies, fitness, maternal care and healthy living in Epe.',
   'No medical claims or cure promises. Encourage professional care for emergencies.',
   60),
  ('learning-jobs',
   'Learning & Jobs',
   'Apprenticeships, vacancies, skill trainings and study opportunities around Epe.',
   'No recruitment fees. Name the employer or trainer. Never ask for BVN or bank details.',
   70),
  ('housing',
   'Housing & Property',
   'Renting, land, building and neighbourhood advice for Epe residents.',
   'Verify documents before paying anyone. Report suspicious listings to moderators.',
   80)
on conflict (slug) do nothing;
