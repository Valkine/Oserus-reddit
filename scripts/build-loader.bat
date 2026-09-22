@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo Compiling Delia Native C++ Loader (x64)
echo ===================================================

if not exist "build" mkdir "build"

REM Setup MSVC x64 Environment
set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if not exist "!VCVARS!" (
    set "VCVARS=C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
)
if not exist "!VCVARS!" (
    echo [ERROR] vcvars64.bat not found in expected Visual Studio directories.
    exit /b 1
)

call "!VCVARS!" >nul
if errorlevel 1 (
    echo [ERROR] Failed to initialize MSVC 64-bit environment.
    exit /b 1
)

echo Compiling src/native-loader/main.cpp...
cl.exe /nologo /O2 /W3 /GR- /GS /std:c++17 /EHsc ^
    /Fe:"build\OserusLoader.exe" ^
    /Fo:"build\main.obj" ^
    "src\native-loader\main.cpp" ^
    /link /SUBSYSTEM:WINDOWS ^
    winhttp.lib crypt32.lib advapi32.lib user32.lib shell32.lib gdi32.lib

if errorlevel 1 (
    echo [ERROR] Compilation failed.
    exit /b 1
)

echo [SUCCESS] OserusLoader.exe compiled successfully to build\OserusLoader.exe
exit /b 0
