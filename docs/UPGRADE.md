# Upgrade

## 1.1.0 to 1.1.1

Replace the complete module directory and restart Foundry. Worlds that contain only the first two imported aquatic Actors do not need cleanup: run **Import missing Actors** once after upgrading. Version 1.1.1 preserves those two managed Actors and imports the remaining ten without duplicates.

Back up the world. Replace the complete module directory, restart Foundry, and use **Update imported Actors** when desired. Actor folder, ownership, identity, custom Items, custom Active Effects, campaign notes, and unrelated flags are preserved during updates. Only embedded Items carrying this provider's managed flags are reconciled.

Version 1.1.0 adds **Delete all imported data**. This action is not automatic. It requires GM confirmation and removes only exact module-imported Actors, exact module-imported world harvest Items, and empty folders created by this module. Disabling or uninstalling the module still leaves imported Documents intact.
