-- Measurement types and measurements (spec §§10–11). Forward migration.
-- Measurement mutations and their timeline events are kept atomic by
-- RPC-only functions owned by a non-login, non-BYPASSRLS writer role. Direct
-- authenticated table DML is revoked, while RLS still applies inside RPCs.

-- Used by the allowed_units table check. This helper is immutable, reads no
-- data and only validates the supplied array.
create function public.measurement_units_valid(p_units text[]) returns boolean
language sql immutable parallel safe set search_path='' as $$
  select p_units is not null
    and cardinality(p_units) <= 20
    and not exists(
      select 1
      from unnest(p_units) as u(unit)
      where unit is null
        or unit <> btrim(unit)
        or char_length(unit) not between 1 and 50
    );
$$;

create table public.measurement_types (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  category text not null check (char_length(btrim(category)) between 1 and 100),
  description text check (description is null or char_length(description) <= 5000),
  value_type text not null check (value_type in ('number', 'text', 'boolean', 'compound', 'image')),
  unit text check (unit is null or (unit = btrim(unit) and char_length(unit) between 1 and 50)),
  allowed_units text[] not null default '{}'::text[] check (public.measurement_units_valid(allowed_units)),
  status text not null default 'active' check (status in ('active', 'archived')),
  is_preset boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, family_id)
);
create unique index measurement_types_active_name_unit_uidx on public.measurement_types(family_id, lower(btrim(name)), coalesce(unit, '')) where status='active';
create index measurement_types_family_name_idx on public.measurement_types(family_id, name, id);

-- The three-column key lets measurement->episode ownership include person_id,
-- preventing a same-family measurement from linking to another person.
alter table public.episodes
  add constraint episodes_id_family_person_key unique(id, family_id, person_id);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  person_id uuid not null,
  measurement_type_id uuid not null,
  episode_id uuid,
  occurred_at timestamptz not null,
  numeric_value numeric check (numeric_value is null or numeric_value::text not in ('NaN', 'Infinity', '-Infinity')),
  text_value text check (text_value is null or char_length(text_value) between 1 and 2000),
  boolean_value boolean,
  compound_value jsonb check (
    compound_value is null or (
      jsonb_typeof(compound_value) = 'object'
      and compound_value ? 'systolic'
      and compound_value ? 'diastolic'
      and compound_value - 'systolic' - 'diastolic' = '{}'::jsonb
      and jsonb_typeof(compound_value->'systolic') = 'number'
      and jsonb_typeof(compound_value->'diastolic') = 'number'
      and (compound_value->>'systolic')::numeric between 1 and 1000
      and (compound_value->>'diastolic')::numeric between 1 and 1000
      and (compound_value->>'systolic')::numeric::text not in ('NaN', 'Infinity', '-Infinity')
      and (compound_value->>'diastolic')::numeric::text not in ('NaN', 'Infinity', '-Infinity')
    )
  ),
  unit text check (unit is null or (unit = btrim(unit) and char_length(unit) between 1 and 50)),
  comment text check (comment is null or char_length(comment) <= 1000),
  source text not null default 'manual' check (source in ('manual', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, family_id),
  check (num_nonnulls(numeric_value, text_value, boolean_value, compound_value) = 1),
  foreign key (person_id, family_id) references public.people(id, family_id) on delete cascade,
  foreign key (measurement_type_id, family_id) references public.measurement_types(id, family_id) on delete restrict,
  foreign key (episode_id, family_id, person_id) references public.episodes(id, family_id, person_id) on delete set null (episode_id)
);
create index measurements_person_occurred_idx on public.measurements(person_id, family_id, occurred_at desc, id);
create index measurements_type_idx on public.measurements(measurement_type_id, family_id);
create index measurements_episode_idx on public.measurements(episode_id, family_id);

alter table public.measurement_types enable row level security;
alter table public.measurement_types force row level security;
alter table public.measurements enable row level security;
alter table public.measurements force row level security;

create policy measurement_types_read on public.measurement_types for select
  using (exists(select 1 from public.family_accounts fa where fa.family_id=measurement_types.family_id and fa.account_id=auth.uid()));
create policy measurement_types_insert on public.measurement_types for insert
  with check (
    not measurement_types.is_preset
    and exists(select 1 from public.family_accounts fa where fa.family_id=measurement_types.family_id and fa.account_id=auth.uid())
  );
create policy measurement_types_update on public.measurement_types for update
  using (
    not measurement_types.is_preset
    and exists(select 1 from public.family_accounts fa where fa.family_id=measurement_types.family_id and fa.account_id=auth.uid())
  )
  with check (
    not measurement_types.is_preset
    and exists(select 1 from public.family_accounts fa where fa.family_id=measurement_types.family_id and fa.account_id=auth.uid())
  );
-- No delete policy: custom types are archived, and presets remain immutable.
create policy measurements_read on public.measurements for select
  using (exists(select 1 from public.family_accounts fa where fa.family_id=measurements.family_id and fa.account_id=auth.uid()));
create policy measurements_insert on public.measurements for insert
  with check (exists(select 1 from public.family_accounts fa where fa.family_id=measurements.family_id and fa.account_id=auth.uid()));
create policy measurements_update on public.measurements for update
  using (exists(select 1 from public.family_accounts fa where fa.family_id=measurements.family_id and fa.account_id=auth.uid()))
  with check (exists(select 1 from public.family_accounts fa where fa.family_id=measurements.family_id and fa.account_id=auth.uid()));
create policy measurements_delete on public.measurements for delete
  using (exists(select 1 from public.family_accounts fa where fa.family_id=measurements.family_id and fa.account_id=auth.uid()));

alter table public.medical_events add column subject_id uuid;
create unique index medical_events_subject_uidx on public.medical_events(family_id, type, subject_id) where subject_id is not null;

-- A used type cannot change its value shape: existing rows must always remain
-- compatible with the type that describes them. Other custom-type fields stay
-- editable, and unused custom types may still change value_type.
create function public.protect_used_measurement_type_value_type() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.value_type is distinct from old.value_type
    and exists(
      select 1 from public.measurements m
      where m.family_id=old.family_id and m.measurement_type_id=old.id
    ) then
    raise exception 'measurement type is in use' using errcode='P1001';
  end if;
  return new;
end $$;
create trigger protect_used_measurement_type_value_type
before update of value_type on public.measurement_types
for each row execute function public.protect_used_measurement_type_value_type();

-- Timeline rows owned by the measurement aggregate are writable only by the
-- dedicated RPC role. Note and episode-event behavior from earlier migrations
-- remains unchanged.
create function public.protect_measurement_medical_event() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if current_user <> 'app_measurement_writer' then
    if tg_op = 'INSERT' and new.type = 'measurement' then
      raise exception 'measurement event is RPC-managed' using errcode='42501';
    elsif tg_op = 'UPDATE'
      and (old.type = 'measurement' or new.type = 'measurement') then
      raise exception 'measurement event is RPC-managed' using errcode='42501';
    elsif tg_op = 'DELETE' and old.type = 'measurement' then
      raise exception 'measurement event is RPC-managed' using errcode='42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger protect_measurement_medical_event
before insert or update or delete on public.medical_events
for each row execute function public.protect_measurement_medical_event();

-- Authenticated callers can read measurements, but all writes must cross an
-- atomic RPC boundary. The no-login writer role has only the table privileges
-- needed by those functions and remains subject to FORCE RLS.
revoke insert, update, delete on public.measurements from anon, authenticated;
grant select on public.measurements to authenticated;
create role app_measurement_writer nologin noinherit nobypassrls;
grant usage on schema public, auth to app_measurement_writer;
grant execute on function auth.uid() to app_measurement_writer;
grant select on public.family_accounts, public.people, public.episodes,
  public.measurement_types, public.measurements, public.medical_events
  to app_measurement_writer;
grant insert, update, delete on public.measurements, public.medical_events
  to app_measurement_writer;

-- Existing families receive the six presets from spec §10.1. The category is
-- the approved exact section name because the specification defines no
-- category taxonomy.
insert into public.measurement_types(
  family_id, name, category, value_type, unit, allowed_units, status, is_preset
)
select
  f.id,
  preset.name,
  'Предустановленные показатели',
  preset.value_type,
  preset.unit,
  '{}'::text[],
  'active',
  true
from public.families f
cross join (values
  ('Температура', 'number', '°C'),
  ('Вес', 'number', 'кг'),
  ('Рост', 'number', 'см'),
  ('Артериальное давление', 'compound', 'мм рт. ст.'),
  ('Пульс', 'number', 'уд/мин'),
  ('Сатурация', 'number', '%')
) as preset(name, value_type, unit)
on conflict do nothing;

-- setup_family is replaced with the original security-definer behavior plus
-- preset creation for future families.
create or replace function public.setup_family(p_name text) returns public.families
language plpgsql security definer set search_path='' as $$
declare
  v_family public.families;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode='28000';
  end if;
  if exists(select 1 from public.family_accounts where account_id=auth.uid()) then
    raise exception 'family already configured' using errcode='23505';
  end if;
  if char_length(btrim(p_name)) not between 1 and 120 then
    raise exception 'invalid name' using errcode='22023';
  end if;

  insert into public.families(name)
  values(btrim(p_name))
  returning * into v_family;

  insert into public.family_accounts(family_id, account_id)
  values(v_family.id, auth.uid());

  insert into public.measurement_types(
    family_id, name, category, value_type, unit, allowed_units, status, is_preset
  ) values
    (v_family.id, 'Температура', 'Предустановленные показатели', 'number', '°C', '{}'::text[], 'active', true),
    (v_family.id, 'Вес', 'Предустановленные показатели', 'number', 'кг', '{}'::text[], 'active', true),
    (v_family.id, 'Рост', 'Предустановленные показатели', 'number', 'см', '{}'::text[], 'active', true),
    (v_family.id, 'Артериальное давление', 'Предустановленные показатели', 'compound', 'мм рт. ст.', '{}'::text[], 'active', true),
    (v_family.id, 'Пульс', 'Предустановленные показатели', 'number', 'уд/мин', '{}'::text[], 'active', true),
    (v_family.id, 'Сатурация', 'Предустановленные показатели', 'number', '%', '{}'::text[], 'active', true)
  on conflict do nothing;

  return v_family;
end $$;
revoke all on function public.setup_family(text) from public;
grant execute on function public.setup_family(text) to authenticated;

-- Creates a measurement and its timeline event in one database transaction.
create function public.create_measurement(
  p_family_id uuid,
  p_person_id uuid,
  p_measurement jsonb
) returns public.measurements
language plpgsql security definer set search_path='' as $$
declare
  v_type public.measurement_types;
  v_measurement public.measurements;
  v_type_id uuid;
  v_episode_id uuid;
  v_occurred_at timestamptz;
  v_numeric numeric;
  v_text text;
  v_boolean boolean;
  v_compound jsonb;
  v_unit text;
  v_comment text;
  v_source text;
  v_value_text text;
  v_description text;
begin
  if auth.uid() is null or not exists(
    select 1 from public.family_accounts fa
    where fa.family_id=p_family_id and fa.account_id=auth.uid()
  ) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_measurement is null or jsonb_typeof(p_measurement) <> 'object' then
    raise exception 'invalid measurement' using errcode='22023';
  end if;
  if not exists(
    select 1 from public.people pe
    where pe.id=p_person_id and pe.family_id=p_family_id
  ) then
    raise exception 'not found' using errcode='P0002';
  end if;

  v_type_id := nullif(p_measurement->>'measurementTypeId', '')::uuid;
  select * into v_type
  from public.measurement_types mt
  where mt.id=v_type_id and mt.family_id=p_family_id and mt.status='active';
  if not found then
    raise exception 'not found' using errcode='P0002';
  end if;

  v_episode_id := nullif(p_measurement->>'episodeId', '')::uuid;
  if v_episode_id is not null and not exists(
    select 1 from public.episodes e
    where e.id=v_episode_id and e.family_id=p_family_id and e.person_id=p_person_id
  ) then
    raise exception 'not found' using errcode='P0002';
  end if;

  v_occurred_at := (p_measurement->>'occurredAt')::timestamptz;
  v_numeric := (p_measurement->>'numericValue')::numeric;
  v_text := p_measurement->>'textValue';
  v_boolean := (p_measurement->>'booleanValue')::boolean;
  v_compound := nullif(p_measurement->'compoundValue', 'null'::jsonb);
  v_unit := coalesce(nullif(btrim(p_measurement->>'unit'), ''), v_type.unit);
  v_comment := p_measurement->>'comment';
  v_source := coalesce(nullif(p_measurement->>'source', ''), 'manual');

  if v_type.value_type = 'number' then
    if v_numeric is null or v_text is not null or v_boolean is not null or v_compound is not null then
      raise exception 'invalid value' using errcode='22023';
    end if;
  elsif v_type.value_type = 'text' then
    if v_text is null or v_numeric is not null or v_boolean is not null or v_compound is not null then
      raise exception 'invalid value' using errcode='22023';
    end if;
  elsif v_type.value_type = 'boolean' then
    if v_boolean is null or v_numeric is not null or v_text is not null or v_compound is not null then
      raise exception 'invalid value' using errcode='22023';
    end if;
  elsif v_type.value_type = 'compound' then
    if v_compound is null or v_numeric is not null or v_text is not null or v_boolean is not null then
      raise exception 'invalid value' using errcode='22023';
    end if;
  else
    raise exception 'unsupported value type' using errcode='22023';
  end if;

  if v_unit is not null
    and v_unit is distinct from v_type.unit
    and not (v_unit = any(v_type.allowed_units)) then
    raise exception 'invalid unit' using errcode='22023';
  end if;

  insert into public.measurements(
    family_id, person_id, measurement_type_id, episode_id, occurred_at,
    numeric_value, text_value, boolean_value, compound_value, unit, comment, source
  ) values (
    p_family_id, p_person_id, v_type.id, v_episode_id, v_occurred_at,
    v_numeric, v_text, v_boolean, v_compound, v_unit, v_comment, v_source
  ) returning * into v_measurement;

  v_value_text := case v_type.value_type
    when 'number' then v_numeric::text
    when 'text' then v_text
    when 'boolean' then case when v_boolean then 'Да' else 'Нет' end
    when 'compound' then (v_compound->>'systolic') || '/' || (v_compound->>'diastolic')
  end;
  v_description := v_value_text
    || case when v_unit is null then '' else ' ' || v_unit end
    || case when v_comment is null then '' else ' — ' || v_comment end;

  insert into public.medical_events(
    family_id, person_id, episode_id, type, subject_id, occurred_at,
    title, description, source, author_id
  ) values (
    p_family_id, p_person_id, v_episode_id, 'measurement', v_measurement.id,
    v_occurred_at, left(v_type.name, 120), v_description, v_source, auth.uid()
  );

  return v_measurement;
end $$;
alter function public.create_measurement(uuid,uuid,jsonb) owner to app_measurement_writer;
revoke execute on function public.create_measurement(uuid,uuid,jsonb) from public;
grant execute on function public.create_measurement(uuid,uuid,jsonb) to authenticated;

-- Updates the measurement and its linked event atomically. The type, source
-- and event author remain immutable.
create function public.update_measurement(
  p_family_id uuid,
  p_person_id uuid,
  p_measurement_id uuid,
  p_changes jsonb
) returns public.measurements
language plpgsql security definer set search_path='' as $$
declare
  v_type public.measurement_types;
  v_measurement public.measurements;
  v_episode_id uuid;
  v_occurred_at timestamptz;
  v_numeric numeric;
  v_text text;
  v_boolean boolean;
  v_compound jsonb;
  v_unit text;
  v_comment text;
  v_value_text text;
  v_description text;
  v_rows integer;
begin
  if auth.uid() is null or not exists(
    select 1 from public.family_accounts fa
    where fa.family_id=p_family_id and fa.account_id=auth.uid()
  ) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'invalid changes' using errcode='22023';
  end if;

  select * into v_measurement
  from public.measurements m
  where m.id=p_measurement_id
    and m.family_id=p_family_id
    and m.person_id=p_person_id
  for update;
  if not found then
    raise exception 'not found' using errcode='P0002';
  end if;

  select * into v_type
  from public.measurement_types mt
  where mt.id=v_measurement.measurement_type_id and mt.family_id=p_family_id;
  if not found then
    raise exception 'not found' using errcode='P0002';
  end if;

  v_episode_id := case
    when p_changes ? 'episodeId' then nullif(p_changes->>'episodeId', '')::uuid
    else v_measurement.episode_id
  end;
  if v_episode_id is not null and not exists(
    select 1 from public.episodes e
    where e.id=v_episode_id and e.family_id=p_family_id and e.person_id=p_person_id
  ) then
    raise exception 'not found' using errcode='P0002';
  end if;

  v_occurred_at := case
    when p_changes ? 'occurredAt' then (p_changes->>'occurredAt')::timestamptz
    else v_measurement.occurred_at
  end;
  v_numeric := case
    when p_changes ? 'numericValue' then (p_changes->>'numericValue')::numeric
    else v_measurement.numeric_value
  end;
  v_text := case
    when p_changes ? 'textValue' then p_changes->>'textValue'
    else v_measurement.text_value
  end;
  v_boolean := case
    when p_changes ? 'booleanValue' then (p_changes->>'booleanValue')::boolean
    else v_measurement.boolean_value
  end;
  v_compound := case
    when p_changes ? 'compoundValue' then nullif(p_changes->'compoundValue', 'null'::jsonb)
    else v_measurement.compound_value
  end;
  v_unit := case
    when p_changes ? 'unit' then coalesce(nullif(btrim(p_changes->>'unit'), ''), v_type.unit)
    else v_measurement.unit
  end;
  v_comment := case
    when p_changes ? 'comment' then p_changes->>'comment'
    else v_measurement.comment
  end;

  if v_type.value_type = 'number' then
    if v_numeric is null or v_text is not null or v_boolean is not null or v_compound is not null then
      raise exception 'invalid value' using errcode='22023';
    end if;
  elsif v_type.value_type = 'text' then
    if v_text is null or v_numeric is not null or v_boolean is not null or v_compound is not null then
      raise exception 'invalid value' using errcode='22023';
    end if;
  elsif v_type.value_type = 'boolean' then
    if v_boolean is null or v_numeric is not null or v_text is not null or v_compound is not null then
      raise exception 'invalid value' using errcode='22023';
    end if;
  elsif v_type.value_type = 'compound' then
    if v_compound is null or v_numeric is not null or v_text is not null or v_boolean is not null then
      raise exception 'invalid value' using errcode='22023';
    end if;
  else
    raise exception 'unsupported value type' using errcode='22023';
  end if;

  if v_unit is not null
    and v_unit is distinct from v_type.unit
    and not (v_unit = any(v_type.allowed_units)) then
    raise exception 'invalid unit' using errcode='22023';
  end if;

  update public.measurements
  set episode_id=v_episode_id,
      occurred_at=v_occurred_at,
      numeric_value=v_numeric,
      text_value=v_text,
      boolean_value=v_boolean,
      compound_value=v_compound,
      unit=v_unit,
      comment=v_comment,
      updated_at=now()
  where id=p_measurement_id and family_id=p_family_id and person_id=p_person_id
  returning * into v_measurement;

  v_value_text := case v_type.value_type
    when 'number' then v_numeric::text
    when 'text' then v_text
    when 'boolean' then case when v_boolean then 'Да' else 'Нет' end
    when 'compound' then (v_compound->>'systolic') || '/' || (v_compound->>'diastolic')
  end;
  v_description := v_value_text
    || case when v_unit is null then '' else ' ' || v_unit end
    || case when v_comment is null then '' else ' — ' || v_comment end;

  update public.medical_events
  set episode_id=v_episode_id,
      occurred_at=v_occurred_at,
      title=left(v_type.name, 120),
      description=v_description,
      updated_at=now()
  where family_id=p_family_id
    and person_id=p_person_id
    and type='measurement'
    and subject_id=p_measurement_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'not found' using errcode='P0002';
  end if;

  return v_measurement;
end $$;
alter function public.update_measurement(uuid,uuid,uuid,jsonb) owner to app_measurement_writer;
revoke execute on function public.update_measurement(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.update_measurement(uuid,uuid,uuid,jsonb) to authenticated;

-- Deletes the linked timeline event and measurement in one transaction.
create function public.delete_measurement(
  p_family_id uuid,
  p_person_id uuid,
  p_measurement_id uuid
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  v_id uuid;
  v_rows integer;
begin
  if auth.uid() is null or not exists(
    select 1 from public.family_accounts fa
    where fa.family_id=p_family_id and fa.account_id=auth.uid()
  ) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  perform 1 from public.measurements m
  where m.id=p_measurement_id
    and m.family_id=p_family_id
    and m.person_id=p_person_id
  for update;
  if not found then
    raise exception 'not found' using errcode='P0002';
  end if;

  delete from public.medical_events
  where family_id=p_family_id
    and person_id=p_person_id
    and type='measurement'
    and subject_id=p_measurement_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'not found' using errcode='P0002';
  end if;

  delete from public.measurements
  where id=p_measurement_id
    and family_id=p_family_id
    and person_id=p_person_id
  returning id into v_id;

  return v_id;
end $$;
alter function public.delete_measurement(uuid,uuid,uuid) owner to app_measurement_writer;
revoke execute on function public.delete_measurement(uuid,uuid,uuid) from public;
grant execute on function public.delete_measurement(uuid,uuid,uuid) to authenticated;
