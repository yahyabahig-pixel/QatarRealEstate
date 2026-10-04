# Vendored browser scripts

Files here are served from this site's own origin at `/vendor/...`.

## mapbox-gl-rtl-text.min.js

`@mapbox/mapbox-gl-rtl-text` v0.2.3, copied verbatim from the npm tarball.

MapLibre loads this one file by URL at runtime — `setRTLTextPlugin(url)` takes a URL, not
a module — so it cannot go through the bundler like everything else. It used to be fetched
from `unpkg.com`, which put a third-party script inside the admin panel, where the admin's
session token lives. Serving it from here removes that.

It shapes Arabic and other right-to-left labels on the map. Without it those labels render
as disconnected letters in the wrong order.

Licence: BSD-2-Clause, see `mapbox-gl-rtl-text.LICENSE.md`.

### Updating it

    npm pack @mapbox/mapbox-gl-rtl-text@<version>
    tar xzf mapbox-mapbox-gl-rtl-text-<version>.tgz
    cp package/mapbox-gl-rtl-text.min.js  frontend/public/vendor/
    cp package/LICENSE.md                 frontend/public/vendor/mapbox-gl-rtl-text.LICENSE.md

Then check the map still shows Arabic place names correctly.
