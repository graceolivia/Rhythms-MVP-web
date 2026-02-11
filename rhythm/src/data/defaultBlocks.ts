import type { HabitBlock, HabitBlockItem, TaskCategory } from '../types';

interface DefaultBlockDef extends Omit<HabitBlock, 'id'> {
  // items use title strings as taskId before resolution
  items: HabitBlockItem[];
}

interface ChoreQueueDef {
  title: string;
  category: TaskCategory;
}

// Block item helper — uses title as taskId placeholder (resolved in seedDefaultBlocks)
function item(title: string, order: number, isTrackable: boolean): HabitBlockItem {
  return { taskId: title, order, isTrackable };
}

function choreSlot(order: number): HabitBlockItem {
  return { taskId: '', order, isTrackable: true, choreQueueSlot: true };
}

export function createDefaultBlocks(_childIds: string[]): {
  blocks: DefaultBlockDef[];
  choreTasks: ChoreQueueDef[];
} {
  const blocks: DefaultBlockDef[] = [
    {
      name: 'Morning Rush',
      emoji: '🌅',
      anchor: { type: 'time', time: '06:15' },
      estimatedEndTime: '08:30',
      items: [
        item('Skincare routine', 1, true),
        item('Squats / morning movement', 2, true),
        item('Healthy breakfast', 3, true),
        item('Unload dishwasher', 4, true),
      ],
      recurrence: 'daily',
      isActive: true,
      color: 'terracotta',
    },
    {
      name: 'Baby Nap 1',
      emoji: '😴',
      anchor: { type: 'time', time: '09:00' },
      estimatedEndTime: '10:30',
      items: [
        item('Focused computer work', 1, true),
      ],
      recurrence: 'daily',
      isActive: true,
      color: 'lavender',
    },
    {
      name: 'Baby Awake / Errands',
      emoji: '🚗',
      anchor: { type: 'time', time: '10:30' },
      estimatedEndTime: '12:30',
      items: [
        choreSlot(1),
        item('Errands', 2, false),
      ],
      recurrence: 'daily',
      isActive: true,
      color: 'skyblue',
    },
    {
      name: 'Overlap Nap',
      emoji: '✨',
      anchor: { type: 'time', time: '13:00' },
      estimatedEndTime: '15:00',
      items: [
        item('Code time', 1, true),
        item('Deep self-care', 2, true),
      ],
      recurrence: 'daily',
      isActive: true,
      color: 'sage',
    },
    {
      name: 'Afternoon',
      emoji: '🎨',
      anchor: { type: 'time', time: '15:00' },
      estimatedEndTime: '17:30',
      items: [
        item('Enrichment activity', 1, true),
        item('Dinner prep', 2, false),
      ],
      recurrence: 'daily',
      isActive: true,
      color: 'dustyrose',
    },
    {
      name: 'Evening Close',
      emoji: '🌙',
      anchor: { type: 'time', time: '20:00' },
      estimatedEndTime: '21:30',
      items: [
        item('Dishes', 1, true),
        item('Sweep kitchen', 2, true),
        item('Prep coffee', 3, true),
        item('Prep bottle', 4, true),
        item('Wipe counters', 5, true),
        item('Tidy living room', 6, true),
        item('Set out clothes', 7, true),
      ],
      recurrence: 'daily',
      isActive: true,
      color: 'lavender',
    },
  ];

  const choreTasks: ChoreQueueDef[] = [
    { title: 'Wipe baseboards', category: 'cleaning' },
    { title: 'Clean fridge', category: 'kitchen' },
    { title: 'Organize one drawer', category: 'tidying' },
    { title: 'Clean mirrors', category: 'cleaning' },
    { title: 'Wipe light switches', category: 'cleaning' },
    { title: 'Clean microwave', category: 'kitchen' },
    { title: 'Dust surfaces', category: 'cleaning' },
    { title: 'Sort mail', category: 'tidying' },
    { title: 'Clean toilet', category: 'cleaning' },
    { title: 'Wipe appliance fronts', category: 'kitchen' },
  ];

  return { blocks, choreTasks };
}
