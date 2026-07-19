-- ============================================================================
-- Gech EV Makina Ekub — Supabase schema
-- Run this in Supabase: SQL Editor -> New query -> paste & Run.
-- (Alternative: `DATABASE_URL=<supabase direct URI> pnpm --filter @workspace/db run push`)
-- ============================================================================

create table if not exists campaigns (
  id            serial primary key,
  title         text not null,
  description   text not null,
  image_url     text,
  vehicle_model text not null,
  vehicle_year  integer not null,
  ticket_price  numeric(10,2) not null,
  total_slots   integer not null,
  sold_slots    integer not null default 0,
  draw_date     timestamp not null,
  status        text not null default 'active'
                  check (status in ('active','completed','cancelled')),
  payment_details jsonb not null,
  created_at    timestamp not null default now()
);

create table if not exists tickets (
  id              serial primary key,
  campaign_id     integer not null,
  ticket_number   text not null unique,
  buyer_name      text not null,
  buyer_phone     text not null,
  quantity        integer not null default 1,
  lucky_numbers   text not null,
  payment_method  text not null check (payment_method in ('telebirr','cbe')),
  sender_account  text not null,
  receipt_image_url text,
  status          text not null default 'pending'
                    check (status in ('pending','active','rejected')),
  total_amount    numeric(10,2) not null,
  created_at      timestamp not null default now()
);

create table if not exists registrations (
  id           serial primary key,
  telegram_id  text not null unique,
  username     text,
  first_name   text,
  phone        text,
  bot_state    jsonb not null default '{}'::jsonb,
  created_at   timestamp not null default now(),
  updated_at   timestamp not null default now()
);

-- Winners table (tickets that won in a draw)
create table if not exists winners (
  id           serial primary key,
  ticket_id    integer not null references tickets(id) unique,
  campaign_id  integer not null references campaigns(id),
  position     integer not null default 1,
  prize        text not null,
  created_at   timestamp not null default now()
);

-- Indexes for common lookups
create index if not exists idx_tickets_phone   on tickets (buyer_phone);
create index if not exists idx_tickets_camp   on tickets (campaign_id);
create index if not exists idx_campaigns_stat on campaigns (status);
create index if not exists idx_winners_ticket  on winners (ticket_id);
create index if not exists idx_winners_camp    on winners (campaign_id);
