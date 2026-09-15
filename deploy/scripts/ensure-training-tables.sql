CREATE TABLE IF NOT EXISTS public.training_modules (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  duration_mins INTEGER NOT NULL DEFAULT 30,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  source_file VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_topics (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_topics_module
  ON public.training_topics(module_id, sort_order);

CREATE TABLE IF NOT EXISTS public.training_questions (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_key VARCHAR(20) NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_questions_module
  ON public.training_questions(module_id, sort_order);

CREATE TABLE IF NOT EXISTS public.training_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  module_id INTEGER NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL DEFAULT 'not_started',
  completed_topic_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz_attempts INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NULL,
  best_total INTEGER NULL,
  started_at TIMESTAMPTZ NULL,
  topics_completed_at TIMESTAMPTZ NULL,
  passed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_training_progress_user
  ON public.training_progress(user_id);

CREATE TABLE IF NOT EXISTS public.training_quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  module_id INTEGER NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_attempts_user_module
  ON public.training_quiz_attempts(user_id, module_id, created_at DESC);
