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

[UninstallRun]
Filename: "{app}\scripts\uninstall.bat"; Parameters: "/silent"; Flags: runhidden; RunOnceId: "StopService"

[Code]
// ============================================================
// Win32 API
// ============================================================
function CreateMutex(lpMutexAttributes: Integer; bInitialOwner: Boolean;
  lpName: String): THandle; external 'CreateMutexW@kernel32.dll stdcall';
function CloseHandle(hObject: THandle): Boolean;
  external 'CloseHandle@kernel32.dll stdcall';

// ============================================================
// 全局变量
// ============================================================
var
  // 模式选择页
  ModePage:  TWizardPage;
  RbLocal:   TRadioButton;
  RbDocker:  TRadioButton;
  LblLocal:  TLabel;
  LblDocker: TLabel;

  // 进度页
  ProgressPage: TOutputProgressWizardPage;

  // 安装日志路径（安装完文件后才能确定）
  LogFile: String;

// ============================================================
// 工具：读取文本文件最后一行
// ============================================================
function ReadLastLine(const FileName: String): String;
var
  Lines: TArrayOfString;
  I: Integer;
begin
  Result := '';
  if not LoadStringsFromFile(FileName, Lines) then Exit;
  // 从末尾往前找第一个非空行
  for I := GetArrayLength(Lines) - 1 downto 0 do
  begin
    if Trim(Lines[I]) <> '' then
    begin
      Result := Trim(Lines[I]);
      Break;
    end;
  end;
end;

// ============================================================
// 工具：从日志行提取可读消息（去掉时间戳和级别标签）
// ============================================================
function ExtractMsg(const Line: String): String;
var
  P: Integer;
begin
  Result := Line;
  // 格式: [Fri 04/10/2026  7:02:00.00] [INFO] 消息
  // 找最后一个 '] ' 之后的内容
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
  ModePage := CreateCustomPage(
    wpSelectDir,
    '选择安装模式',
    '请选择 Fertutor 的安装方式'
  );

  RbLocal := TRadioButton.Create(ModePage);
  RbLocal.Parent  := ModePage.Surface;
  RbLocal.Left    := 8;
  RbLocal.Top     := 16;
  RbLocal.Width   := 420;
  RbLocal.Height  := 20;
  RbLocal.Caption := '本地模式（推荐）  —  Node.js + PostgreSQL 直接运行';
  RbLocal.Checked := True;
  RbLocal.Font.Style := [fsBold];

  LblLocal := TLabel.Create(ModePage);
  LblLocal.Parent   := ModePage.Surface;
  LblLocal.Left     := 28;
  LblLocal.Top      := 42;
  LblLocal.Width    := 400;
  LblLocal.Height   := 36;
  LblLocal.AutoSize := False;
  LblLocal.WordWrap := True;
  LblLocal.Caption  :=
    '无需 Docker，直接在 Windows 上安装 Node.js 和 PostgreSQL，' +
    '并注册为 Windows 系统服务，开机自动启动。';

  RbDocker := TRadioButton.Create(ModePage);
  RbDocker.Parent  := ModePage.Surface;
  RbDocker.Left    := 8;
  RbDocker.Top     := 96;
  RbDocker.Width   := 420;
  RbDocker.Height  := 20;
  RbDocker.Caption := 'Docker 模式  —  通过 Docker Desktop 容器化运行';
  RbDocker.Font.Style := [fsBold];

  LblDocker := TLabel.Create(ModePage);
  LblDocker.Parent   := ModePage.Surface;
  LblDocker.Left     := 28;
  LblDocker.Top      := 120;
  LblDocker.Width    := 400;
  LblDocker.Height   := 36;
  LblDocker.AutoSize := False;
  LblDocker.WordWrap := True;
  LblDocker.Caption  :=
    '需要已安装 Docker Desktop。所有服务运行在容器中，' +
    '环境隔离，适合开发或多实例部署。';
end;

// ============================================================
// 创建进度页
// ============================================================
procedure CreateProgressPage;
begin
  ProgressPage := CreateOutputProgressPage(
    '正在配置 Fertutor',
    '请稍候，安装程序正在配置系统环境...'
  );
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
// 运行安装脚本并在进度页实时显示状态
// ============================================================
procedure RunInstallScript(const Script: String);
var
  ResultCode: Integer;
  LastLine:   String;
  // 步骤关键字 → 进度百分比映射
  Steps: array[0..5] of String;
  Pcts:  array[0..5] of Integer;
  I:     Integer;
  Pct:   Integer;
  Msg:   String;
begin
  // 定义步骤关键字和对应进度值
  Steps[0] := '[1/5]';  Pcts[0] := 10;
  Steps[1] := '[2/5]';  Pcts[1] := 25;
  Steps[2] := '[3/5]';  Pcts[2] := 45;
  Steps[3] := '[4/5]';  Pcts[3] := 65;
  Steps[4] := '[5/5]';  Pcts[4] := 85;
  Steps[5] := '完成';   Pcts[5] := 100;

  LogFile := ExpandConstant('{app}\install.log');

  ProgressPage.SetProgress(0, 100);
  ProgressPage.SetText('准备中...', '正在启动安装脚本，请稍候...');
  ProgressPage.Show;

  // 后台隐藏运行脚本（SW_HIDE = 0）
  Exec(
    ExpandConstant('{cmd}'),
    '/c "' + Script + '"',
    ExpandConstant('{app}'),
    0,   { SW_HIDE }
    ewNoWait,
    ResultCode
  );

  // 轮询日志文件，更新进度条（最多等 20 分钟）
  Pct := 0;
  for I := 1 to 2400 do   { 2400 × 500ms = 20 分钟 }
  begin
    Sleep(500);

    // 读取日志最新一行
    if FileExists(LogFile) then
    begin
      LastLine := ReadLastLine(LogFile);
      Msg := ExtractMsg(LastLine);

      // 根据关键字推进进度
      if Pos('[1/5]', LastLine) > 0 then Pct := 10;
      if Pos('[2/5]', LastLine) > 0 then Pct := 25;
      if Pos('[3/5]', LastLine) > 0 then Pct := 45;
      if Pos('[4/5]', LastLine) > 0 then Pct := 65;
      if Pos('[5/5]', LastLine) > 0 then Pct := 85;
      if (Pos('安装完成', LastLine) > 0) or
         (Pos('本地安装完成', LastLine) > 0) or
         (Pos('Docker 安装完成', LastLine) > 0) then
      begin
        Pct := 100;
        ProgressPage.SetProgress(100, 100);
        ProgressPage.SetText('安装完成！', Msg);
        Break;
      end;

      // 错误检测
      if Pos('[ERROR]', LastLine) > 0 then
        ProgressPage.SetText('⚠ ' + Msg, '详细信息请查看安装日志')
      else
        ProgressPage.SetText(Msg, '');

      ProgressPage.SetProgress(Pct, 100);
    end
    else
      ProgressPage.SetText('正在启动...', '');
  end;

  ProgressPage.Hide;
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
