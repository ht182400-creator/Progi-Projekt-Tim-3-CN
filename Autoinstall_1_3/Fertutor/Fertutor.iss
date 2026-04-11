#define MyAppName "Fertutor"
#define MyAppVersion "1.3.2"
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
Source: "Fertutor.bat";               DestDir: "{app}";         Flags: ignoreversion
Source: "docker-compose.yml";         DestDir: "{app}";         Flags: ignoreversion
Source: "Dockerfile";                 DestDir: "{app}";         Flags: ignoreversion
Source: "Dockerfile.client";          DestDir: "{app}";         Flags: ignoreversion
Source: "README.md";                  DestDir: "{app}";         Flags: ignoreversion isreadme
Source: "scripts\install-local.bat";  DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\install-docker.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\uninstall.bat";      DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "scripts\install.sh";         DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "tools\nssm.exe";             DestDir: "{app}\tools";   Flags: ignoreversion
Source: "app\*";                      DestDir: "{app}\app";     Flags: ignoreversion recursesubdirs createallsubdirs
Source: "deploy\*";                   DestDir: "{app}\deploy";  Flags: ignoreversion recursesubdirs createallsubdirs
Source: "docker\*";                   DestDir: "{app}\docker";  Flags: ignoreversion recursesubdirs createallsubdirs

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
// ── Win32 API ──────────────────────────────────────────────
function PostMessage(hWnd: HWND; Msg: UINT; wParam: LongInt; lParam: LongInt): Boolean;
  external 'PostMessageW@user32.dll stdcall';
function SendMessage(hWnd: HWND; Msg: UINT; wParam: LongInt; lParam: LongInt): LongInt;
  external 'SendMessageW@user32.dll stdcall';

type
  TMsg = record
    hwnd:    HWND;
    message: UINT;
    wParam:  LongInt;
    lParam:  LongInt;
    time:    DWORD;
    pt:      TPoint;
  end;

function PeekMessage(var lpMsg: TMsg; hWnd: HWND;
  wMsgFilterMin, wMsgFilterMax, wRemoveMsg: UINT): BOOL;
  external 'PeekMessageW@user32.dll stdcall';
function TranslateMessage(const lpMsg: TMsg): BOOL;
  external 'TranslateMessage@user32.dll stdcall';
function DispatchMessage(const lpMsg: TMsg): LongInt;
  external 'DispatchMessageW@user32.dll stdcall';

// ── 全局变量 ───────────────────────────────────────────────
var
  ModePage:     TWizardPage;
  RbLocal:      TRadioButton;
  RbDocker:     TRadioButton;
  LblLocal:     TLabel;
  LblDocker:    TLabel;
  ProgressPage: TWizardPage;
  LblStatus:    TLabel;
  LblDetail:    TLabel;
  ProgressBar:  TNewProgressBar;
  LogMemo:      TMemo;
  StatusFile:   String;
  ScriptDone:   Boolean;
  InstallFailed: Boolean;

// ── 消息泵：真正驱动 UI 重绘 ───────────────────────────────
procedure PumpMessages;
var
  Msg: TMsg;
begin
  while PeekMessage(Msg, 0, 0, 0, 1) do
  begin
    TranslateMessage(Msg);
    DispatchMessage(Msg);
  end;
end;

// ── 读文件最后一个非空行 ───────────────────────────────────
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

// ── 创建模式选择页 ─────────────────────────────────────────
procedure CreateModePage;
begin
  ModePage := CreateCustomPage(wpSelectDir, '选择安装模式', '请选择 Fertutor 的安装方式');

  RbLocal := TRadioButton.Create(ModePage);
  RbLocal.Parent := ModePage.Surface;
  RbLocal.Left := 8; RbLocal.Top := 16; RbLocal.Width := 420; RbLocal.Height := 20;
  RbLocal.Caption := '本地模式（推荐）  —  Node.js + PostgreSQL 直接运行';
  RbLocal.Checked := True;
  RbLocal.Font.Style := [fsBold];

  LblLocal := TLabel.Create(ModePage);
  LblLocal.Parent := ModePage.Surface;
  LblLocal.Left := 28; LblLocal.Top := 42; LblLocal.Width := 400; LblLocal.Height := 40;
  LblLocal.AutoSize := False; LblLocal.WordWrap := True;
  LblLocal.Caption := '无需 Docker，直接在 Windows 上安装 Node.js 和 PostgreSQL，并注册为 Windows 系统服务，开机自动启动。';

  RbDocker := TRadioButton.Create(ModePage);
  RbDocker.Parent := ModePage.Surface;
  RbDocker.Left := 8; RbDocker.Top := 96; RbDocker.Width := 420; RbDocker.Height := 20;
  RbDocker.Caption := 'Docker 模式  —  通过 Docker Desktop 容器化运行';
  RbDocker.Font.Style := [fsBold];

  LblDocker := TLabel.Create(ModePage);
  LblDocker.Parent := ModePage.Surface;
  LblDocker.Left := 28; LblDocker.Top := 120; LblDocker.Width := 400; LblDocker.Height := 40;
  LblDocker.AutoSize := False; LblDocker.WordWrap := True;
  LblDocker.Caption := '需要已安装 Docker Desktop。所有服务运行在容器中，环境隔离，适合开发或多实例部署。';
end;

// ── 创建进度页 ─────────────────────────────────────────────
procedure CreateProgressPage;
begin
  ProgressPage := CreateCustomPage(wpInstalling, '正在配置 Fertutor', '请稍候，安装程序正在配置系统环境...');

  LblStatus := TLabel.Create(ProgressPage);
  LblStatus.Parent := ProgressPage.Surface;
  LblStatus.Left := 0; LblStatus.Top := 8;
  LblStatus.Width := ProgressPage.SurfaceWidth;
  LblStatus.AutoSize := False;
  LblStatus.Caption := '准备中...';
  LblStatus.Font.Style := [fsBold];

  LblDetail := TLabel.Create(ProgressPage);
  LblDetail.Parent := ProgressPage.Surface;
  LblDetail.Left := 0; LblDetail.Top := 30;
  LblDetail.Width := ProgressPage.SurfaceWidth; LblDetail.Height := 36;
  LblDetail.AutoSize := False; LblDetail.WordWrap := True;
  LblDetail.Caption := '';

  ProgressBar := TNewProgressBar.Create(ProgressPage);
  ProgressBar.Parent := ProgressPage.Surface;
  ProgressBar.Left := 0; ProgressBar.Top := 74;
  ProgressBar.Width := ProgressPage.SurfaceWidth; ProgressBar.Height := 20;
  ProgressBar.Min := 0; ProgressBar.Max := 100; ProgressBar.Position := 0;

  LogMemo := TMemo.Create(ProgressPage);
  LogMemo.Parent := ProgressPage.Surface;
  LogMemo.Left := 0; LogMemo.Top := 102;
  LogMemo.Width := ProgressPage.SurfaceWidth;
  LogMemo.Height := ProgressPage.SurfaceHeight - 106;
  LogMemo.ScrollBars := ssVertical;
  LogMemo.ReadOnly := True;
  LogMemo.Color := $F5F5F5;
  LogMemo.Font.Name := 'Consolas';
  LogMemo.Font.Size := 8;
  LogMemo.WordWrap := False;
end;

procedure InitializeWizard;
begin
  ScriptDone    := False;
  InstallFailed := False;
  CreateModePage;
  CreateProgressPage;
end;

// ── 主安装循环 ─────────────────────────────────────────────
procedure RunInstallScript(const Script: String);
var
  ResultCode  : Integer;
  LastLine    : String;
  I, J, P     : Integer;
  LogPct      : Integer;
  AutoPct     : Integer;
  DisplayPct  : Integer;
  TicksPerPct : Integer;
  EstTotalSec : Integer;
  AutoMaxPct  : Integer;
  TickMs      : Integer;
  MaxTicks    : Integer;
  TimeEstSet  : Boolean;
  EstStr      : String;
  AllLines    : TArrayOfString;
  LastLineIdx : Integer;
  LineText    : String;
  FatalSeen   : Boolean;
  MsgTxt      : String;
begin
  EstTotalSec := 120;
  AutoMaxPct  := 92;
  TickMs      := 500;
  MaxTicks    := 7200;
  TimeEstSet  := False;
  FatalSeen   := False;
  StatusFile  := ExpandConstant('{app}\install.status');
  LastLineIdx := 0;

  TicksPerPct := (EstTotalSec * 1000) div (100 * TickMs);
  if TicksPerPct < 1 then TicksPerPct := 1;

  LblStatus.Caption    := '准备中...';
  LblDetail.Caption    := '正在启动安装脚本，请稍候...';
  ProgressBar.Position := 1;
  PumpMessages;

  Exec(ExpandConstant('{cmd}'), '/c "' + Script + '"',
       ExpandConstant('{app}'), 0, ewNoWait, ResultCode);

  LogPct     := -1;
  DisplayPct := 1;

  for I := 1 to MaxTicks do
  begin
    Sleep(TickMs);
    PumpMessages;

    if not FileExists(StatusFile) then
    begin
      LblDetail.Caption := '等待安装脚本启动... (' + IntToStr(I) + ')';
      PumpMessages;
    end
    else
    begin
      LastLine := ReadLastLine(StatusFile);

      // ── 追加新行到 Memo，同时检测完成/错误信号 ──────────
      if LoadStringsFromFile(StatusFile, AllLines) then
      begin
        if GetArrayLength(AllLines) > LastLineIdx then
        begin
          for J := LastLineIdx to GetArrayLength(AllLines) - 1 do
          begin
            LineText := Trim(AllLines[J]);
            if (LineText <> '') and (Copy(LineText, 1, 1) = '[') then
            begin
              P := Pos('] ', LineText);
              if P > 0 then
                MsgTxt := Copy(LineText, P + 2, Length(LineText))
              else
                MsgTxt := LineText;
              if MsgTxt <> '' then
                LogMemo.Lines.Add(MsgTxt);
              // 完成信号检测（在每一行上检测）
              if (Pos('本地安装完成', LineText) > 0) or
                 (Pos('Docker 安装完成', LineText) > 0) then
                LastLine := LineText;
              // 重启信号检测
              if Pos('[REBOOT]', LineText) > 0 then
                LastLine := LineText;
              // 致命错误检测
              if Pos('[FATAL]', LineText) > 0 then
                LastLine := LineText;
            end;
          end;
          LastLineIdx := GetArrayLength(AllLines);
          SendMessage(LogMemo.Handle, $00B6, 0, LogMemo.Lines.Count);
          PumpMessages;
        end;
      end;

      // ── 时间估算 ─────────────────────────────────────────
      if (not TimeEstSet) and (Pos('[TIMEEST]', LastLine) > 0) then
      begin
        P := Pos('] ', LastLine);
        EstStr := Trim(Copy(LastLine, P + 2, Length(LastLine)));
        EstTotalSec := StrToIntDef(EstStr, 120);
        TicksPerPct := (EstTotalSec * 1000) div (100 * TickMs);
        if TicksPerPct < 1 then TicksPerPct := 1;
        TimeEstSet := True;
        if EstTotalSec > 600 then
          LblDetail.Caption := '首次安装需下载依赖，预计约 ' +
            IntToStr(EstTotalSec div 60) + ' 分钟，请耐心等待...'
        else
          LblDetail.Caption := '预计约 ' + IntToStr(EstTotalSec div 60) + ' 分钟...';
        PumpMessages;
      end;

      // ── 步骤进度 ─────────────────────────────────────────
      if Pos('[1/5]', LastLine) > 0 then LogPct := 10;
      if Pos('[2/5]', LastLine) > 0 then LogPct := 25;
      if Pos('[3/5]', LastLine) > 0 then LogPct := 45;
      if Pos('[4/5]', LastLine) > 0 then LogPct := 65;
      if Pos('[5/5]', LastLine) > 0 then LogPct := 85;
      if Pos('[1/3]', LastLine) > 0 then LogPct := 20;
      if Pos('[2/3]', LastLine) > 0 then LogPct := 55;
      if Pos('[3/3]', LastLine) > 0 then LogPct := 80;

      // ── 完成信号 ─────────────────────────────────────────
      if (Pos('本地安装完成', LastLine) > 0) or
         (Pos('Docker 安装完成', LastLine) > 0) then
      begin
        ProgressBar.Position := 100;
        LblStatus.Caption    := '配置完成！';
        LblDetail.Caption    := '服务已启动，点击"下一步"完成安装。';
        PumpMessages;
        Break;
      end;

      // ── 重启信号（Docker 安装后需要重启）────────────────
      if Pos('[REBOOT]', LastLine) > 0 then
      begin
        ProgressBar.Position := 100;
        LblStatus.Caption    := '需要重启系统';
        LblDetail.Caption    := 'Docker Desktop 安装完成，需要重启后继续安装 Fertutor。';
        PumpMessages;
        MsgBox('Docker Desktop 安装完成！' + Chr(13) + Chr(10) + Chr(13) + Chr(10) +
               '系统需要重启才能生效。' + Chr(13) + Chr(10) +
               '重启后请重新运行 Fertutor 安装程序完成安装。',
               mbInformation, MB_OK);
        Break;
      end;

      // ── 致命错误 ─────────────────────────────────────────
      if (not FatalSeen) and (Pos('[FATAL]', LastLine) > 0) then
      begin
        FatalSeen     := True;
        InstallFailed := True;
        LblStatus.Caption := '安装失败';
        LblDetail.Caption := '请查看下方日志了解详情';
        PumpMessages;
        P := Pos('] ', LastLine);
        if P > 0 then MsgTxt := Copy(LastLine, P + 2, Length(LastLine))
        else MsgTxt := LastLine;
        MsgBox('安装过程中出现错误：' + Chr(13) + Chr(10) + Chr(13) + Chr(10) + MsgTxt + Chr(13) + Chr(10) +
               Chr(13) + Chr(10) + '详细信息请查看：' + Chr(13) + Chr(10) +
               ExpandConstant('{app}\install.log'), mbError, MB_OK);
        Break;
      end;

      // ── 状态文字 ─────────────────────────────────────────
      if Pos('[STEP]', LastLine) > 0 then
      begin
        P := Pos('] ', LastLine);
        if P > 0 then LblStatus.Caption := Copy(LastLine, P + 2, Length(LastLine));
      end
      else if Pos('[ERROR]', LastLine) > 0 then
      begin
        LblStatus.Caption := '出现错误';
        P := Pos('] ', LastLine);
        if P > 0 then LblDetail.Caption := Copy(LastLine, P + 2, Length(LastLine));
      end;
    end;

    // ── 自动推进进度条 ────────────────────────────────────
    AutoPct := I div TicksPerPct;
    if AutoPct > AutoMaxPct then AutoPct := AutoMaxPct;
    if LogPct > AutoPct then DisplayPct := LogPct
    else DisplayPct := AutoPct;
    if DisplayPct < 1 then DisplayPct := 1;
    ProgressBar.Position := DisplayPct;
    PumpMessages;
  end;
end;

// ── 页面切换时触发安装 ─────────────────────────────────────
procedure CurPageChanged(CurPageID: Integer);
var
  Script: String;
  J: Integer;
begin
  if (not ScriptDone) and (CurPageID = ProgressPage.ID) then
  begin
    ScriptDone := True;
    WizardForm.NextButton.Enabled   := False;
    WizardForm.BackButton.Enabled   := False;
    WizardForm.CancelButton.Enabled := False;
    // 等页面完全渲染
    Sleep(300);
    PumpMessages;
    Sleep(300);
    PumpMessages;

    if RbLocal.Checked then
      Script := ExpandConstant('{app}\scripts\install-local.bat')
    else
      Script := ExpandConstant('{app}\scripts\install-docker.bat');

    RunInstallScript(Script);

    WizardForm.NextButton.Enabled   := True;
    WizardForm.CancelButton.Enabled := True;
    PumpMessages;
    // 自动前进到完成页
    PostMessage(WizardForm.NextButton.Handle, $00F5, 0, 0);
  end;

  // 完成页：根据安装结果显示不同文字
  if CurPageID = wpFinished then
  begin
    if InstallFailed then
    begin
      WizardForm.FinishedLabel.Caption :=
        '安装未能成功完成。' + Chr(13) + Chr(10) + Chr(13) + Chr(10) +
        '请查看安装日志了解详情：' + Chr(13) + Chr(10) +
        ExpandConstant('{app}\install.log') + Chr(13) + Chr(10) + Chr(13) + Chr(10) +
        '修复问题后请重新运行安装程序。';
      // 隐藏所有勾选项（包括 README 和打开应用）
      WizardForm.RunList.Visible := False;
      // 逐个取消勾选，防止 Finish 时执行
      for J := 0 to WizardForm.RunList.Items.Count - 1 do
        WizardForm.RunList.Checked[J] := False;
    end;
  end;
end;
