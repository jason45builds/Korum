-- Migration 012: Captain UPI + payment confirmation fields

-- Add UPI ID to users table
alter table public.users
  add column if not exists upi_id text,
  add column if not exists upi_name text;

-- Add captain_confirmed field to anon_responses so captain can confirm/reject
alter table public.anon_responses
  add column if not exists captain_confirmed boolean,   -- null=pending, true=confirmed, false=rejected
  add column if not exists confirmed_at timestamptz,
  add column if not exists rejection_note text;

-- Convenience view: slot count per match via poll
create or replace view public.poll_slot_summary as
select
  pl.match_id,
  pl.id          as poll_link_id,
  count(*) filter (where ar.response = 'YES')                                    as total_yes,
  count(*) filter (where ar.response = 'YES' and ar.payment_claimed = true)      as claimed_paid,
  count(*) filter (where ar.response = 'YES' and ar.captain_confirmed = true)    as confirmed,
  count(*) filter (where ar.response = 'YES' and ar.captain_confirmed is null
                        and ar.payment_claimed = true)                            as pending_review,
  count(*) filter (where ar.response = 'MAYBE')                                  as total_maybe,
  count(*) filter (where ar.response = 'NO')                                     as total_no
from public.poll_links pl
left join public.anon_responses ar on ar.poll_link_id = pl.id
where pl.match_id is not null
group by pl.match_id, pl.id;
