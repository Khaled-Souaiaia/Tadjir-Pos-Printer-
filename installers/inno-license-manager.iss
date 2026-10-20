; ==============================================================================
; Inno Setup Script: TADJIR License Manager (Developer Edition)
; Generates: release/license-manager/TADJIR-Licence-Manager-Setup.exe
; Author: KhaLed Souaiaia
; ==============================================================================

#define MyAppName "TADJIR LICENCE MANAGER"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "KhaLed Souaiaia"
#define MyAppURL "https://github.com/Khaled-Souaiaia/TADJIR-DZ"
#define MyAppExeName "TADJIR-Licence-Manager.exe"
#define MyAppDescription "TADJIR License Management Tool"

[Setup]
; Basic Application Details
AppId={{9B73A412-1C2F-48DE-9A45-7E623B81C921}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
VersionInfoDescription={#MyAppDescription}
VersionInfoProductName={#MyAppName}
VersionInfoCompany={#MyAppPublisher}
VersionInfoVersion={#MyAppVersion}

; Installation Paths
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=no
AllowNoIcons=yes

; Output Settings
OutputDir=..\release\license-manager
OutputBaseFilename=TADJIR-Licence-Manager-Setup
SetupIconFile=..\build-resources\icon-license-manager.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName} - أداة إدارة التراخيص

; Wizard Style & Compression
WizardStyle=modern
SolidCompression=yes
Compression=lzma2/ultra64
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Visual Branding
WizardSmallImageFile=..\build-resources\icon-license-manager.png

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[CustomMessages]
english.CreateDesktopDesc=Create a &desktop shortcut
english.RunAppDesc=Launch TADJIR License Manager now
french.CreateDesktopDesc=Créer un raccourci sur le &bureau
french.RunAppDesc=Lancer TADJIR License Manager maintenant

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopDesc}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copy all packaged files from the License Manager build (win-unpacked directory)
Source: "..\release\license-manager\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:RunAppDesc}"; Flags: nowait postinstall skipifsilent
