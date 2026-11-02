# Release Notes 1.3.5

Fixes startup package validation crashes caused by null or otherwise malformed cross-module records. The validator now emits structured issues instead of dereferencing invalid values, while the corrected Aquatic Ecology 1.2.4 dependency prevents hidden species from becoming null in the first place.
