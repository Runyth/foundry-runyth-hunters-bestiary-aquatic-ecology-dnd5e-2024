# Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 1.1.1

This patch fixes **Import missing Actors** stopping after two creatures in D&D 5e 5.3.3.

The ecology records use descriptive size names such as `large` and `gargantuan`, while D&D 5e 5.3.3 Actor data requires compact keys such as `lg` and `grg`. The first two records are Huge creatures, for which `huge` is already a valid native key; the third record is Large and caused the system's NPC pre-create size routine to fail.

Version 1.1.1 converts every descriptive size to the native D&D key and writes the matching prototype-token width and height. A fresh import now creates all twelve Actors. Worlds left with the two-Actor partial state can simply run **Import missing Actors** again: the two existing managed Actors are skipped and the remaining ten are imported without duplicates.
