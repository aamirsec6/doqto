#!/bin/sh
set -e
npx prisma migrate deploy
echo "STARTING_NEXT on PORT=${PORT:-3000}"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
