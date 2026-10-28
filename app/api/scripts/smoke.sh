#!/bin/sh
# After `docker compose up -d --build`: checks the site, the API and TLS from outside.
# Usage: scripts/smoke.sh naqi.example api.naqi.example   (extra curl flags via CURL_OPTS)
set -uf  # -f: CURL_OPTS may hold a literal *
WEB=${1:?site domain}; API=${2:?api domain}
fail=0
check() { # name, expected, actual
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1 (want $2, got $3)"; fail=1; fi
}
code() { curl -s $CURL_OPTS -o /dev/null -w '%{http_code}' "$@"; }
CURL_OPTS=${CURL_OPTS:-}

check "site home"            200 "$(code "https://$WEB/")"
check "site arabic page"     200 "$(code "https://$WEB/faq")"
check "www redirects"        301 "$(code "https://www.$WEB/")"
check "http -> https"        308 "$(code "http://$WEB/")"
check "api health"           200 "$(code "https://$API/health")"
check "api docs"             200 "$(code "https://$API/v1/docs")"
check "internal not exposed" 404 "$(code "https://$API/internal/relay")"
check "admin needs token"    401 "$(code "https://$API/v1/admin/stats")"
cors=$(curl -s $CURL_OPTS -o /dev/null -D - -X OPTIONS "https://$API/v1/media/resolve" \
  -H "Origin: https://$WEB" -H "Access-Control-Request-Method: POST" | tr -d '\r' | grep -i '^access-control-allow-origin:' | cut -d' ' -f2)
check "cors allows site"     "https://$WEB" "$cors"
home=$(curl -s $CURL_OPTS "https://$WEB/")
if [ -z "$home" ]; then echo "FAIL site home is empty"; fail=1
elif printf '%s' "$home" | grep -q "Demo mode\|وضع تجريبي"; then echo "FAIL site still on demo data (rebuild web with PUBLIC_API_BASE)"; fail=1
else echo "ok   site uses real API"; fi
exit $fail
