; Inno Setup script cho AI DIP Studio
; Đóng gói từ bản đã build sẵn trong release\win-unpacked
; (né lỗi winCodeSign/symlink của electron-builder NSIS trên máy chưa bật Developer Mode)

#define MyAppName "AI DIP Studio"
#define MyAppVersion "2.0.11"
#define MyAppPublisher "Diep Foto"
#define MyAppExeName "AI DIP Studio.exe"
#define SourceDir "release\win-unpacked"

[Setup]
AppId={{8F4B2E1A-6C3D-4A9E-9B7F-1D2E3C4A5B6C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=release\installer
OutputBaseFilename=AI-DIP-Studio-Setup-{#MyAppVersion}
SetupIconFile=assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=yes
CloseApplicationsFilter=*.exe
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Tạo shortcut trên Desktop"; GroupDescription: "Shortcuts:"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Chạy {#MyAppName} ngay"; Flags: nowait postinstall skipifsilent
