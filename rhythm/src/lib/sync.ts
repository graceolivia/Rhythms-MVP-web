import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

// Generic sync helper that handles the common patterns
export async function syncToSupabase<T extends { id: string }>(
  tableName: string,
  localData: T[],
  userId: string,
  mapToDb: (item: T, userId: string) => Record<string, unknown>
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    // Upsert all local data
    const dbData = localData.map((item) => mapToDb(item, userId));

    if (dbData.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
    }

    return { error: null };
  } catch (err) {
    console.error(`Error syncing ${tableName}:`, err);
    return { error: err as Error };
  }
}

export async function fetchFromSupabase<T>(
  tableName: string,
  userId: string
): Promise<{ data: T[] | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return { data: data as T[], error: null };
  } catch (err) {
    console.error(`Error fetching ${tableName}:`, err);
    return { data: null, error: err as Error };
  }
}

export async function deleteFromSupabase(
  tableName: string,
  id: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (err) {
    console.error(`Error deleting from ${tableName}:`, err);
    return { error: err as Error };
  }
}

// Full sync: push all local data to Supabase
export async function pushAllDataToSupabase(
  user: User,
  stores: {
    children: unknown[];
    tasks: unknown[];
    taskInstances: unknown[];
    napSchedules: unknown[];
    napLogs: unknown[];
    awayLogs: unknown[];
    careBlocks: unknown[];
    flowers: unknown[];
    placedFlowers: unknown[];
  }
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const userId = user.id;

  try {
    // Sync in order of dependencies (children first, then things that reference children)

    // 1. Children
    if (stores.children.length > 0) {
      const { error } = await supabase.from('children').upsert(
        (stores.children as Array<{ id: string; name: string; birthdate?: string; isNappingAge?: boolean; color?: string; careStatus?: string; bedtime?: string; wakeTime?: string }>).map((c) => ({
          id: c.id,
          user_id: userId,
          name: c.name,
          birthdate: c.birthdate || null,
          is_napping_age: c.isNappingAge ?? true,
          color: c.color || 'lavender',
          care_status: c.careStatus || 'home',
          bedtime: c.bedtime || null,
          wake_time: c.wakeTime || null,
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    // 2. Tasks
    if (stores.tasks.length > 0) {
      const { error } = await supabase.from('tasks').upsert(
        (stores.tasks as Array<{
          id: string; type?: string; title: string; tier: string; scheduledTime?: string | null;
          duration?: number | null; recurrence?: string; daysOfWeek?: number[] | null;
          napContext?: string | null; careContext?: string | null; bestWhen?: string[] | null;
          isActive?: boolean; category?: string | null; childId?: string | null;
          childTaskType?: string | null; isInformational?: boolean;
        }>).map((t) => ({
          id: t.id,
          user_id: userId,
          type: t.type || 'standard',
          title: t.title,
          tier: t.tier,
          scheduled_time: t.scheduledTime || null,
          duration: t.duration || null,
          recurrence: typeof t.recurrence === 'string' ? t.recurrence : 'daily',
          days_of_week: t.daysOfWeek || null,
          nap_context: t.napContext || null,
          care_context: t.careContext || null,
          best_when: t.bestWhen || null,
          is_active: t.isActive ?? true,
          category: t.category || null,
          child_id: t.childId || null,
          child_task_type: t.childTaskType || null,
          is_informational: t.isInformational ?? false,
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    // 3. Task Instances
    if (stores.taskInstances.length > 0) {
      const { error } = await supabase.from('task_instances').upsert(
        (stores.taskInstances as Array<{
          id: string; taskId: string; date: string; status: string; completedAt?: string | null;
        }>).map((ti) => ({
          id: ti.id,
          user_id: userId,
          task_id: ti.taskId,
          date: ti.date,
          status: ti.status,
          completed_at: ti.completedAt || null,
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    // 4. Nap Schedules
    if (stores.napSchedules.length > 0) {
      const { error } = await supabase.from('nap_schedules').upsert(
        (stores.napSchedules as Array<{
          id: string; childId: string; napNumber: number;
          typicalStart?: string | null; typicalEnd?: string | null;
        }>).map((ns) => ({
          id: ns.id,
          user_id: userId,
          child_id: ns.childId,
          nap_number: ns.napNumber,
          typical_start: ns.typicalStart || null,
          typical_end: ns.typicalEnd || null,
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    // 5. Nap Logs
    if (stores.napLogs.length > 0) {
      const { error } = await supabase.from('nap_logs').upsert(
        (stores.napLogs as Array<{
          id: string; childId: string; date: string; startedAt: string;
          endedAt?: string | null; sleepType?: string;
        }>).map((nl) => ({
          id: nl.id,
          user_id: userId,
          child_id: nl.childId,
          date: nl.date,
          started_at: nl.startedAt,
          ended_at: nl.endedAt || null,
          sleep_type: nl.sleepType || 'nap',
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    // 6. Away Logs
    if (stores.awayLogs.length > 0) {
      const { error } = await supabase.from('away_logs').upsert(
        (stores.awayLogs as Array<{
          id: string; childId: string; date: string; startedAt: string;
          endedAt?: string | null; scheduleName?: string | null;
        }>).map((al) => ({
          id: al.id,
          user_id: userId,
          child_id: al.childId,
          date: al.date,
          started_at: al.startedAt,
          ended_at: al.endedAt || null,
          schedule_name: al.scheduleName || null,
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    // 7. Care Blocks
    if (stores.careBlocks.length > 0) {
      const { error } = await supabase.from('care_blocks').upsert(
        (stores.careBlocks as Array<{
          id: string; childIds: string[]; name: string; blockType?: string;
          recurrence?: string | null; daysOfWeek?: number[] | null;
          startTime?: string | null; endTime?: string | null;
          travelTimeBefore?: number | null; travelTimeAfter?: number | null;
          isActive?: boolean;
        }>).map((cb) => ({
          id: cb.id,
          user_id: userId,
          child_ids: cb.childIds,
          name: cb.name,
          block_type: cb.blockType || 'childcare',
          recurrence: cb.recurrence || null,
          days_of_week: cb.daysOfWeek || null,
          start_time: cb.startTime || null,
          end_time: cb.endTime || null,
          travel_time_before: cb.travelTimeBefore || null,
          travel_time_after: cb.travelTimeAfter || null,
          is_active: cb.isActive ?? true,
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    // 8. Flowers
    if (stores.flowers.length > 0) {
      const { error } = await supabase.from('flowers').upsert(
        (stores.flowers as Array<{
          id: string; type: string; earnedDate: string; challengeId?: string | null;
        }>).map((f) => ({
          id: f.id,
          user_id: userId,
          type: f.type,
          earned_date: f.earnedDate,
          challenge_id: f.challengeId || null,
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    // 9. Placed Flowers
    if (stores.placedFlowers.length > 0) {
      const { error } = await supabase.from('placed_flowers').upsert(
        (stores.placedFlowers as Array<{
          id: string; flowerId: string; col: number; row: number; placedAt?: string;
        }>).map((pf) => ({
          id: pf.id,
          user_id: userId,
          flower_id: pf.flowerId,
          col: pf.col,
          row: pf.row,
          placed_at: pf.placedAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    }

    return { error: null };
  } catch (err) {
    console.error('Error pushing data to Supabase:', err);
    return { error: err as Error };
  }
}

// Full sync: pull all data from Supabase to local
export async function pullAllDataFromSupabase(user: User): Promise<{
  data: {
    children: unknown[];
    tasks: unknown[];
    taskInstances: unknown[];
    napSchedules: unknown[];
    napLogs: unknown[];
    awayLogs: unknown[];
    careBlocks: unknown[];
    flowers: unknown[];
    placedFlowers: unknown[];
  } | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const userId = user.id;

  try {
    const [
      childrenRes,
      tasksRes,
      taskInstancesRes,
      napSchedulesRes,
      napLogsRes,
      awayLogsRes,
      careBlocksRes,
      flowersRes,
      placedFlowersRes,
    ] = await Promise.all([
      supabase.from('children').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('task_instances').select('*').eq('user_id', userId),
      supabase.from('nap_schedules').select('*').eq('user_id', userId),
      supabase.from('nap_logs').select('*').eq('user_id', userId),
      supabase.from('away_logs').select('*').eq('user_id', userId),
      supabase.from('care_blocks').select('*').eq('user_id', userId),
      supabase.from('flowers').select('*').eq('user_id', userId),
      supabase.from('placed_flowers').select('*').eq('user_id', userId),
    ]);

    // Check for errors
    const errors = [
      childrenRes.error,
      tasksRes.error,
      taskInstancesRes.error,
      napSchedulesRes.error,
      napLogsRes.error,
      awayLogsRes.error,
      careBlocksRes.error,
      flowersRes.error,
      placedFlowersRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw errors[0];
    }

    // Map database format back to app format
    const children = (childrenRes.data || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      birthdate: c.birthdate,
      isNappingAge: c.is_napping_age,
      color: c.color,
      careStatus: c.care_status,
      bedtime: c.bedtime,
      wakeTime: c.wake_time,
    }));

    const tasks = (tasksRes.data || []).map((t: Record<string, unknown>) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      tier: t.tier,
      scheduledTime: t.scheduled_time,
      duration: t.duration,
      recurrence: t.recurrence,
      daysOfWeek: t.days_of_week,
      napContext: t.nap_context,
      careContext: t.care_context,
      bestWhen: t.best_when,
      isActive: t.is_active,
      category: t.category,
      childId: t.child_id,
      childTaskType: t.child_task_type,
      isInformational: t.is_informational,
    }));

    const taskInstances = (taskInstancesRes.data || []).map((ti: Record<string, unknown>) => ({
      id: ti.id,
      taskId: ti.task_id,
      date: ti.date,
      status: ti.status,
      completedAt: ti.completed_at,
    }));

    const napSchedules = (napSchedulesRes.data || []).map((ns: Record<string, unknown>) => ({
      id: ns.id,
      childId: ns.child_id,
      napNumber: ns.nap_number,
      typicalStart: ns.typical_start,
      typicalEnd: ns.typical_end,
    }));

    const napLogs = (napLogsRes.data || []).map((nl: Record<string, unknown>) => ({
      id: nl.id,
      childId: nl.child_id,
      date: nl.date,
      startedAt: nl.started_at,
      endedAt: nl.ended_at,
      sleepType: nl.sleep_type,
    }));

    const awayLogs = (awayLogsRes.data || []).map((al: Record<string, unknown>) => ({
      id: al.id,
      childId: al.child_id,
      date: al.date,
      startedAt: al.started_at,
      endedAt: al.ended_at,
      scheduleName: al.schedule_name,
    }));

    const careBlocks = (careBlocksRes.data || []).map((cb: Record<string, unknown>) => ({
      id: cb.id,
      childIds: cb.child_ids,
      name: cb.name,
      blockType: cb.block_type,
      recurrence: cb.recurrence,
      daysOfWeek: cb.days_of_week,
      startTime: cb.start_time,
      endTime: cb.end_time,
      travelTimeBefore: cb.travel_time_before,
      travelTimeAfter: cb.travel_time_after,
      isActive: cb.is_active,
    }));

    const flowers = (flowersRes.data || []).map((f: Record<string, unknown>) => ({
      id: f.id,
      type: f.type,
      earnedDate: f.earned_date,
      challengeId: f.challenge_id,
    }));

    const placedFlowers = (placedFlowersRes.data || []).map((pf: Record<string, unknown>) => ({
      id: pf.id,
      flowerId: pf.flower_id,
      flowerType: '', // Will need to be looked up from flowers
      col: pf.col,
      row: pf.row,
      placedAt: pf.placed_at,
    }));

    return {
      data: {
        children,
        tasks,
        taskInstances,
        napSchedules,
        napLogs,
        awayLogs,
        careBlocks,
        flowers,
        placedFlowers,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error pulling data from Supabase:', err);
    return { data: null, error: err as Error };
  }
}
