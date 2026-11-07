@echo off
REM ModelMind C++ Engine Build Script for Windows (MinGW/G++)
echo ====================================================
echo  Building ModelMind C++ Engine for Windows (MinGW)
echo ====================================================

if not exist bin mkdir bin

g++ -std=c++14 -O2 -Wall -Wextra -static -static-libgcc -static-libstdc++ -Iinclude -Iinclude/external -o bin\modelmind_engine.exe src\main.cpp src\HashTable.cpp src\Trie.cpp src\MaxHeap.cpp src\Graph.cpp src\Algorithms.cpp
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Windows engine built at bin\modelmind_engine.exe
) else (
    echo [ERROR] Build failed! Ensure MinGW GCC 6.3.0 is in your Windows PATH.
    exit /b %ERRORLEVEL%
)

echo Building C++ DSA Unit Tests...
g++ -std=c++14 -O2 -Wall -Wextra -static -static-libgcc -static-libstdc++ -Iinclude -Iinclude/external -o bin\test_dsa.exe tests\test_dsa.cpp src\HashTable.cpp src\Trie.cpp src\MaxHeap.cpp src\Graph.cpp src\Algorithms.cpp
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Test runner built at bin\test_dsa.exe
    echo Running unit tests:
    bin\test_dsa.exe
) else (
    echo [ERROR] Test build failed!
)
