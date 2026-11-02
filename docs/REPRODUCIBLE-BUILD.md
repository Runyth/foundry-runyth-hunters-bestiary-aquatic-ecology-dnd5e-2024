# Reproducible Build

Run `npm run build` with Node 22.13+ and Python 3. Validation and tests run before deterministic archives are written with sorted files and fixed timestamps. The install ZIP contains runtime files only. The source ZIP excludes `dist/` and rebuilds the same install ZIP byte-for-byte.