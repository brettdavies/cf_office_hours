-- ============================================================================
-- Supabase Seed File - Loads mentees sample data
-- ============================================================================
-- This file loads mentee data directly into the raw_mentees table
-- for ETL processing into the main application schema.
--
-- Note: Raw table schemas are created by migration 20251005130800_raw_tables_schema.sql
-- This file handles both data definition and loading.
--
-- Usage: Run individually as needed: \i supabase/seeds/04_seed_mentees.sql
-- ============================================================================

TRUNCATE TABLE raw_mentees;

-- ============================================================================
-- Mentee Data
-- ============================================================================
INSERT INTO raw_mentees (record_id, email, role, name, title, company, phone, linkedin_url) VALUES
('rec001', 'john.doe@lumina-digital.example', 'mentee', 'John Doe', 'Software Engineer', 'Lumina Digital', '+1-512-555-0101', 'https://linkedin.example/in/john-doe'),
('rec002', 'jane.smith@groundwork.example', 'mentee', 'Jane Smith', 'Product Manager', 'Groundwork', '+1-512-555-0102', 'https://linkedin.example/in/jane-smith'),
('rec003', 'bob.wilson@matrix-innovations.example', 'mentee', 'Bob Wilson', 'Data Scientist', 'Matrix Innovations', '+1-512-555-0103', 'https://linkedin.example/in/bob-wilson'),
('rec004', 'alice.brown@phoenix-networks.example', 'mentee', 'Alice Brown', 'Marketing Manager', 'Phoenix Networks', '+1-512-555-0104', 'https://linkedin.example/in/alice-brown'),
('rec005', 'charlie.davis@cornerstone.example', 'mentee', 'Charlie Davis', 'UX Designer', 'Cornerstone', '+1-512-555-0105', 'https://linkedin.example/in/charlie-davis'),
('rec006', 'diana.evans@redwood.example', 'mentee', 'Diana Evans', 'Business Analyst', 'Redwood', '+1-512-555-0106', 'https://linkedin.example/in/diana-evans'),
('rec007', 'ethan.garcia@catalyst-analytics.example', 'mentee', 'Ethan Garcia', 'Software Developer', 'Catalyst Analytics, Inc.', '+1-512-555-0107', 'https://linkedin.example/in/ethan-garcia'),
('rec008', 'fiona.harris@atlas-finance.example', 'mentee', 'Fiona Harris', 'Project Manager', 'Atlas Finance, Inc.', '+1-512-555-0108', 'https://linkedin.example/in/fiona-harris'),
('rec009', 'george.jackson@blackstone.example', 'mentee', 'George Jackson', 'Financial Analyst', 'Blackstone, Inc.', '+1-512-555-0109', 'https://linkedin.example/in/george-jackson'),
('rec010', 'helen.johnson@platinum.example', 'mentee', 'Helen Johnson', 'Operations Manager', 'Platinum, LLC', '+1-512-555-0110', 'https://linkedin.example/in/helen-johnson'),
('rec011', 'ian.lopez@nexus-labs.example', 'mentee', 'Ian Lopez', 'Content Creator', 'Nexus Labs', '+1-512-555-0111', 'https://linkedin.example/in/ian-lopez'),
('rec012', 'julia.martinez@cipher-vision.example', 'mentee', 'Julia Martinez', 'HR Specialist', 'Cipher Vision, Inc.', '+1-512-555-0112', 'https://linkedin.example/in/julia-martinez'),
('rec013', 'kevin.moore@ember-finance.example', 'mentee', 'Kevin Moore', 'Quality Engineer', 'Ember Finance, Inc.', '+1-512-555-0113', 'https://linkedin.example/in/kevin-moore'),
('rec014', 'laura.nelson@prism-energy.example', 'mentee', 'Laura Nelson', 'Community Manager', 'Prism Energy', '+1-512-555-0114', 'https://linkedin.example/in/laura-nelson'),
('rec015', 'mike.oliver@greenfield.example', 'mentee', 'Mike Oliver', 'Mechanical Engineer', 'Greenfield', '+1-512-555-0115', 'https://linkedin.example/in/mike-oliver'),
('rec016', 'nancy.perez@titan-health.example', 'mentee', 'Nancy Perez', 'Event Coordinator', 'Titan Health, Inc.', '+1-512-555-0116', 'https://linkedin.example/in/nancy-perez'),
('rec017', 'oliver.quinn@echo-wave.example', 'mentee', 'Oliver Quinn', 'DevOps Engineer', 'Echo Wave', '+1-512-555-0117', 'https://linkedin.example/in/oliver-quinn'),
('rec018', 'paula.roberts@steelbridge.example', 'mentee', 'Paula Roberts', 'Social Media Manager', 'Steelbridge', '+1-512-555-0118', 'https://linkedin.example/in/paula-roberts'),
('rec019', 'quentin.smith@zenith-hub.example', 'mentee', 'Quentin Smith', 'Business Development', 'Zenith Hub, Co', '+1-512-555-0119', 'https://linkedin.example/in/quentin-smith'),
('rec020', 'rachel.taylor@phoenix-ai.example', 'mentee', 'Rachel Taylor', 'UI/UX Designer', 'Phoenix AI', '+1-512-555-0120', 'https://linkedin.example/in/rachel-taylor'),
('rec021', 'sam.underwood@axiom-vision.example', 'mentee', 'Sam Underwood', 'Supply Chain Analyst', 'Axiom Vision', '+1-512-555-0121', 'https://linkedin.example/in/sam-underwood'),
('rec022', 'tara.vargas@flux-dynamics.example', 'mentee', 'Tara Vargas', 'Account Manager', 'Flux Dynamics, Inc.', '+1-512-555-0122', 'https://linkedin.example/in/tara-vargas'),
('rec023', 'ulysses.walker@zenith-cloud.example', 'mentee', 'Ulysses Walker', 'Data Engineer', 'Zenith Cloud', '+1-512-555-0123', 'https://linkedin.example/in/ulysses-walker'),
('rec024', 'victoria.xie@vertex-pulse.example', 'mentee', 'Victoria Xie', 'Marketing Coordinator', 'Vertex Pulse', '+1-512-555-0124', 'https://linkedin.example/in/victoria-xie'),
('rec025', 'william.young@apex-data.example', 'mentee', 'William Young', 'Software Tester', 'Apex Data', '+1-512-555-0125', 'https://linkedin.example/in/william-young'),
('rec026', 'xena.zhang@prism-sync.example', 'mentee', 'Xena Zhang', 'Research Scientist', 'Prism Sync', '+1-512-555-0126', 'https://linkedin.example/in/xena-zhang'),
('rec027', 'yuri.becker@horizon-analytics.example', 'mentee', 'Yuri Becker', 'Product Designer', 'Horizon Analytics, Inc.', '+1-512-555-0127', 'https://linkedin.example/in/yuri-becker'),
('rec028', 'zoe.carter@atlas-energy.example', 'mentee', 'Zoe Carter', 'Content Strategist', 'Atlas Energy', '+1-512-555-0128', 'https://linkedin.example/in/zoe-carter'),
('rec029', 'aaron.diaz@nexus-cloud.example', 'mentee', 'Aaron Diaz', 'Systems Administrator', 'Nexus Cloud, Inc', '+1-512-555-0129', 'https://linkedin.example/in/aaron-diaz'),
('rec030', 'brooke.ellis@goldmine.example', 'mentee', 'Brooke Ellis', 'Customer Success', 'Goldmine', '+1-512-555-0130', 'https://linkedin.example/in/brooke-ellis'),
('rec031', 'carter.fisher@matrix-finance.example', 'mentee', 'Carter Fisher', 'Technical Writer', 'Matrix Finance', '+1-512-555-0131', 'https://linkedin.example/in/carter-fisher'),
('rec032', 'diana.garcia@zenon-sync.example', 'mentee', 'Diana Garcia', 'QA Engineer', 'Zenon Sync', '+1-512-555-0132', 'https://linkedin.example/in/diana-garcia'),
('rec033', 'elijah.harris@blueprint.example', 'mentee', 'Elijah Harris', 'Frontend Developer', 'Blueprint, Inc.', '+1-512-555-0133', 'https://linkedin.example/in/elijah-harris'),
('rec034', 'faith.jackson@flux-logic.example', 'mentee', 'Faith Jackson', 'HR Generalist', 'Flux Logic', '+1-512-555-0134', 'https://linkedin.example/in/faith-jackson'),
('rec035', 'gabriel.kim@nexus-pulse.example', 'mentee', 'Gabriel Kim', 'Database Administrator', 'Nexus Pulse', '+1-512-555-0135', 'https://linkedin.example/in/gabriel-kim'),
('rec036', 'hailey.lopez@irongate.example', 'mentee', 'Hailey Lopez', 'Office Manager', 'Irongate', '+1-512-555-0136', 'https://linkedin.example/in/hailey-lopez'),
('rec037', 'isaac.martinez@vortex-robotics.example', 'mentee', 'Isaac Martinez', 'Network Engineer', 'Vortex Robotics', '+1-512-555-0137', 'https://linkedin.example/in/isaac-martinez'),
('rec038', 'jasmine.nelson@whitespace.example', 'mentee', 'Jasmine Nelson', 'Technical Support', 'Whitespace, Inc.', '+1-512-555-0138', 'https://linkedin.example/in/jasmine-nelson'),
('rec039', 'kyle.olson@catalyst-media.example', 'mentee', 'Kyle Olson', 'Medical Assistant', 'Catalyst Media, Inc.', '+1-512-555-0139', 'https://linkedin.example/in/kyle-olson'),
('rec040', 'leah.patel@catalyst-medical.example', 'mentee', 'Leah Patel', 'Physical Therapist', 'Catalyst Medical', '+1-512-555-0140', 'https://linkedin.example/in/leah-patel'),
('rec041', 'mason.quinn@vortex-cloud.example', 'mentee', 'Mason Quinn', 'Construction Manager', 'Vortex Cloud', '+1-512-555-0141', 'https://linkedin.example/in/mason-quinn'),
('rec042', 'nora.rodriguez@synergy-medical.example', 'mentee', 'Nora Rodriguez', 'Biotech Researcher', 'Synergy Medical', '+1-512-555-0142', 'https://linkedin.example/in/nora-rodriguez'),
('rec043', 'owen.santos@echo-innovations.example', 'mentee', 'Owen Santos', 'Cloud Architect', 'Echo Innovations', '+1-512-555-0143', 'https://linkedin.example/in/owen-santos'),
('rec044', 'piper.taylor@apex-dynamics.example', 'mentee', 'Piper Taylor', 'Logistics Coordinator', 'Apex Dynamics', '+1-512-555-0144', 'https://linkedin.example/in/piper-taylor'),
('rec045', 'quincy.underwood@matrix-networks.example', 'mentee', 'Quincy Underwood', 'Security Analyst', 'Matrix Networks', '+1-512-555-0145', 'https://linkedin.example/in/quincy-underwood'),
('rec046', 'riley.vargas@touchstone.example', 'mentee', 'Riley Vargas', 'Systems Analyst', 'Touchstone', '+1-512-555-0146', 'https://linkedin.example/in/riley-vargas'),
('rec047', 'sophia.walker@nexus-health.example', 'mentee', 'Sophia Walker', 'Platform Engineer', 'Nexus Health, Corp.', '+1-512-555-0147', 'https://linkedin.example/in/sophia-walker'),
('rec048', 'tristan.xie@matrix-ai.example', 'mentee', 'Tristan Xie', 'DevOps Engineer', 'Matrix AI', '+1-512-555-0148', 'https://linkedin.example/in/tristan-xie'),
('rec049', 'ursula.young@helix-digital.example', 'mentee', 'Ursula Young', 'Compliance Officer', 'Helix Digital', '+1-512-555-0149', 'https://linkedin.example/in/ursula-young'),
('rec050', 'violet.zhang@prism-dynamics.example', 'mentee', 'Violet Zhang', 'Data Analyst', 'Prism Dynamics', '+1-512-555-0150', 'https://linkedin.example/in/violet-zhang');

-- ============================================================================
-- SQL Logic
-- ============================================================================

-- Log the loaded data
SELECT 'Loaded ' || COUNT(*) || ' mentees' as result FROM raw_mentees;

