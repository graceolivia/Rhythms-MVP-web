**Technical Guide**

**Rhythm Web Prototype**

*Project Structure, Tech Stack, and Getting Started*

January 2026

# **Overview**

This guide will help you build a functional web prototype of Rhythm that you can use daily on your phone (via browser) while preparing for eventual iOS development. The goal is a working app in 2-4 weeks of part-time effort.

## **Why This Stack**

**React \+ TypeScript:** React is the most transferable choice. When you move to React Native for iOS, you&\#x2019;ll reuse your mental models and much of your component logic. TypeScript catches bugs before runtime, which matters when you&\#x2019;re solo and can&\#x2019;t afford debugging rabbit holes.

**Vite:** Modern build tool that&\#x2019;s fast and simple. Create React App is dying; Vite is the new standard. Zero-config to start, fast hot reload while developing.

**Zustand:** State management that doesn&\#x2019;t make you want to cry. Unlike Redux, it&\#x2019;s minimal boilerplate and easy to understand. Perfect for solo projects.

**Tailwind CSS:** Controversial but practical. You&\#x2019;ll style faster than with traditional CSS, and you can customize the color palette to match the Waldorf aesthetic. We&\#x2019;ll set up a custom theme with your natural-dye tones.

**Local Storage (for now):** No backend needed for the prototype. All data lives on the device. Simple, private, offline-first. You can add cloud sync later if needed.

# **Project Structure**

Here&\#x2019;s the folder structure, organized for clarity and future growth:

rhythm/

├── src/

│   ├── components/          \# Reusable UI pieces

│   │   ├── common/          \# Buttons, cards, inputs

│   │   ├── garden/          \# Garden visualization

│   │   ├── tasks/           \# Task list, task card

│   │   └── naps/            \# Nap tracking UI

│   │

│   ├── screens/             \# Full-page views

│   │   ├── Today.tsx        \# Main dashboard

│   │   ├── DailyRhythm.tsx  \# Timeline view

│   │   ├── Seeds.tsx        \# Tomorrow's Seeds queue

│   │   ├── Garden.tsx       \# Full garden view

│   │   ├── Settings.tsx     \# Configuration

│   │   └── Onboarding/      \# Multi-step onboarding

│   │

│   ├── stores/              \# Zustand state stores

│   │   ├── useTaskStore.ts

│   │   ├── useNapStore.ts

│   │   ├── useChildStore.ts

│   │   ├── useGardenStore.ts

│   │   └── useSettingsStore.ts

│   │

│   ├── hooks/               \# Custom React hooks

│   │   ├── useCurrentTimeBlock.ts

│   │   ├── useNapState.ts

│   │   ├── useSunTimes.ts

│   │   └── useGoodEnoughDay.ts

│   │

│   ├── utils/               \# Pure helper functions

│   │   ├── taskPrioritizer.ts

│   │   ├── timeHelpers.ts

│   │   └── storageHelpers.ts

│   │

│   ├── types/               \# TypeScript definitions

│   │   └── index.ts

│   │

│   ├── styles/              \# Global styles, Tailwind config

│   │   └── theme.ts         \# Waldorf color palette

│   │

│   ├── App.tsx              \# Main app component

│   └── main.tsx             \# Entry point

│

├── public/                  \# Static assets

├── package.json

├── tailwind.config.js

├── tsconfig.json

└── vite.config.ts

# **Core Data Types**

These TypeScript types define the shape of your data. They&\#x2019;re the contract your whole app builds on.

## **Children & Naps**

interface Child {

  id: string;

  name: string;

  birthdate: string;          // ISO date

  isNappingAge: boolean;

}

interface NapSchedule {

  id: string;

  childId: string;

  napNumber: number;          // 1, 2, or 3

  typicalStart: string;       // '09:30'

  typicalEnd: string;         // '11:00'

}

interface NapLog {

  id: string;

  childId: string;

  date: string;               // ISO date

  startedAt: string;          // ISO datetime

  endedAt: string | null;     // null if still sleeping

}

## **Tasks**

type TaskTier \= 'anchor' | 'rhythm' | 'tending';

type RecurrenceRule \= 

  | 'daily'

  | 'weekdays'

  | 'weekly'

  | 'monthly'

  | { type: 'specific-days'; days: number\[\] };  // 0=Sun

interface Task {

  id: string;

  title: string;

  tier: TaskTier;

  scheduledTime: string | null;   // '08:45' for anchors

  recurrence: RecurrenceRule;

  napContext: NapContext | null;  // when to suggest

  isActive: boolean;

  category: TaskCategory;

}

type NapContext \= 

  | 'both-awake'

  | 'both-asleep'

  | 'toddler-asleep'

  | 'baby-asleep'

  | 'any';

type TaskCategory \= 

  | 'meals'

  | 'kids'

  | 'kitchen'

  | 'laundry'

  | 'tidying'

  | 'cleaning'

  | 'errands'

  | 'self-care'

  | 'focus-work'

  | 'other';

type TaskStatus \= 

  | 'pending'

  | 'completed'

  | 'skipped'

  | 'deferred';

interface TaskInstance {

  id: string;

  taskId: string;

  date: string;                // ISO date

  status: TaskStatus;

  completedAt: string | null;

  deferredTo: string | null;   // for Seeds queue

}

## **Garden**

type Season \= 'spring' | 'summer' | 'fall' | 'winter';

type FlowerType \= 

  | 'daily-daisy'        // basic daily completion

  | 'rhythm-rose'        // all rhythms completed

  | 'golden-hour-lily'   // used double-nap well

  | 'self-care-sunflower'// self-care task done

  | 'challenge-bloom';   // special challenge

interface Flower {

  id: string;

  type: FlowerType;

  earnedDate: string;

  challengeId: string | null;

}

interface Garden {

  flowers: Flower\[\];

  currentSeason: Season;

  unlockedCustomizations: string\[\];

}

## **Settings & User**

type SeasonOfLife \= 

  | 'survival'      // minimal expectations

  | 'finding-footing'

  | 'steady-rhythm';

interface UserSettings {

  hasCompletedOnboarding: boolean;

  seasonOfLife: SeasonOfLife;

  location: { lat: number; lng: number } | null;

  sunriseResetEnabled: boolean;

}

# **Key Custom Hooks**

These hooks encapsulate the core logic. They&\#x2019;re where the &\#x201C;smart&\#x201D; parts of the app live.

## **useNapState**

Computes the current nap state from active nap logs:

function useNapState(): {

  napState: NapContext;

  sleepingChildren: Child\[\];

  awakeChildren: Child\[\];

  currentNaps: NapLog\[\];        // active naps

  startNap: (childId: string) \=\> void;

  endNap: (childId: string) \=\> void;

}

This hook checks all nap logs for today, finds any with no endedAt, and derives the current state. The napState value drives task suggestions throughout the app.

## **useCurrentTimeBlock**

Determines where we are in the daily rhythm:

interface TimeBlock {

  id: string;

  name: string;            // 'Morning Block', 'Focus Block \#1'

  startTime: string;

  endTime: string;

  isFocusBlock: boolean;

}

function useCurrentTimeBlock(): {

  currentBlock: TimeBlock | null;

  nextAnchor: Task | null;

  minutesUntilNextAnchor: number;

}

## **useGoodEnoughDay**

Tracks whether the user has hit the &\#x201C;Good Enough&\#x201D; threshold:

function useGoodEnoughDay(): {

  isGoodEnough: boolean;

  rhythmsCompleted: number;

  rhythmsTotal: number;

  missingRhythms: Task\[\];

}

By default, Good Enough \= all &\#x201C;rhythm&\#x201D; tier tasks for today are completed. In survival mode, threshold is lower.

## **useSunTimes**

Gets sunrise/sunset for the user&\#x2019;s location:

function useSunTimes(): {

  sunrise: Date | null;

  sunset: Date | null;

  moonPhase: string;

  isLoading: boolean;

}

Uses the browser&\#x2019;s geolocation API plus a sun-position library (suncalc). Falls back to reasonable defaults if location denied.

# **Waldorf Color Theme**

Here&\#x2019;s a custom Tailwind configuration with the Waldorf-inspired palette:

## **tailwind.config.js**

module.exports \= {

  content: \['./src/\*\*/\*.{js,ts,jsx,tsx}'\],

  theme: {

    extend: {

      colors: {

        // Primary palette \- natural dye tones

        cream: '\#FAF6F1',

        parchment: '\#F5EDE4',

        linen: '\#EDE6DB',

        

        // Earth tones

        bark: '\#5D4E37',

        terracotta: '\#C67B5C',

        clay: '\#B8860B',

        

        // Garden greens

        sage: '\#9CAF88',

        moss: '\#6B7B3C',

        fern: '\#4A5D23',

        

        // Soft accents

        dustyrose: '\#D4A5A5',

        lavender: '\#B8A9C9',

        skyblue: '\#A5C4D4',

        

        // Seasonal accents

        spring: { 

          light: '\#E8F5E9', 

          DEFAULT: '\#81C784' 

        },

        summer: { 

          light: '\#FFF8E1', 

          DEFAULT: '\#FFD54F' 

        },

        fall: { 

          light: '\#FBE9E7', 

          DEFAULT: '\#FF8A65' 

        },

        winter: { 

          light: '\#E3F2FD', 

          DEFAULT: '\#90CAF9' 

        },

      },

      fontFamily: {

        display: \['Playfair Display', 'Georgia', 'serif'\],

        body: \['Lora', 'Georgia', 'serif'\],

        sans: \['Source Sans Pro', 'system-ui', 'sans-serif'\],

      },

    },

  },

  plugins: \[\],

};

# **Getting Started**

Follow these steps to set up the project on your machine.

## **Prerequisites**

* **Node.js 18+:** Download from nodejs.org if you don&\#x2019;t have it  
* **A code editor:** VS Code recommended (free)  
* **Terminal comfort:** You&\#x2019;ll run a few commands, nothing scary

## **Step 1: Create the Project**

Open your terminal and run:

npm create vite@latest rhythm \-- \--template react-ts

cd rhythm

npm install

## **Step 2: Add Dependencies**

npm install zustand                  \# State management

npm install react-router-dom         \# Navigation

npm install suncalc                  \# Sunrise/sunset

npm install date-fns                 \# Date utilities

npm install uuid                     \# Generate IDs

npm install \-D tailwindcss postcss autoprefixer

npx tailwindcss init \-p

## **Step 3: Configure Tailwind**

Replace the contents of tailwind.config.js with the Waldorf theme shown on the previous page. Then update src/index.css:

@tailwind base;

@tailwind components;

@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=

  Lora:wght@400;600\&family=Playfair+Display:wght@600&

  family=Source+Sans+Pro:wght@400;600\&display=swap');

## **Step 4: Create the Folder Structure**

Create the folders shown in the Project Structure section. You can do this manually or run:

mkdir \-p src/{components/{common,garden,tasks,naps},

  screens/Onboarding,stores,hooks,utils,types,styles}

## **Step 5: Run the Dev Server**

npm run dev

Open http://localhost:5173 in your browser. You should see the Vite starter page. You&\#x2019;re ready to build.

# **Recommended Build Order**

Don&\#x2019;t try to build everything at once. Here&\#x2019;s a suggested sequence that gets you to a usable app quickly:

## **Week 1: Core Data & Basic UI**

1. **Types:** Define all your TypeScript types in src/types/index.ts  
2. **Storage helpers:** Functions to save/load from localStorage  
3. **Child store:** Zustand store for children data  
4. **Task store:** Store for tasks and task instances  
5. **Basic Today screen:** Show today&\#x2019;s tasks in a simple list  
6. **Task completion:** Tap to mark done

*At end of Week 1: You can see and complete tasks. Ugly but functional.*

## **Week 2: Nap Tracking & Time Awareness**

7. **Nap store:** Track nap logs  
8. **useNapState hook:** Compute current nap context  
9. **Nap buttons:** &\#x201C;Nap Started&\#x201D; / &\#x201C;Nap Ended&\#x201D; UI  
10. **useSunTimes hook:** Get sunrise/sunset  
11. **Time-aware header:** Show current time, sun position  
12. **Task filtering by nap context:** Show relevant tasks

*At end of Week 2: The app knows who&\#x2019;s napping and suggests appropriate tasks.*

## **Week 3: Polish & Garden**

13. **Tomorrow&\#x2019;s Seeds:** Queue for rolled-over tasks  
14. **Daily reset logic:** Create new task instances at sunrise  
15. **useGoodEnoughDay hook:** Track daily threshold  
16. **Good Enough celebration:** Modal or banner when achieved  
17. **Garden store:** Track flowers  
18. **Simple garden view:** Display earned flowers (can be placeholder graphics)

*At end of Week 3: Full daily loop works. You can use it for real.*

## **Week 4: Onboarding & Refinement**

19. **Onboarding flow:** Multi-step setup for new users  
20. **Chore library:** Pre-built tasks to select from  
21. **Settings screen:** Edit children, tasks, preferences  
22. **Visual polish:** Apply Waldorf styling throughout  
23. **PWA setup:** Make it installable on home screen

*At end of Week 4: Ready for daily personal use and initial beta testers.*

# **Making It a PWA**

A Progressive Web App lets users &\#x201C;install&\#x201D; your web app to their home screen. It feels like a native app but is just a website.

## **Add a Manifest**

Create public/manifest.json:

{

  "name": "Rhythm",

  "short\_name": "Rhythm",

  "description": "Daily rhythm for stay-at-home moms",

  "start\_url": "/",

  "display": "standalone",

  "background\_color": "\#FAF6F1",

  "theme\_color": "\#6B7B3C",

  "icons": \[

    { "src": "/icon-192.png", "sizes": "192x192" },

    { "src": "/icon-512.png", "sizes": "512x512" }

  \]

}

## **Add to index.html**

\<link rel="manifest" href="/manifest.json" /\>

\<meta name="theme-color" content="\#6B7B3C" /\>

\<meta name="apple-mobile-web-app-capable" content="yes" /\>

\<link rel="apple-touch-icon" href="/icon-192.png" /\>

## **Create Icons**

You&\#x2019;ll need app icons at 192x192 and 512x512 pixels. For the prototype, a simple colored circle with &\#x201C;R&\#x201D; works. Replace later with your hand-drawn art.

## **Deploy**

Push to GitHub and connect to Vercel or Netlify (both free). Your app gets a URL like rhythm-app.vercel.app that works on any phone.

# **What I Can Help With Next**

Once you&\#x2019;re ready to start coding, I can:

* **Write the actual stores:** Full Zustand store implementations  
* **Build specific components:** Task cards, nap buttons, etc.  
* **Implement hooks:** The useNapState, useSunTimes, etc. logic  
* **Debug issues:** Paste errors, I&\#x2019;ll help  
* **Design specific screens:** Wireframes or working code  
* **Write the task prioritization algorithm:** The &\#x201C;What Should I Do?&\#x201D; oracle

The best workflow: you start building, hit a wall, describe what you&\#x2019;re trying to do, and I help you through it. Learning by doing with a safety net.

—

*End of Document*

Rhythm Technical Guide | January 2026