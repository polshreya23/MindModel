#!/usr/bin/env bash
set -e

echo "===================================================="
echo "  Building ModelMind C++ Engine (Linux/POSIX)       "
echo "===================================================="

mkdir -p bin
make -C "$(dirname "$0")" all
make -C "$(dirname "$0")" test
