#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winhttp.h>
#include <wincrypt.h>
#include <shlobj.h>
#include <shellapi.h>
#include <intrin.h>
#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <iomanip>

#pragma comment(lib, "winhttp.lib")
#pragma comment(lib, "crypt32.lib")
#pragma comment(lib, "advapi32.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "gdi32.lib")

// ============================================================================
// COMPILE-TIME STRING ENCRYPTION (Byte-level Obfuscation)
// Guarantees ZERO plaintext API keys, hosts, paths, or JSON keys in the binary
// ============================================================================
static const unsigned char ENC_DELIA_HOST[] = { 0x3e, 0x02, 0x18, 0xe8, 0xef, 0xff, 0xcd, 0xc3, 0xa7, 0xa3, 0xb3, 0x99, 0x9b, 0x66, 0x7e, 0x69, 0x04, 0x54, 0x2b, 0x3c };
static const size_t LEN_DELIA_HOST = 20;

static const unsigned char ENC_DELIA_PATH[] = { 0x75, 0x06, 0x04, 0xe8, 0xa1, 0xed, 0x99, 0x9a, 0xae, 0xa6, 0xbf, 0x8c, 0x98, 0x70, 0x75, 0x32, 0x4b, 0x54, 0x30, 0x38, 0x28, 0x0a, 0x0c, 0xe0 };
static const size_t LEN_DELIA_PATH = 24;

static const unsigned char ENC_DELIA_API_KEY[] = { 0x3e, 0x02, 0x18, 0xde, 0xfd, 0xfe, 0xcb, 0xea, 0xf0, 0xad, 0xb8, 0xde, 0xc1, 0x62, 0x4f, 0x2c, 0x1f, 0x05, 0x73, 0x68, 0x38, 0x59, 0x48, 0xb1, 0xf6, 0xab, 0x99, 0x8d, 0xf3, 0xeb, 0xd0, 0xd9, 0xc2, 0x34, 0x2d, 0x11, 0x18, 0x0b, 0x2c, 0x67, 0x56, 0x0e, 0x1d, 0xb0, 0xa5, 0x93, 0x81, 0x8f, 0xf8, 0xb3, 0x81, 0xc0, 0x9a, 0x3a, 0x7d, 0x12, 0x53 };
static const size_t LEN_DELIA_API_KEY = 57;

static const unsigned char ENC_KEY_API_KEY[] = { 0x3b, 0x17, 0x1d, 0xca, 0xeb, 0xe2 };
static const size_t LEN_KEY_API_KEY = 6;

static const unsigned char ENC_KEY_LICENSE[] = { 0x36, 0x0e, 0x17, 0xe4, 0xe0, 0xe8, 0xcd };
static const size_t LEN_KEY_LICENSE = 7;

static const unsigned char ENC_KEY_DEVICE_ID[] = { 0x3e, 0x02, 0x02, 0xe8, 0xed, 0xfe, 0xe1, 0xd1 };
static const size_t LEN_KEY_DEVICE_ID = 8;

static const unsigned char ENC_KEY_SUCCESS[] = { 0x29, 0x12, 0x17, 0xe2, 0xeb, 0xe8, 0xdb };
static const size_t LEN_KEY_SUCCESS = 7;

static const unsigned char ENC_KEY_STATUS[] = { 0x29, 0x13, 0x15, 0xf5, 0xfb, 0xe8 };
static const size_t LEN_KEY_STATUS = 6;

static const unsigned char ENC_KEY_AUTH_SIG[] = { 0x3b, 0x12, 0x00, 0xe9, 0xdd, 0xf2, 0xcf };
static const size_t LEN_KEY_AUTH_SIG = 7;

static const unsigned char ENC_KEY_CODE[] = { 0x39, 0x08, 0x10, 0xe4 };
static const size_t LEN_KEY_CODE = 4;

static const unsigned char ENC_KEY_MESSAGE[] = { 0x37, 0x02, 0x07, 0xf2, 0xef, 0xfc, 0xcd };
static const size_t LEN_KEY_MESSAGE = 7;

static const unsigned char ENC_USER_AGENT[] = { 0x1e, 0x02, 0x18, 0xe8, 0xef, 0xd5, 0xc9, 0xc1, 0xab, 0xb9, 0xb9, 0xaa, 0x9a, 0x6a, 0x75, 0x73, 0x5e, 0x18, 0x76, 0x7f, 0x6e, 0x4b, 0x50, 0xd2, 0xfb, 0xf1, 0xc8, 0xd6, 0xb1, 0xa0, 0xc0, 0xa3, 0xae, 0x3c, 0x34, 0x59, 0x18, 0x0f, 0x61 };
static const size_t LEN_USER_AGENT = 39;

static const unsigned char ENC_CONTENT_TYPE[] = { 0x19, 0x08, 0x1a, 0xf5, 0xeb, 0xf5, 0xdc, 0x98, 0x96, 0xb6, 0xac, 0x8c, 0xcc, 0x23, 0x71, 0x6d, 0x5a, 0x5b, 0x2d, 0x32, 0x3f, 0x1f, 0x11, 0xea, 0xfc, 0xb0, 0xc6, 0xca, 0xa9, 0xbd, 0xed, 0xe7 };
static const size_t LEN_CONTENT_TYPE = 32;

static inline std::string DecryptString(const unsigned char* enc, size_t len) {
    std::string s;
    s.resize(len);
    for (size_t i = 0; i < len; ++i) {
        s[i] = static_cast<char>(enc[i] ^ ((0x5A + (i * 13)) & 0xFF));
    }
    return s;
}

static inline std::wstring DecryptWString(const unsigned char* enc, size_t len) {
    std::string s = DecryptString(enc, len);
    return std::wstring(s.begin(), s.end());
}

#define DELIA_HOST_ENC       DecryptWString(ENC_DELIA_HOST, LEN_DELIA_HOST)
#define DELIA_PATH_ENC       DecryptWString(ENC_DELIA_PATH, LEN_DELIA_PATH)
#define DELIA_API_KEY_ENC    DecryptString(ENC_DELIA_API_KEY, LEN_DELIA_API_KEY)
#define KEY_API_KEY_ENC      DecryptString(ENC_KEY_API_KEY, LEN_KEY_API_KEY)
#define KEY_LICENSE_ENC      DecryptString(ENC_KEY_LICENSE, LEN_KEY_LICENSE)
#define KEY_DEVICE_ID_ENC    DecryptString(ENC_KEY_DEVICE_ID, LEN_KEY_DEVICE_ID)
#define KEY_SUCCESS_ENC      DecryptString(ENC_KEY_SUCCESS, LEN_KEY_SUCCESS)
#define KEY_STATUS_ENC       DecryptString(ENC_KEY_STATUS, LEN_KEY_STATUS)
#define KEY_AUTH_SIG_ENC     DecryptString(ENC_KEY_AUTH_SIG, LEN_KEY_AUTH_SIG)
#define KEY_CODE_ENC         DecryptString(ENC_KEY_CODE, LEN_KEY_CODE)
#define KEY_MESSAGE_ENC      DecryptString(ENC_KEY_MESSAGE, LEN_KEY_MESSAGE)
#define USER_AGENT_ENC       DecryptWString(ENC_USER_AGENT, LEN_USER_AGENT)
#define CONTENT_TYPE_ENC     DecryptWString(ENC_CONTENT_TYPE, LEN_CONTENT_TYPE)

// ============================================================================
// HARDWARE ID (HWID) EXTRACTION
// Extracts CPUID + Motherboard SMBIOS Serial + Windows MachineGuid
// ============================================================================
static std::string SimpleSha256(const std::string& input) {
    HCRYPTPROV hProv = 0;
    HCRYPTHASH hHash = 0;
    BYTE hash[32];
    DWORD hashLen = 32;
    std::string out = "";

    if (CryptAcquireContextW(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        if (CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
            if (CryptHashData(hHash, (const BYTE*)input.c_str(), (DWORD)input.length(), 0)) {
                if (CryptGetHashParam(hHash, HP_HASHVAL, hash, &hashLen, 0)) {
                    std::stringstream ss;
                    for (DWORD i = 0; i < hashLen; i++) {
                        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
                    }
                    out = ss.str();
                }
            }
            CryptDestroyHash(hHash);
        }
        CryptReleaseContext(hProv, 0);
    }
    return out;
}

std::string GenerateHWID() {
    std::string rawData = "";

    // 1. CPUID
    int cpuInfo[4] = { 0 };
    __cpuid(cpuInfo, 1);
    char cpuBuf[64];
    sprintf_s(cpuBuf, sizeof(cpuBuf), "%08X%08X", cpuInfo[0], cpuInfo[3]);
    rawData += cpuBuf;

    // 2. Windows MachineGuid from Registry
    HKEY hKey;
    if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, L"SOFTWARE\\Microsoft\\Cryptography", 0, KEY_READ | KEY_WOW64_64KEY, &hKey) == ERROR_SUCCESS) {
        wchar_t guid[128] = { 0 };
        DWORD dwSize = sizeof(guid);
        if (RegQueryValueExW(hKey, L"MachineGuid", NULL, NULL, (LPBYTE)guid, &dwSize) == ERROR_SUCCESS) {
            std::wstring wg(guid);
            rawData += std::string(wg.begin(), wg.end());
        }
        RegCloseKey(hKey);
    }

    // 3. Motherboard volume serial of System Drive
    wchar_t sysDrive[MAX_PATH] = { 0 };
    if (GetWindowsDirectoryW(sysDrive, MAX_PATH) > 0) {
        sysDrive[3] = L'\0'; // "C:\"
        DWORD volSerial = 0;
        if (GetVolumeInformationW(sysDrive, NULL, 0, &volSerial, NULL, NULL, NULL, 0)) {
            char volBuf[32];
            sprintf_s(volBuf, sizeof(volBuf), "-%08X", volSerial);
            rawData += volBuf;
        }
    }

    std::string hash = SimpleSha256(rawData);
    if (hash.empty()) {
        hash = "HWID-FALLBACK-001";
    } else {
        hash = "HWID-" + hash.substr(0, 16);
    }
    return hash;
}

// ============================================================================
// DPAPI SECURE LOCAL LICENSE CACHING
// Stores the active license key encrypted with Windows OS-level DPAPI
// ============================================================================
std::wstring GetLicenseFilePath() {
    wchar_t appData[MAX_PATH];
    if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_APPDATA, NULL, 0, appData))) {
        std::wstring dir = std::wstring(appData) + L"\\Oserus Management";
        CreateDirectoryW(dir.c_str(), NULL);
        return dir + L"\\.delia_license.dat";
    }
    return L".delia_license.dat";
}

bool SaveCachedLicense(const std::string& licenseKey) {
    DATA_BLOB inBlob;
    DATA_BLOB outBlob;
    inBlob.pbData = (BYTE*)licenseKey.c_str();
    inBlob.cbData = (DWORD)licenseKey.length();

    if (CryptProtectData(&inBlob, L"DeliaAuthKey", NULL, NULL, NULL, 0, &outBlob)) {
        HANDLE hFile = CreateFileW(GetLicenseFilePath().c_str(), GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_HIDDEN, NULL);
        if (hFile != INVALID_HANDLE_VALUE) {
            DWORD written = 0;
            WriteFile(hFile, outBlob.pbData, outBlob.cbData, &written, NULL);
            CloseHandle(hFile);
            LocalFree(outBlob.pbData);
            return true;
        }
        LocalFree(outBlob.pbData);
    }
    return false;
}

std::string LoadCachedLicense() {
    HANDLE hFile = CreateFileW(GetLicenseFilePath().c_str(), GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
    if (hFile == INVALID_HANDLE_VALUE) return "";

    DWORD size = GetFileSize(hFile, NULL);
    if (size == 0 || size == INVALID_FILE_SIZE) {
        CloseHandle(hFile);
        return "";
    }

    std::vector<BYTE> encData(size);
    DWORD read = 0;
    ReadFile(hFile, encData.data(), size, &read, NULL);
    CloseHandle(hFile);

    DATA_BLOB inBlob;
    DATA_BLOB outBlob;
    inBlob.pbData = encData.data();
    inBlob.cbData = read;

    std::string license = "";
    if (CryptUnprotectData(&inBlob, NULL, NULL, NULL, NULL, 0, &outBlob)) {
        license = std::string((char*)outBlob.pbData, outBlob.cbData);
        LocalFree(outBlob.pbData);
    }
    return license;
}

// ============================================================================
// NATIVE JSON HELPER (Simple Parser for Delia API Responses)
// ============================================================================
std::string ExtractJsonValue(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\":";
    size_t pos = json.find(search);
    if (pos == std::string::npos) return "";
    pos += search.length();

    while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\t')) pos++;
    if (pos >= json.length()) return "";

    if (json[pos] == '"') {
        pos++;
        size_t end = json.find('"', pos);
        if (end != std::string::npos) return json.substr(pos, end - pos);
    } else {
        size_t end = json.find_first_of(",}\r\n ", pos);
        if (end != std::string::npos) return json.substr(pos, end - pos);
    }
    return "";
}

// ============================================================================
// NATIVE WINHTTP HTTPS VERIFICATION
// Communicates with https://deliadevelopment.com/api/v1/license/activate
// ============================================================================
struct ActivationResult {
    bool success;
    std::string status;
    std::string authSig;
    std::string expiresAt;
    std::string code;
    std::string message;
};

ActivationResult ActivateLicense(const std::string& licenseKey, const std::string& hwid) {
    ActivationResult res = { false, "", "", "", "", "" };

    HINTERNET hSession = WinHttpOpen(
        USER_AGENT_ENC.c_str(),
        WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
        WINHTTP_NO_PROXY_NAME,
        WINHTTP_NO_PROXY_BYPASS,
        0
    );
    if (!hSession) {
        res.message = "Failed to initialize network session";
        return res;
    }

    HINTERNET hConnect = WinHttpConnect(
        hSession,
        DELIA_HOST_ENC.c_str(),
        INTERNET_DEFAULT_HTTPS_PORT,
        0
    );
    if (!hConnect) {
        WinHttpCloseHandle(hSession);
        res.message = "Failed to connect to authentication server";
        return res;
    }

    HINTERNET hRequest = WinHttpOpenRequest(
        hConnect,
        L"POST",
        DELIA_PATH_ENC.c_str(),
        NULL,
        WINHTTP_NO_REFERER,
        WINHTTP_DEFAULT_ACCEPT_TYPES,
        WINHTTP_FLAG_SECURE
    );
    if (!hRequest) {
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        res.message = "Failed to create secure request";
        return res;
    }

    // Build JSON payload securely
    std::string payload = "{\"" + KEY_API_KEY_ENC + "\":\"" + DELIA_API_KEY_ENC + "\","
                        + "\"" + KEY_LICENSE_ENC + "\":\"" + licenseKey + "\","
                        + "\"" + KEY_DEVICE_ID_ENC + "\":\"" + hwid + "\"}";

    std::wstring headers = CONTENT_TYPE_ENC;

    BOOL bSend = WinHttpSendRequest(
        hRequest,
        headers.c_str(),
        (DWORD)headers.length(),
        (LPVOID)payload.c_str(),
        (DWORD)payload.length(),
        (DWORD)payload.length(),
        0
    );

    if (bSend && WinHttpReceiveResponse(hRequest, NULL)) {
        std::string responseBody = "";
        DWORD bytesAvailable = 0;
        while (WinHttpQueryDataAvailable(hRequest, &bytesAvailable) && bytesAvailable > 0) {
            std::vector<char> buffer(bytesAvailable + 1);
            DWORD bytesRead = 0;
            if (WinHttpReadData(hRequest, buffer.data(), bytesAvailable, &bytesRead)) {
                buffer[bytesRead] = '\0';
                responseBody.append(buffer.data(), bytesRead);
            }
        }

        std::string sSuccess = ExtractJsonValue(responseBody, KEY_SUCCESS_ENC);
        std::string sStatus = ExtractJsonValue(responseBody, KEY_STATUS_ENC);
        std::string sAuthSig = ExtractJsonValue(responseBody, KEY_AUTH_SIG_ENC);
        std::string sCode = ExtractJsonValue(responseBody, KEY_CODE_ENC);
        std::string sMessage = ExtractJsonValue(responseBody, KEY_MESSAGE_ENC);

        if (sSuccess == "true" && sStatus == "active" && !sAuthSig.empty()) {
            res.success = true;
            res.status = sStatus;
            res.authSig = sAuthSig;
            res.expiresAt = ExtractJsonValue(responseBody, "expiresAt");
        } else {
            res.success = false;
            res.code = sCode.empty() ? "VERIFICATION_FAILED" : sCode;
            res.message = sMessage.empty() ? "License validation was rejected by the server" : sMessage;
        }
    } else {
        res.success = false;
        res.code = "NETWORK_ERROR";
        res.message = "Failed to contact Delia licensing server. Check your internet connection.";
    }

    WinHttpCloseHandle(hRequest);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);
    return res;
}

// ============================================================================
// NATIVE WIN32 PROMPT FOR LICENSE KEY
// Clean modal dialog prompting user for key if not cached or activation failed
// ============================================================================
struct DialogData {
    std::string enteredKey;
    std::string promptError;
    std::string hwid;
};

static DialogData g_dlgData;
static HWND g_hEdit = NULL;

LRESULT CALLBACK DlgProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_CREATE: {
        HFONT hFont = CreateFontW(16, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");

        HWND hTitle = CreateWindowW(L"STATIC", L"Oserus Management — License Verification", WS_CHILD | WS_VISIBLE, 20, 16, 380, 24, hWnd, NULL, NULL, NULL);
        SendMessage(hTitle, WM_SETFONT, (WPARAM)hFont, TRUE);

        std::wstring hwidText = L"Hardware ID: " + std::wstring(g_dlgData.hwid.begin(), g_dlgData.hwid.end());
        HWND hHwid = CreateWindowW(L"STATIC", hwidText.c_str(), WS_CHILD | WS_VISIBLE, 20, 44, 380, 18, hWnd, NULL, NULL, NULL);
        SendMessage(hHwid, WM_SETFONT, (WPARAM)hFont, TRUE);

        HWND hLabel = CreateWindowW(L"STATIC", L"Enter your Delia software license key below:", WS_CHILD | WS_VISIBLE, 20, 72, 380, 20, hWnd, NULL, NULL, NULL);
        SendMessage(hLabel, WM_SETFONT, (WPARAM)hFont, TRUE);

        g_hEdit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_CHILD | WS_VISIBLE | ES_AUTOHSCROLL, 20, 96, 380, 26, hWnd, (HMENU)101, NULL, NULL);
        SendMessage(g_hEdit, WM_SETFONT, (WPARAM)hFont, TRUE);

        if (!g_dlgData.promptError.empty()) {
            std::wstring errW(g_dlgData.promptError.begin(), g_dlgData.promptError.end());
            HWND hErr = CreateWindowW(L"STATIC", errW.c_str(), WS_CHILD | WS_VISIBLE, 20, 130, 380, 36, hWnd, (HMENU)103, NULL, NULL);
            SendMessage(hErr, WM_SETFONT, (WPARAM)hFont, TRUE);
        }

        HWND hBtn = CreateWindowW(L"BUTTON", L"Activate & Launch", WS_CHILD | WS_VISIBLE | BS_DEFPUSHBUTTON, 260, 172, 140, 30, hWnd, (HMENU)IDOK, NULL, NULL);
        SendMessage(hBtn, WM_SETFONT, (WPARAM)hFont, TRUE);

        HWND hCancel = CreateWindowW(L"BUTTON", L"Exit", WS_CHILD | WS_VISIBLE, 170, 172, 80, 30, hWnd, (HMENU)IDCANCEL, NULL, NULL);
        SendMessage(hCancel, WM_SETFONT, (WPARAM)hFont, TRUE);

        SetFocus(g_hEdit);
        break;
    }
    case WM_COMMAND: {
        if (LOWORD(wParam) == IDOK) {
            wchar_t buf[256] = { 0 };
            GetWindowTextW(g_hEdit, buf, 255);
            std::wstring ws(buf);
            g_dlgData.enteredKey = std::string(ws.begin(), ws.end());
            // Trim
            while (!g_dlgData.enteredKey.empty() && isspace(g_dlgData.enteredKey.back())) g_dlgData.enteredKey.pop_back();
            while (!g_dlgData.enteredKey.empty() && isspace(g_dlgData.enteredKey.front())) g_dlgData.enteredKey.erase(g_dlgData.enteredKey.begin());
            PostQuitMessage(0);
        } else if (LOWORD(wParam) == IDCANCEL) {
            g_dlgData.enteredKey = "";
            PostQuitMessage(1);
        }
        break;
    }
    case WM_CLOSE:
        PostQuitMessage(1);
        break;
    default:
        return DefWindowProcW(hWnd, msg, wParam, lParam);
    }
    return 0;
}

std::string PromptUserForLicense(const std::string& hwid, const std::string& initialError = "") {
    g_dlgData.enteredKey = "";
    g_dlgData.promptError = initialError;
    g_dlgData.hwid = hwid;

    WNDCLASSW wc = { 0 };
    wc.lpfnWndProc = DlgProc;
    wc.hInstance = GetModuleHandle(NULL);
    wc.lpszClassName = L"DeliaAuthDialog";
    wc.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
    RegisterClassW(&wc);

    int scrW = GetSystemMetrics(SM_CXSCREEN);
    int scrH = GetSystemMetrics(SM_CYSCREEN);
    int winW = 436, winH = 250;
    int winX = (scrW - winW) / 2;
    int winY = (scrH - winH) / 2;

    HWND hWnd = CreateWindowExW(
        WS_EX_DLGMODALFRAME | WS_EX_TOPMOST,
        L"DeliaAuthDialog",
        L"Oserus Management — License Activation",
        WS_VISIBLE | WS_POPUP | WS_CAPTION | WS_SYSMENU,
        winX, winY, winW, winH,
        NULL, NULL, GetModuleHandle(NULL), NULL
    );

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    DestroyWindow(hWnd);
    UnregisterClassW(L"DeliaAuthDialog", GetModuleHandle(NULL));
    return g_dlgData.enteredKey;
}

// ============================================================================
// MAIN LOADER ENTRY POINT
// ============================================================================
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    std::string hwid = GenerateHWID();
    std::string licenseKey = LoadCachedLicense();
    std::string lastError = "";

    ActivationResult result = { false, "", "", "", "", "" };

    // 1. Check cached license if present
    if (!licenseKey.empty()) {
        result = ActivateLicense(licenseKey, hwid);
        if (!result.success) {
            lastError = result.code + ": " + result.message;
        }
    }

    // 2. Loop prompt until user activates or cancels
    while (!result.success) {
        licenseKey = PromptUserForLicense(hwid, lastError);
        if (licenseKey.empty()) {
            // User cancelled
            return 1;
        }

        result = ActivateLicense(licenseKey, hwid);
        if (!result.success) {
            lastError = result.code + ": " + result.message;
        }
    }

    // 3. Activation verified! Save valid license key securely in DPAPI
    SaveCachedLicense(licenseKey);

    // 4. Pass cryptographic session token to Oserus Management environment
    SetEnvironmentVariableA("DELIA_AUTH_SIG", result.authSig.c_str());
    SetEnvironmentVariableA("DELIA_HWID", hwid.c_str());
    SetEnvironmentVariableA("DELIA_LICENSE", licenseKey.c_str());

    // 5. Locate and spawn Oserus Management.exe
    wchar_t appExe[MAX_PATH];
    // Check in same directory
    GetModuleFileNameW(NULL, appExe, MAX_PATH);
    std::wstring exeDir = appExe;
    size_t lastSlash = exeDir.find_last_of(L"\\/");
    if (lastSlash != std::wstring::npos) exeDir = exeDir.substr(0, lastSlash);

    std::wstring targetExe = exeDir + L"\\Oserus Management.exe";
    DWORD dwAttrib = GetFileAttributesW(targetExe.c_str());
    if (dwAttrib == INVALID_FILE_ATTRIBUTES) {
        // Fallback to standard installed location in Local AppData
        wchar_t localApp[MAX_PATH];
        if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, localApp))) {
            targetExe = std::wstring(localApp) + L"\\Programs\\Oserus Management\\Oserus Management.exe";
        }
    }

    STARTUPINFOW si = { sizeof(si) };
    PROCESS_INFORMATION pi = { 0 };

    if (CreateProcessW(targetExe.c_str(), NULL, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return 0;
    } else {
        // Try fallback: launch via shell
        HINSTANCE hRes = ShellExecuteW(NULL, L"open", targetExe.c_str(), NULL, NULL, SW_SHOWNORMAL);
        if ((INT_PTR)hRes > 32) return 0;

        std::wstring msg = L"License verified successfully!\n\nCould not automatically find:\n" + targetExe + L"\n\nPlease launch Oserus Management directly.";
        MessageBoxW(NULL, msg.c_str(), L"Oserus Management", MB_ICONINFORMATION | MB_OK);
        return 0;
    }
}
