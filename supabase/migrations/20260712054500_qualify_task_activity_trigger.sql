begin;

create or replace function public.log_task_changes()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  changed_fields jsonb := '{}';
begin
  if old.status is distinct from new.status then
    changed_fields := changed_fields || jsonb_build_object(
      'status',
      jsonb_build_object('old', old.status, 'new', new.status)
    );
  end if;

  if old.assigned_to is distinct from new.assigned_to then
    changed_fields := changed_fields || jsonb_build_object(
      'assigned_to',
      jsonb_build_object('old', old.assigned_to, 'new', new.assigned_to)
    );
  end if;

  if old.priority is distinct from new.priority then
    changed_fields := changed_fields || jsonb_build_object(
      'priority',
      jsonb_build_object('old', old.priority, 'new', new.priority)
    );
  end if;

  if changed_fields != '{}' then
    insert into public.task_activity_log (
      task_id,
      user_id,
      action,
      old_value,
      new_value,
      description
    )
    values (
      new.id,
      coalesce(new.assigned_to, new.created_by),
      'update',
      to_jsonb(old),
      to_jsonb(new),
      'تم تحديث المهمة'
    );
  end if;

  return new;
end;
$function$;

commit;
