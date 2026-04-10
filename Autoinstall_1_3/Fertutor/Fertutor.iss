#define MyAppName "Fertutor"
#define MyAppVersion "1.3.1-beta"
#define MyAppPublisher "Fertutor Team"
#define MyAppURL "https://github.com/fertutor"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\output
OutputBaseFilename=Fertutor_Setup_{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
MinVersion=10.0.19041
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加选项:"; Flags: unchecked

[Files]
Source: "Fertutor.bat";               DestDir: "{app}";             Flags: ignoreversion
Source: "docker-compose.yml";         DestDir: "{app}";             Flags: ignoreversion
Source: "Dockerfile";                 DestDir: "{app}";             Flags: ignoreversion
Source: "Dockerfile.client";          DestDir: "{app}";             Flags: ignoreversion
Source: "README.md";                  DestDir: "{app}";             Flags: ignoreversion isreadme
Source: "scripts\install-local.bat";  DestDir: "{app}\scripts";     Flags: ignoreversion
Source: "scripts\install-docker.bat"; DestDir: "{app}\scripts";     Flags: ignoreversion
Source: "scripts\uninstall.bat";      DestDir: "{app}\scripts";     Flags: ignoreversion
Source: "scripts\install.sh";         DestDir: "{app}\scripts";     Flags: ignoreversion
Source: "tools\nssm.exe";             DestDir: "{app}\tools";       Flags: ignoreversion
Source: "app\*";                      DestDir: "{app}\app";         Flags: ignoreversion recursesubdirs createallsubdirs
Source: "deploy\*";                   DestDir: "{app}\deploy";      Flags: ignoreversion recursesubdirs createallsubdirs
Source: "docker\*";                   DestDir: "{app}\docker";      Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\Fertutor.bat"
Name: "{autodesktop}\{#MyAppName}";  Filename: "{app}\Fertutor.bat"; Tasks: desktopicon

[Run]
Filename: "explorer.exe"; Parameters: "http://localhost:8080"; \
  Description: "安装完成后打开 Fertutor（http://localhost:8080）"; \
  Flags: postinstall shellexec skipifsilent unchecked

[UninstallRun]
Filename: "{app}\scripts\uninstall.bat"; Parameters: "/silent"; Flags: runhidden; RunOnceId: "StopService"

[Code]
// ============================================================
// 全局变量
// ============================================================
var
  ModePage:    TWizardPage;
  RbLocal:     TRadioButton;
  RbDocker:    TRadioButton;
  LblLocal:    TLabel;
  LblDocker:   TLabel;

  ProgressPage: TWizardPage;
  LblStatus:    TLabel;
  LblDetail:    TLabel;
  ProgressBar:  TNewProgressBar;

  LogFile: String;

// ============================================================
// 读取文件最后一个非空行
// ============================================================
function ReadLastLine(const FileName: String): String;
var
  Lines: TArrayOfString;
  I: Integer;
begin
  Result := '';
  if not LoadStringsFromFile(FileName, Lines) then Exit;
  for I := GetArrayLength(Lines) - 1 downto 0 do
    if Trim(Lines[I]) <> '' then
    begin
      Result := Trim(Lines[I]);
      Break;
    end;
end;

// ============================================================
// 从日志行提取可读消息（去掉时间戳前缀）
// ============================================================
function ExtractMsg(const Line: String): String;
var
  P: Integer;
begin
  Result := Line;
  P := Pos('] ', Line);
  while P > 0 do
  begin
    Result := Copy(Line, P + 2, Length(Line));
    P := Pos('] ', Result);
  end;
  if Length(Result) > 80 then
    Result := Copy(Result, 1, 77) + '...';
end;

// ============================================================
// 创建模式选择页
// ============================================================
procedure CreateModePage;
begin
  ModePage := CreateCustomPage(wpSelectDir, '选择安装模式', '请选择 Fertutor 的安装方式');

  RbLocal := TRadioButton.Create(ModePage);
  RbLocal.Parent  := ModePage.Surface;
  RbLocal.Left    := 8;   RbLocal.Top    := 16;
  RbLocal.Width   := 420; RbLocal.Height := 20;
  RbLocal.Caption := '本地模式（推荐）  —  Node.js + PostgreSQL 直接运行';
  RbLocal.Checked := True;
  RbLocal.Font.Style := [fsBold];

  LblLocal := TLabel.Create(ModePage);
  LblLocal.Parent   := ModePage.Surface;
  LblLocal.Left     := 28;  LblLocal.Top    := 42;
  LblLocal.Width    := 400; LblLocal.Height := 36;
  LblLocal.AutoSize := False; LblLocal.WordWrap := True;
  LblLocal.Caption  := '无需 Docker，直接在 Windows 上安装 Node.js 和 PostgreSQL，并注册为 Windows 系统服务，开机自动启动。';

  RbDocker := TRadioButton.Create(ModePage);
  RbDocker.Parent  := ModePage.Surface;
  RbDocker.Left    := 8;   RbDocker.Top    := 96;
  RbDocker.Width   := 420; RbDocker.Height := 20;
  RbDocker.Caption := 'Docker 模式  —  通过 Docker Desktop 容器化运行';
  RbDocker.Font.Style := [fsBold];

  LblDocker := TLabel.Create(ModePage);
  LblDocker.Parent   := ModePage.Surface;
  LblDocker.Left     := 28;  LblDocker.Top    := 120;
  LblDocker.Width    := 400; LblDocker.Height := 36;
  LblDocker.AutoSize := False; LblDocker.WordWrap := True;
  LblDocker.Caption  := '需要已安装 Docker Desktop。所有服务运行在容器中，环境隔离，适合开发或多实例部署。';
end;

// ============================================================
// 创建进度页（TNewProgressBar 保证能渲染）
// ============================================================
procedure CreateProgressPage;
begin
  ProgressPage := CreateCustomPage(wpInstalling, '正在配置 Fertutor', '请稍候，安装程序正在配置系统环境...');

  LblStatus := TLabel.Create(ProgressPage);
  LblStatus.Parent     := ProgressPage.Surface;
  LblStatus.Left       := 0;   LblStatus.Top   := 8;
  LblStatus.Width      := ProgressPage.SurfaceWidth;
  LblStatus.AutoSize   := False;
  LblStatus.Caption    := '准备中...';
  LblStatus.Font.Style := [fsBold];

  LblDetail := TLabel.Create(ProgressPage);
  LblDetail.Parent   := ProgressPage.Surface;
  LblDetail.Left     := 0;   LblDetail.Top   := 30;
  LblDetail.Width    := ProgressPage.SurfaceWidth;
  LblDetail.Height   := 40;
  LblDetail.AutoSize := False;
  LblDetail.WordWrap := True;
  LblDetail.Caption  := '';

  ProgressBar := TNewProgressBar.Create(ProgressPage);
  ProgressBar.Parent   := ProgressPage.Surface;
  ProgressBar.Left     := 0;   ProgressBar.Top    := 80;
  ProgressBar.Width    := ProgressPage.SurfaceWidth;
  ProgressBar.Height   := 20;
  ProgressBar.Min      := 0;
  ProgressBar.Max      := 100;
  ProgressBar.Position := 0;
end;

// ============================================================
// 初始化向导
// ============================================================
procedure InitializeWizard;
begin
  CreateModePage;
  CreateProgressPage;
end;

// ============================================================
// 运行安装脚本，进度条实时更新
// 策略：
//   1. bat 启动后写 [TIMEEST] <秒数>，ISS 据此调整自动推进速度
//   2. bat 写 [1/5] 等步骤标记，ISS 跳到对应百分比
//   3. 读不到日志时按时间自动匀速推进（最高 92%）
//   4. 读到"本地安装完成"或"Docker 安装完成"跳到 100%
// ============================================================
procedure RunInstallScript(const Script: String);
var
  ResultCode  : Integer;
  LastLine    : String;
  Msg         : String;
  I           : Integer;
  LogPct      : Integer;
  AutoPct     : Integer;
  DisplayPct  : Integer;
  TicksPerPct : Integer;
  EstTotalSec : Integer;
  AutoMaxPct  : Integer;
  TickMs      : Integer;
  MaxTicks    : Integer;
  TimeEstSet  : Boolean;
  P           : Integer;
  EstStr      : String;
begin
  EstTotalSec := 120;
  AutoMaxPct  := 92;
  TickMs      := 500;
  MaxTicks    := 7200;   { 60 分钟上限，覆盖全新安装场景 }
  TimeEstSet  := False;
  LogFile     := ExpandConstant('{app}\install.log');

  TicksPerPct := (EstTotalSec * 1000) div (100 * TickMs);
  if TicksPerPct < 1 then TicksPerPct := 1;

  LblStatus.Caption    := '准备中...';
  LblDetail.Caption    := '正在启动安装脚本，请稍候...';
  ProgressBar.Position := 1;
  WizardForm.Refresh;

  Exec(
    ExpandConstant('{cmd}'),
    '/c "' + Script + '"',
    ExpandConstant('{app}'),
    0,
    ewNoWait,
    ResultCode
  );

  LogPct     := -1;
  DisplayPct := 1;

  for I := 1 to MaxTicks do
  begin
    Sleep(TickMs);
    WizardForm.Refresh;

    if not FileExists(LogFile) then
    begin
      LblDetail.Caption := '等待安装脚本启动...';
      WizardForm.Refresh;
    end
    else
    begin
      LastLine := ReadLastLine(LogFile);
      Msg      := ExtractMsg(LastLine);

      // 读到时间估算 → 动态调整推进速度和提示文字
      if (not TimeEstSet) and (Pos('[TIMEEST]', LastLine) > 0) then
      begin
        P      := Pos('[TIMEEST]', LastLine);
        EstStr := Trim(Copy(LastLine, P + 9, Length(LastLine)));
        EstTotalSec := StrToIntDef(EstStr, 120);
        TicksPerPct := (EstTotalSec * 1000) div (100 * TickMs);
        if TicksPerPct < 1 then TicksPerPct := 1;
        TimeEstSet := True;
        if EstTotalSec > 600 then
          LblDetail.Caption := '首次安装需下载依赖，预计约 ' +
            IntToStr(EstTotalSec div 60) + ' 分钟，请耐心等待...'
        else
          LblDetail.Caption := '预计约 ' + IntToStr(EstTotalSec div 60) + ' 分钟...';
        WizardForm.Refresh;
      end;

      // 步骤标记 → 跳进度
      if Pos('[1/5]', LastLine) > 0 then LogPct := 10;
      if Pos('[2/5]', LastLine) > 0 then LogPct := 25;
      if Pos('[3/5]', LastLine) > 0 then LogPct := 45;
      if Pos('[4/5]', LastLine) > 0 then LogPct := 65;
      if Pos('[5/5]', LastLine) > 0 then LogPct := 85;
      if Pos('[1/3]', LastLine) > 0 then LogPct := 20;
      if Pos('[2/3]', LastLine) > 0 then LogPct := 55;
      if Pos('[3/3]', LastLine) > 0 then LogPct := 80;

      // 完成信号
      if (Pos('本地安装完成', LastLine) > 0) or
         (Pos('Docker 安装完成', LastLine) > 0) then
      begin
        ProgressBar.Position := 100;
        LblStatus.Caption    := '配置完成！';
        LblDetail.Caption    := '服务已启动，安装程序即将结束...';
        WizardForm.Refresh;
        Break;
      end;

      // 状态文字
      if Pos('[ERROR]', LastLine) > 0 then
      begin
        LblStatus.Caption := '出现错误，请查看安装日志';
        LblDetail.Caption := Msg;
      end
      else if Pos('[STEP]', LastLine) > 0 then
        LblStatus.Caption := Msg
      else if Msg <> '' then
        LblDetail.Caption := Msg;
    end;

    // 自动推进（有无日志都执行）
    AutoPct := I div TicksPerPct;
    if AutoPct > AutoMaxPct then AutoPct := AutoMaxPct;
    if LogPct > AutoPct then DisplayPct := LogPct
    else DisplayPct := AutoPct;
    if DisplayPct < 1 then DisplayPct := 1;

    ProgressBar.Position := DisplayPct;
    WizardForm.Refresh;
  end;
end;

// ============================================================
// 文件复制完成后执行配置脚本
// ============================================================
procedure CurStepChanged(CurStep: TSetupStep);
var
  Script: String;
begin
  if CurStep = ssPostInstall then
  begin
    if RbLocal.Checked then
      Script := ExpandConstant('{app}\scripts\install-local.bat')
    else
      Script := ExpandConstant('{app}\scripts\install-docker.bat');
    RunInstallScript(Script);
  end;
end;
