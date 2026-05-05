# Impostors
This project was inspired by AmongUs, but I wanted to be able to play a game like that in person, with my friends. So, I am using a web-based React front end framework that will be hosted online, in conjunction with a supabase database for storing game state and information. This is a migration from the previous P2P architecture, since a real-time database is more reliable and scalable in the real world.

## Running the build
Do it as you would any other react project

```bash
npm run start
```

Connect clients and peers. One device must act as the host (please do not disconnect the host or refresh the browser, or there will be clear problems and will result in nobody being able to play the game (everyone will be disconnected)). I'll leave an opportunity for reconnect though.

## Playing the Game
Set the number of impostors you would like to play with (fixed, or percentage of players (rounded to nearest whole impostor))

A single device will act as the host device, which manages connections between all peers. This also displays the status and names of all players in lobby (disconnections, alive/dead, name, color, etc.)

All other devices are players. Once the game begins, a portion will be assigned the role of impostor (also revealing to them the other impostors playing), or a crewmate.

All players will be assigned tasks to complete, with tasks done by crewmates contributing to the task progress bar and win conditions.

To complete tasks, players will need to go around the building and scan the QR codes set up for each task and play the mini game to complete it.

Report deaths by noticing a dead player and saying that they are dead. (May need double confirmation if they have not been logged dead by the player who has died, or the impostor who killed them.)

# Author
Created by Emily Kiddle

Contact: ekkiddle@gmail.com