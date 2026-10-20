; ==============================================================================
; Inno Setup Script: TADJIR Accounting & POS Software (Client Edition)
; Generates: release/tadjir/TADJIR-Setup.exe
; Author: KhaLed Souaiaia
; ==============================================================================

#define MyAppName "TADJIR"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "KhaLed Souaiaia"
#define MyAppURL "https://github.com/Khaled-Souaiaia/TADJIR-DZ"
#define MyAppExeName "TADJIR.exe"
#define MyAppDescription "TADJIR Accounting & POS Software"

[Setup]
; Basic Application Details
AppId={{5C88F3A2-8F9E-4DE9-B817-A6389F1A4E90}
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
OutputDir=..\release\tadjir
OutputBaseFilename=TADJIR-Setup
SetupIconFile=..\build-resources\icon-tadjir.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName} - نظام إدارة ومحاسبة نقاط البيع

; Wizard Style & Compression
WizardStyle=modern
SolidCompression=yes
Compression=lzma2/ultra64
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Visual Branding
WizardSmallImageFile=..\build-resources\icon-tadjir.png

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[CustomMessages]
english.CreateDesktopDesc=Create a &desktop shortcut
english.RunAppDesc=Launch TADJIR now
english.KeepDataPrompt=Do you want to keep your store database, sales history, and invoices for future use? (Recommended: Yes)
french.CreateDesktopDesc=Créer un raccourci sur le &bureau
french.RunAppDesc=Lancer TADJIR maintenant
french.KeepDataPrompt=Voulez-vous conserver la base de données et l'historique des ventes ? (Recommandé : Oui)

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopDesc}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copy all packaged files from the TADJIR build (win-unpacked directory)
Source: "..\release\tadjir\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:RunAppDesc}"; Flags: nowait postinstall skipifsilent

[Code]
// Protect local SQLite database and user data during uninstallation
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataPath: String;
  RetVal: Integer;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DataPath := ExpandConstant('{userappdata}\TADJIR');
    if DirExists(DataPath) then
    begin
      RetVal := MsgBox(CustomMessage('KeepDataPrompt'), mbConfirmation, MB_YESNO);
      if RetVal = IDNO then
      begin
        DelTree(DataPath, True, True, True);
      end;
    end;
  end;
end;
