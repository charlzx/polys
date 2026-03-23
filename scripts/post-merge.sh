#!/bin/bash
set -e

# Install any new packages added by merged tasks
pnpm install --frozen-lockfile=false
