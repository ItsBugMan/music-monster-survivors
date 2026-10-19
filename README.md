# Music Monster — Survivors: Lost Frequencies

**Turn your music collection into monsters. Build an elemental arsenal. Survive the charts.**

Music Monster is a single-player, music-driven survival action game inspired by the Vampire Survivors style of play. Songs become procedurally generated creatures, chart entries become enemies and bosses, and every run helps your chosen creature grow stronger.

**[Play in your browser](https://itsbugman.github.io/music-monster-survivors/)** · [Download the repository](https://github.com/ItsBugMan/music-monster-survivors/archive/refs/heads/main.zip)

The current build includes four 30-minute stages, unlockable Endless modes, 24 weapons with evolutions, 12 passive items, a permanent Gold Shop, transferable saves, a switchable 2D / 2.5D / 3D camera, and seven embedded BGM tracks.

## Quick start

1. Open the game link above, or download and extract the repository and open **index.html** in a modern browser.
2. Choose **Play Without Last.fm** (at the top of the page) for an immediate game. Alternatively, enter your Last.fm username and use **Meet your creatures** to load your music collection.
3. Select a creature, stage, and enemy chart. A dual-element creature lets you choose which of its two signatures to start with.
4. Move to avoid enemies while your weapon attacks automatically. Collect XP gems and choose upgrades.
5. Survive the full 30-minute timer to clear a stage. Spend earned gold in the shop and keep developing your creatures between runs.

Play Without Last.fm has its own roster and stage progress; the permanent Gold Shop uses the shared browser profile. You do not need a Last.fm account to try the game.

Its roster has 28 creatures, all starting at level 1: nine elemental starters and 19 genre creatures (Rock, Pop, Metal, Rap, Country, Jazz, Classical, EDM, Punk, Reggae, Blues, Soul, Folk, K-Pop, Lo-fi, Funk, Latin, Synthwave, Gospel). Each has generated pixel art with a matching prop, and uses the normal elements, classes, passives and stat modifiers. Metal and Punk are Anarchists.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Pointer/touch movement | Press and drag inside the arena |
| Attack | Automatic; no attack button required |
| Pause/resume | P, Escape, or the Pause button |
| Cycle view 2D → 2.5D → 3D | V or the View button (or pick a view in Pause → Camera view) |
| 3D camera: rotate / tilt | Q / E rotate, R / F tilt, or right-drag (on-screen ⟲ ⟳ Tilt buttons for touch) |
| 3D camera: zoom / reset | Mouse wheel or + / −, C or Reset |
| Select rewards | Click or tap a reward |
| Inspect evolution requirements | Pause → Build & evolution guide |
| End a run early | Pause → End run |
| Audio | Music/SFX toggles and separate volume sliders |

Switching tabs or losing window focus pauses active gameplay. Reward and chest screens also interrupt the action while you make a choice.

## Your music becomes your roster

Each creature represents a song and artist, with generated pixel art, elements, a class, base stats, and applicable faction/song traits. Album metadata and saved cover data remain associated with the collection and still feed creature generation, but album cover images are not shown in the interface.

The character generator remains a data provider: gameplay systems consume its output without changing the underlying generator. Creature progression is tracked by normalized song title and artist.

### Stats and classes

Creature stats affect gameplay:

| Stat | Combat role |
| --- | --- |
| HP | Starting maximum health |
| ATK | Weapon damage multiplier |
| DEF | Damage reduction |
| SPD | Movement speed |
| LCK | Critical-hit chance |

**Guardian** adds starting health, **Brawler** adds damage, **Sprinter** adds movement speed, and **Trickster** adds critical-hit chance. Generated individual stat modifiers apply in combat, with a modifier range of −20% to +35%. Anarchist creatures also receive +4 percentage points of critical-hit chance. The creature selection screen shows the resulting starting combat profile.

There is one controlled creature per run; there is no support-party system. Single- and dual-element creatures both start with **one weapon**. Dual elements provide a starting-signature choice, not a second free attack. All weapons can appear in the reward pool regardless of your creature's element.

Special generated passives, when present, include:

| Passive | Effect |
| --- | --- |
| Encore | One revival per run at 25% HP |
| Showstopper | First signature volley deals double damage |
| Mic Drop | Every fourth signature volley gains 35% damage |
| Untouchable | 8% chance to dodge an incoming hit |
| Ovation | A signature volley heals 1.5% maximum HP, at most once per 8 seconds |

## Stages and Endless mode

| Stage | Setting | Standard duration |
| --- | --- | --- |
| Midnight Gardens | Moonwells, witchwood, and forgotten ruins | 30 minutes |
| Static Cathedral | Courtyards, vaults, and signal organs | 30 minutes |
| The Final Frequency | Reactors, ash fields, and broken antennas | 30 minutes |
| Neon Boulevard | A gridlocked city street grid: towers, wrecked cars, street lamps, plazas | 30 minutes |
| Sunset Shores | Palm groves, tide channels, beach umbrellas, and a sunset lighthouse | 30 minutes |
| Harvest Hollow | Hay bales, silos, orchard rows, and an old red barn | 30 minutes |

Stages 1–3 are large, bounded 4,800 × 3,600 worlds with obstacles, landmarks, breakable crates, and pickups. **Neon Boulevard** is roughly twice that area (6,800 × 5,100): a street grid centred on your start point, with lit towers, parked cars and street lamps as obstacles, plazas at intersections, and the Gridlock King as its guardian. It unlocks after clearing The Final Frequency. **Sunset Shores** is the same 6,800 × 5,100 size: sandy ground cut by shallow tide channels, with palm trees, striped beach umbrellas and boulders as obstacles, and the Tidebreaker as its guardian. It unlocks after clearing Neon Boulevard. **Harvest Hollow** is the same 6,800 × 5,100 size: grassy fields cut by dirt paths, with hay bales, orchard trees, silos and boulders as obstacles, and the Scarecrow King as its guardian. It unlocks after clearing Sunset Shores. Clear a stage to unlock its Endless mode and, where applicable, the next stage.

**Endless** repeats the stage's 30-minute wave cycle with increasing enemy health, damage, and spawn pressure. You keep your current build between cycles. The goal is to survive as long as possible; best Endless survival time is recorded per stage.

Enemy health grows faster in later waves, with additional stage and Endless scaling. Damage, movement, and spawn pressure also rise. Permanent upgrades make you stronger; enemies do not automatically copy your purchased power.

## Chart-based enemies and bosses

Before starting a run, choose **Last.fm US**, **Last.fm Global**, or **Apple Music US** as the enemy chart. The game prepares a snapshot at run start, so a chart refresh cannot change enemy identities halfway through the run.

Higher chart positions mean stronger enemies: #100 is near the weak end, while #4–10 produce elite threats. Rank affects health, damage, speed, size, and XP rewards. Song identity determines the generated creature appearance and helps select its enemy archetype.

| Pool | Chart ranks | First available at elapsed time |
| --- | --- | --- |
| A | #100–90 | 0:00 |
| B | #89–70 | 4:00 |
| C | #69–45 | 9:00 |
| D | #44–25 | 14:00 |
| E | #24–11 | 19:00 |
| F | #10–4 | 24:00 |

Newly available tiers receive more spawn weight, while earlier tiers can continue appearing. Partial charts use available entries without inventing chart positions. Ranks #1–3 are reserved for bosses.

### Chart headliners

Boss encounters are scheduled at elapsed minutes **5, 10, 15, 20, 25, and 29** in each cycle. The boss system uses designated top-three entries from Apple Music US and Last.fm US, working toward the top-ranked headliners. This boss rotation is separate from the regular-enemy chart selector.

Bosses are larger generated creatures with elemental attacks. The normal soundtrack keeps playing when a boss spawns; there is no boss entrance music.

If chart services fail or time out, original enemy waves and guardians stand in.

## Building a run

Every run starts at temporary run level 1 with one signature weapon. Enemy XP gems fill the run XP bar; leveling presents three reward choices, sometimes four depending on luck. You can add weapons, improve owned weapons, or take passive items.

- **6 weapon slots**, with each weapon leveling to **8** before evolution.
- **6 passive-item slots**, with each passive leveling to **5**.
- **3 rerolls, 3 skips, and 3 banishes** per run.
- Reroll changes the choices; skip continues without taking one; banish removes an item from later reward pools for that run.
- When no eligible item upgrades remain, rewards can offer health or gold.

Weapons, passive items, and this temporary run level reset when starting a new run. Permanent creature levels, listening buffs, and Gold Shop purchases remain.

### Elemental signatures

| Element | Signature | Behavior |
| --- | --- | --- |
| Fire | Inferno Bloom | Explosive fireballs leave burning ground. |
| Storm | Chain Tempest | Lightning jumps between nearby enemies. |
| Shadow | Void Needles | Piercing shadow bolts curse enemies, increasing subsequent damage. |
| Earth | Avalanche | Heavy boulders pierce and knock enemies back. |
| Air | Cyclone Blades | Spinning blades slice through enemies and return to you. |
| Light | Solar Lance | Fast beams pierce entire lines of enemies. |
| Water | Glacial Fan | A spread of icy shards slows enemies; evolved shards freeze. |
| Spirit | Soul Seekers | Homing spirits chase enemies; evolved spirits heal on a kill. |

### All weapons and evolution recipes

To evolve a weapon, reach **weapon level 8**, own **at least one rank** of its matching passive, and collect an **evolution-capable chest**. Early chests cannot evolve weapons. Enemies spawned from elapsed minute 10 onward can have evolution-eligible chest drops; not every enemy drops a chest. If multiple recipes qualify, a qualifying chest chooses one.

| Element | Weapon | Required passive | Evolution |
| --- | --- | --- | --- |
| Fire | Inferno Bloom | Resonance Lens | Supernova Bloom |
| Storm | Chain Tempest | Split Record | Endless Tempest |
| Shadow | Void Needles | Sustain Pedal | Oblivion Needles |
| Earth | Avalanche | Shell Case | Worldbreaker |
| Air | Cyclone Blades | Tempo Coil | Hurricane Blades |
| Light | Solar Lance | Amplifier | Daybreak Lance |
| Water | Glacial Fan | Metronome | Absolute Zero |
| Spirit | Soul Seekers | Heartstring | Requiem Seekers |
| Fire | Cinder Halo | Sustain Pedal | Crown of Cinders |
| Fire | Volcanic Chorus | Resonance Lens | Caldera Symphony |
| Storm | Static Cage | Sustain Pedal | Storm Prison |
| Storm | Thunder Spear | Split Record | Heaven Splitter |
| Shadow | Gravity Well | Magnetic Pickup | Event Horizon |
| Shadow | Doom Chorus | Lucky Pressing | Final Hex |
| Earth | Fault Line | Resonance Lens | Continental Rift |
| Earth | Stone Mantle | Shell Case | Living Mountain |
| Air | Wandering Cyclone | Tempo Coil | Eye of the Storm |
| Air | Repelling Gust | Tour Boots | Skybreaker |
| Light | Prismatic Wheel | Split Record | Infinite Spectrum |
| Light | Sanctuary | Heartstring | Dawn Cathedral |
| Water | Tidal Sweep | Resonance Lens | Ocean Requiem |
| Water | Hailstorm | Metronome | Whiteout |
| Spirit | Phantom Pack | Sustain Pedal | Ghost Orchestra |
| Spirit | Soul Tether | Discovery Tape | Soul Conductor |

Chests otherwise upgrade owned items, can grant multiple rewards, and award gold. Luck improves the chance of multi-reward chests.

### Run passive items

These occupy passive slots and last for the current run. They are separate from permanent Gold Shop upgrades, even when names are similar.

| Passive | Effect |
| --- | --- |
| Amplifier | +10% damage per rank. |
| Metronome | -8% weapon cooldown per rank. |
| Resonance Lens | +10% attack area per rank. |
| Sustain Pedal | +15% effect duration per rank. |
| Tempo Coil | +10% projectile speed per rank. |
| Split Record | +1 projectile at ranks 2 and 5. |
| Tour Boots | +10% movement speed per rank. |
| Magnetic Pickup | +25 pickup range per rank. |
| Heartstring | +0.2 HP regeneration per second per rank. |
| Shell Case | -1 incoming damage per rank. |
| Discovery Tape | +8% experience per rank. |
| Lucky Pressing | +8% luck per rank; better choices and chests. |

### Pickups and crates

| Pickup | Effect |
| --- | --- |
| Health | Restores up to 35 HP |
| XP magnet | Pulls in existing XP gems and grants a brief magnet effect |
| Prism Shield | 5 seconds of invulnerability |
| Overture | 12 seconds of faster movement and attacks |
| Screen Break | Blasts nearby enemies |
| XP pickup | Grants run XP, affected by XP growth |
| Chest | Item upgrades, gold, and eligible evolutions |

Breakable crates release useful loot. Movement, positioning, and gathering resources matter as much as raw damage.

## Three kinds of lasting progression

### 1. Creature XP and levels

**Playing runs levels your chosen creature. Passive listening does not award creature XP.** Survival time, kills, and completing a stage contribute to permanent creature XP, including rewards earned during unsuccessful runs.

The creature level cap is **100**. The XP needed to advance from level L is:

`ceil(300 × 1.085^(L − 1))`

| Creature level | Total XP required |
| --- | ---: |
| 1 | 0 |
| 25 | 21,487 |
| 50 | 188,697 |
| 100 | 11,353,069 |

Run XP rewards are based on survival seconds, 1.5 XP per kill (with the kill contribution capped at six XP per survival second), and a 1,200 XP stage-clear bonus. This is distinct from the gems that buy temporary upgrades during combat.

Each creature level beyond 1 contributes +0.85 to starting HP before the applicable multipliers and +0.9% to the level-based damage multiplier. The steep curve makes level 100 a long-term goal.

### 2. Listening buffs

Last.fm scrobble totals grant permanent bonuses to the matching creature: up to **+25% HP, +20% damage, and +6% movement speed**. These use diminishing returns rather than unlimited linear growth.

The game uses recorded scrobble counts, not estimated listening minutes. It retains the highest observed count, so a lower or missing later count does not remove earned buffs. Listening bonuses stack with creature progression and shop upgrades.

### 3. Gold Shop

Gold earned during runs goes into a global browser-profile balance. Buy permanent upgrades from **Gold Shop** on the creature-selection screen. Purchases apply to every creature on subsequent runs.

| Upgrade | Per rank | Maximum ranks | First rank price |
| --- | --- | ---: | ---: |
| Vitality | +4% maximum HP | 10 | 180 gold |
| Amplifier | +3.5% damage | 10 | 240 gold |
| Resonance | +4% attack area | 8 | 220 gold |
| Tempo | +2.5% movement speed | 5 | 300 gold |
| Royalties | +5% run gold | 10 | 200 gold |

Each next price is rounded up from the base price multiplied by 1.65 to the number of ranks already purchased. Run gold combines in-run gold, survival time, kills, and a stage-clear bonus; Royalties increases the payout.

## Last.fm attribution

This game uses data from the Last.fm API. A "Music data powered by Last.fm" credit linking to https://www.last.fm is shown on the page, creature cards link each artist name to its Last.fm artist page, and Last.fm-sourced chart headliners link to their Last.fm track page. Please keep this attribution in place when hosting or modifying the game.

## Saves, album data, and moving between devices

Progress is saved locally in the browser. There is no automatic cloud-save synchronization.

Saved data includes creature XP, gold, shop purchases, listening totals and buffs, saved collections, favorites, album metadata and stored cover data, stage/Endless unlocks, and sound/view settings.

**Export:** Creature selection → **Export Save Data**. Keep the downloaded JSON as a backup.

**Import:** Creature selection → **Import Save Data** → choose the JSON file or paste its contents → **Validate save** → review the summary → **Back up current save & import**. Import replaces the destination browser profile, then reloads the collection.

The transfer format is versioned and validates data before applying it. The current import limit is 20 MB. Stored cover pixels are included; artwork saved only as an external URL still depends on that URL remaining available. API credentials and unrelated browser storage are excluded.

Run rewards checkpoint every 30 seconds and when leaving or finishing a run. **These checkpoints save earned rewards, not the battlefield. You cannot resume an interrupted run at its previous position.**

Browser storage is specific to the browser profile and site origin. A local HTML copy and GitHub Pages may have separate saves. Export/import is the way to transfer progress between them. Clearing site data or using a temporary/private session can remove local progress; keep exported backups. Storage-full errors are shown in the game.

## Camera and visual effects

The game starts in a traditional 2D view. **V** (or the **View** button) cycles **2D → 2.5D → 3D**; the Pause menu also has a direct 2D / 2.5D / 3D picker. Your last choice is remembered and included in save export/import.

- **2D**: fixed top-down orthographic camera.
- **2.5D**: lowered perspective camera. Characters render as billboards, while attacks use projected elevation, trails, columns, impact effects, and ground effects. Unchanged by the 3D addition.
- **3D**: a real WebGL scene with a free perspective camera (yaw, pitch, zoom), a depth buffer, a moonlight shadow map that follows you, and point lights from your signature effects. Obstacles, crates, pickups, landmarks and projectiles are 3D solids. Your creature and chart headliners are extruded into voxel slabs from the pixel art the generator already produced; chart enemies are camera-facing sprite planes (with silhouette shadows) using the same art. WASD / drag movement becomes relative to the 3D camera heading.

Switching views cross-fades with a camera dolly. Camera changes affect presentation only, never movement coordinates, hitboxes, weapon range, or creature stats. If WebGL is unavailable (or its context is lost), 3D is skipped and the game stays in 2D/2.5D.

## Music and sound

Seven high-quality VBR MP3 tracks are embedded directly in the HTML. Each run begins at track 1, plays them in order, and loops the playlist after track 7:

1. Breakneck Event Horizon
2. Bullet Storm Loop
3. Cathedral of Crimson Rain
4. Hollow Midnight Pulse
5. Iron Heart Assembly
6. Neon Overdrive Protocol
7. Shrine of Falling Stars

The previous single-track BGM has been replaced. Music and sound effects have independent toggles and volume controls. BGM follows gameplay pause/resume.

Browsers may require a click before allowing audio. Start a run or interact with the music controls if playback is blocked. No companion audio folder is needed for this release.

## Results screen

At the end of a run, review survival time, kills, final run level, creature XP gained, and gold banked. The detailed breakdown includes damage, DPS, damage taken, healing, critical hits, bosses/elites defeated, pickups, chests, crates, dodges, revivals, final loadout, and per-weapon performance.

Damage counts actual enemy HP removed rather than overkill. Healing excludes overhealing and revival HP. Use these results to compare builds, retry, choose another creature, or enter an unlocked stage or Endless mode.

## Running and hosting the game

This repository contains the playable release:

| File | Purpose |
| --- | --- |
| index.html | Main browser and GitHub Pages entry point |
| Music_Monster_Survivors.html | Alternate standalone entry point with the same game |
| .nojekyll | Keeps the deployment as plain static files |
| README.md | Player guide and release documentation |
| src/ | Readable sources of the view-mode state machine, 3D renderer and the game-script integration block (already bundled into both HTML files) |

There is no package installation or build step for these release files. JavaScript, styles, generated-game assets, and the BGM are bundled into the HTML. Each entry file is approximately 49 MB, so the first download can take time.

For GitHub Pages, use **Settings → Pages → Deploy from a branch → main → /(root)**. The game uses relative/site-safe resources rather than machine-specific paths.

Play Without Last.fm and bundled music can run locally without a chart connection. Last.fm collection loading, fresh charts, and external cover URLs need their online services. A service outage or browser restriction may affect those features while fallback gameplay remains available.

## Troubleshooting

- **The page seems unchanged after an update:** reload without cache, or verify you opened the current index.html rather than an older downloaded copy.
- **First load takes a while:** the self-contained build includes the full soundtrack. Let the download finish.
- **No music:** check Music is on and the volume is above zero; click a game control to allow audio playback.
- **Charts will not load:** use the fallback waves, retry Reload chart bosses, or try another enemy chart.
- **My collection is unavailable:** check the username and network connection, or use Play Without Last.fm.
- **Progress differs between local and web versions:** export the save from the version holding your progress, then import it into the other.
- **A run restarted after closing the tab:** only its earned progression is checkpointed; live runs are not resumable.

## Implementation notes

The current release keeps the original creature generator intact and layers gameplay adapters around it: chart snapshots and tiered enemy pools, camera projection and attack depth, a three-state view controller (`MMSViewMode`) and a read-only WebGL 3D renderer (`MMSRender3D`, bundled three.js r149), run rewards and permanent progression, save validation/import/export, and sequential audio playback.

The repository ships bundled release HTML rather than the full modular development workspace. Changes to the game should keep both HTML entry points synchronized. Automated checks have covered playlist lifecycle, audio decoding, chart spawning, progression/save handling, weapon rendering, and script parsing; full browser/device performance coverage is still limited.
