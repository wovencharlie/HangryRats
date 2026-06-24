RAT CHARACTER — drop-in slot
============================

The rat projectile is currently a procedural placeholder. To use your own rat:

1. Export a transparent-background PNG of the rat, roughly square, ~512x512,
   facing RIGHT (the direction it launches), centered with a little padding.
   Save it here as:  rat.png

2. Tell me it's in, and I'll wire it in (it needs a small per-use sizing pass:
   the held rat, the in-flight rat, the ammo icons, and the menu hero all
   display the rat at different sizes).

Optional: if you have variants for the other rat types (a bigger "tank" rat, a
speckled one, a small mouse), drop them as rat_tank.png / rat_speckled.png /
rat_mouse.png and I'll map them to the four ammo types. Otherwise I'll derive
them from the single rat.png (tint/scale).
