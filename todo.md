## Problems, somewhat ordered by importance 


* replace the cake boss (antipie) etc with cartoon style and make fight better


 * Progressively update the lock sprite to have more cracks
  
* the cake boss should not mindlessly go to the center all the time. it should just hover around the stage as a idle animation
* i dont know if cutscenes are possible in html, but if so  I would like a animation of antipie falling from the sky
* After you click the ANTIPIE program, the MGW should shake and expand to fill the entire scene. Then a animation should play where AntiPie falls from the sky and spins around before the fight starts. When the boss is defeated, the MGW should begin shrinking, and when AntiPie dies, the MGW freezes, shakes, and is then deleted showing an error message. Pressing the data again will open a new MGW for floor 2 (I suppose it can be the same MGW, but it needs to feel different)

The AntiPie boss is supposed to be difficult, not like some tutorial boss. This is because it is designed to be fought after the player went to high wave numbers to become stronger. The player will have the option to fight AntiPie on wave 10, but the boss should be extremly difficult to beat that early. With this in mind, AntiPie should likely do a lot of damage, have a lot of health, and move fast, demanding a lot of precision while still being achievable even with no items. The attacks must be designed to be consistent, such that you can dodge them repeatably as long as you react fast enough.

I need to consider how the AntiPie boss should work, like what attacks it should have.

AntiPie should have candles on each of its layers that represent health. The bottom layer will have 12 candles, the middle will have 8 and the top will have 4, for a total of 24 candles. The health bar (Explained later) is directly related to how many candles are lit; every candle represents a 1/24 percentage of health. However, the candles are not just cosmetic. They will shoot fire at Clippy during certain attacks. Lit candles should fire counterclockwise for each layer, with (initally) 0.75 seconds between each fire. However this should decrease as more candles become extinguished. Each layer should fire independly; if all of a layers candles has been expired, then no more fire will come from that layer. Due to the way this is set up, the middle and top layer will fire all candles faster than the lowest layer. 

Phase 1 (attacks from phase 1 can be used in phase 2):

Verticle Dash Attack: AntiPie bounces from the top of the area to the bottom while moving horizontally along each bounce. While AntiPie is doing this attack, all lit candles will fire at Clippy. AntiPie should only iniciate this attack when near either end of the area, and the attack should end when AntiPie ends up at the other end.

Targeted Dash Attack: AntiPie launches toward Clippy. AntiPie should bounce of the wall it collides with (after moving towards Clippy) and bounce 3-6 more times. These bounces should have a 50% of bouncing randomly, or bouncing toward Clippy. Candles do not fire.

Stationary Launching: AntiPie circles in place while playing its shooting animation. Frosting gets launched into the air, and fall back down on Clippy's last stored postion when originally launched. Yellow markers indicate where they will land. The frosting should have a 50% chance to spawn a GiftBox, and within that a 50% chance of that GiftBox being inverted. Candles fire while this happens.

Fake Dash: AntiPie dashes toward Clippy, but right before hitting Clippy AntiPie stops, and spins backwards slightly, before commiting and dashing towards Clippy.


Candle Isolation: This is more of a state than attack. When AntiPie reaches 70% health, AntiPie should dash toward the middle and initiate this state until at 55% health. The Candles on top of AntiPie's layers disassociate from AntiPie, and instead rotate the same way they were rotating on AntiPie but now in the air instead. I'm not sure exactly how to explain this, but the candles will follow AntiPie's movement reflected across the center of the area. So, if antipie is on the left, the candles will be on the right. These candles will being their fire process, and when they are done they will wait 5 seconds before firing all the candles again.

Phase 2:

Dash Launching: AntiPie dashes and bounces randomly while playing its shooting animation. Frosting gets launched into the air, and fall back down on Clippy's last stored postion when originally launched. Yellow markers indicate where they will land. The frosting should have a 50% chance to spawn a GiftBox, and within that a 50% chance of that GiftBox being inverted. Candles fire while this happens.

Candle Isolation: This is more of a state than attack. When AntiPie reaches 30% health, AntiPie should dash toward the middle and initiate this state until at 15% health. 

Cakequake: AntiPie telegraphs a heavy landing, then jumps into the air and falls onto Clippy's last positin. This spawns frosting all around AntiPie on landing.

Death: AntiPie stops current attack and begins shaking. The health bar shakes then dissapears. AntiPie begins randomly bouncing around the area, slowly at first but the speed increases by 33% each bounce. While this happens the MGW begins to shrink until the UI comes back into view again, and everything shakes progressively more. Eventually, A window with an error message will appear, and the arena will "crash". AntiPie's icon on the desktop will now appear grey (ANTIPIEDefeated.png).





After the sound effects for all floor one enemies are added, I will impliment two new enemy varients that spawn at certain wave numbers: Inverted enemies and Overheatenemies.

Inverted enemies will have inverted sprites and reverse sound effects of their normal varients. Their role is to heal other enemies.

Overheat enemies will have red/black versions of regular enemy sprites. Their role is to be extremly punishing and make it very difficult for the player to get to extremly high wave numbers.

I will likely impliment a 'Enemy Sink' change in the wave system, so that when a new enemy varient is added, the total amount of enemies decreases (quantity), and instead some of the current enemy pool gets replaced with the new varient (quality). As the waves increase from here, more of the regular enemies become replaced with the enemy varient, and slowly the total amount of enemies increase as well. After the final varient, the amount of enemies will simply increase lineraly again, which is neccesary at some point. This system would require the new enemy varient to compensate for the lower amount of enemies by adding signficant difficulty, if not instantly, at the latest in the next waves that follow.

At a certain point the wave scaling system (in its current state) will become stale, so these varients may add more variety. The waves do get harder, but mainly because of the sheer amount of enemies around you. Dying to dozens of enemies will not feel very satisfying, because at certain point you cannot do anything to live, regardless of skill. Like I said, a point like this should be reached eventually, so the player can not become endlessly strong on floor 1, but skill should play more of a part.

To determine how to fix this, we should consider what 'skill' in this specific game is actually comprised of (in rough order of complexity):
1) Ability to dodge (reaction time)
2) Aim
3) Timing (using a utility (like glowstick), item, or attack at the right moment)
4) Positioning (choosing routes, avoiding getting cornered, and keeping escape paths open)
5) Resource management (eg, deciding when to reload or spend a dash charge)
6) Good item selection
7) Enemy priortization
8) Understanding of mechanics/battle sense (These are certain things the player can use to their advantage from the enviroment, like for example hiding behind a giftbox in front of a utensil as it throws its knife, so the giftbox takes damage, or, a simple example, throwing a giftbox into a big group of enemies that contain one or more giftboxes. This is the most subtle of the list, but I have the feeling it will be the most rewarding to dedicated players.)


Using these aspects of skill in the game, we can get a better idea of how to design the Inverted and Overheat enemies to make them more skill dependent. 

The Intended purpose of the inverted enemies is to buff other enemies. Overheat enemies will have a large amount of health and damage, so later on the player must pay attention to these inverted enemies to be able to kill the overheat enemies. This could be considered as demonstrating enemy prioritization. One simple way battle sense could be incorporated is having inverted enemies also potentially heal the player. For example, the inverted Utensil will have a knife that applies repairing on whatever it hits, and the player could move or dash to get hit by it.

Inverted enemies:

Inverted enemies should have 60% less health than their normal counterparts. This should take wave scaling into consideration (For example, if the Utensil at wave 15 has 6 health, the Inverted Utensil should have 2.4 health). Any inverted enemy that heals Clippy or applies Repairing to Clippy is destroyed immediately. It counts as defeated for wave completion but drops no chips. Lowest health or most wounded means the enemy missing the most HP (not percentage, so healers gravitate to big Overheat enemies).Inverted enemies will not give Clippy health when Clippy kills them by normal means (eg, items or shooting bullets). 

In the future, I will make inverted bullets heal when reflected. Task Manager’s Nerf Process would reduce an inverted type’s heal output, in addition to everything else.

Floor 1:

Inverted Utensil (IUtensil). The fork can still target the player, but instead of stuning Clippy the Utensil will pull Clippy toward itself. In addition, if the IUtensil is near a low health enemy and a IGiftBox, it will throw that enemy to the IGiftBox. The spoon should target other low health enemies (if no low health enemies are present, it should just target the nearest one). When the spoon hits a enemy, it should apply reverse knockback (pulling the enemy closer to itself) and heal the entity it hits (including Clippy, potentially) for 25% of its max health. The knife should target other enemies, and inflinct repairing on the entity it hits. If the IUtensil accidently repairs Clippy, it should die.

Inverted GiftBox (IGiftBox). The IGiftBox's explosion radius will be green. Instead of targeting Clippy, it will move toward enemies and try to go to the area with the highest enemy density. When an entity (exluding objects) is inside its radius, it should begin its explosion animation, and when it explodes it should heal everything inside the exploson for 50% max health. Anything within the radius should have repairing applied. This is very strong so relatively to the other inverted enemies IGiftBox should spawn less. When there are no other enemies, the IGiftBox should self detonate. You can still pickup and throw IGiftBoxes (though, I'm not sure if there is a reason to).

Inverted WaterBalloon (IWaterBalloon). The IWaterBalloon should keep the wander-and-leash behavior, but the leash anchors to the most wounded enemy instead of Clippy. Instead of shooting 3 tears in quick succession, it slowly fires one large tear, that bursts into a small splash on landing and heals everything in that small radius by 10% max health, in addition to applies repairing to the entity it hits directly. It hovers around its target the way the normal balloon hovers around you, so the pairing is readable: a balloon sitting next to a hurt enemy is the one to shoot. If the IWaterBalloon accidently heals Clippy, it dies. The IWaterBalloon still does contact damage, so if no other enemies are present it will move toward Clippy.

Inverted PartyHat (IPartyHat). Like the normal version, the IPartyHat tries to find a WaterBalloon. If none are present, it should avoid the player by moving and dashing away. The IPartyHat should heal 10% of Clippy's max health on contact, and then dissapear.

The PartyHats will have interactions with the WaterBalloons:

PartyHat + WaterBalloon: Normal behavior. Keeps distance from Clippy and fires a red homing volley. 

PartyHat + IWaterBalloon: A rushing healer. It circles and charges Clippy while it shoots 3 healing tears to allies around it, and you counter it by kiting it away from the wounded. This is likely the weakest combination since it move towards the player while trying to heal allies, but it can deal contact damage.

IPartyHat + WaterBalloon: A turret/sniper. Stays far away from Clippy, and shoots from a distance, firing at Clippy from behind its allies. 

IPartyHat + IWaterBalloon: A field medic. Circles the wounded and fires 3 bursts of single homing bullets that seeks wounded enemies, and apply repairng to what it hits. 

The IPartyHat should give any WaterBalloon combinaton higher accuracy (less curving, plus higher speed.) The IPartyHat should also heal any WaterBalloon it is on by 20% max health per second. The PartyHat + IWaterBalloon combination should make the WaterBalloon shoot 3 tears at once. Or, in other words, the normal PartyHat should make any WaterBalloon varient shoot 3 tears.





- General item pool needs at least 5 more items
- Different shotgun/weapon variants could be considered, but they need to be unique while still being compatiable with items

- Enemies killed from items, like paper cuts, should heal you


- Clownish is still a bit iffy. wave radius should be expanded slightly. confused enemies should do 3x damage to other enemies (both from contact damage and bullets). confused enemies currently still dont do contact damage. cannonballs that are confused dont charge at enemies and explode. all enemeies when confused should attack other enenmies

- cannon ball charge speed should be reduced by 20%
- Clownish upgrade is placeholder

- floor 2 boss doesnt work at all, and will be completely redesigned after floor one is finished
