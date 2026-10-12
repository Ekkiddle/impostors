# Impostors
This project was inspired by AmongUs, but I wanted to be able to play a game like that in person, with my friends. So, I am using a web-based React front end framework that will be hosted online, in conjunction with a supabase database for storing game state and information. This is a migration from the previous P2P architecture, since a real-time database is more reliable and scalable in the real world.

## Running the app

The app uses Supabase for game and player state. Set these browser-safe variables
in `.env.local` for local development and in the Vercel project settings for
deployments:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
```

## Resetting the Supabase database

The schema migrations create the `games`, `players`, `maps`, `maps_tasks`, and
`players_tasks` tables, then seed the default `SKELD` map and its task catalog.
The schema migration also installs the player-leave and host-promotion function.

Resetting drops existing database data. Back up anything you need before
resetting. To reset the linked Supabase project and recreate it from the current
migrations:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db reset --linked
```

If the project is already linked, omit the `supabase link` command. For a local
Supabase database, start the local stack and reset it with:

```bash
supabase start
supabase db reset
```

Do not use `supabase db push` to replace an existing database's schema; use the
reset command when you intend to discard the old schema and data. After changing
environment variables in Vercel, redeploy so the Next.js build receives them.
Do not use the Supabase secret key in the browser.

The initial migration permits anonymous read/write access for this no-login prototype. The publishable key is safe to expose, but those broad database policies mean anyone with the project URL can read or modify game data; tighten the policies before using this for a production game with private player data.

For local development, run:

```bash
npm run dev
```

For production, build the app first and then start the production server:

```bash
npm run build
npm run start
```

Create a game from the host page or join one with its six-character game code. All players share the same lobby; it displays the code and keeps the host at the top of the player list. The host can start the game once at least four players have joined. Leaving the lobby removes that player, and the oldest remaining player becomes host if the host leaves.

## Playing the Game
Set the number of impostors you would like to play with (fixed, or percentage of players (rounded to nearest whole impostor))

The host can start the game for all connected players from the shared lobby.

All other devices are players. Once the game begins, a portion will be assigned the role of impostor (also revealing to them the other impostors playing), or a crewmate.

All players will be assigned tasks to complete, with tasks done by crewmates contributing to the task progress bar and win conditions.

To complete tasks, players will need to go around the building and scan the QR codes set up for each task and play the mini game to complete it.

Report deaths by noticing a dead player and saying that they are dead. (May need double confirmation if they have not been logged dead by the player who has died, or the impostor who killed them.)

# Author
Created by Emily Kiddle

Contact: ekkiddle@gmail.com