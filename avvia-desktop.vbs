' ========================================================
'  LibrePDF Studio - Lanciatore Desktop Nativo Silenzioso
'  Avvia il server locale in background (senza finestra DOS)
'  e apre l'app in finestra autonoma (modalita' --app).
' ========================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

Function IsServerRunning()
    On Error Resume Next
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.setTimeouts 500, 500, 500, 500
    http.open "GET", "http://localhost:3000/api/local-engine/capabilities", False
    http.send
    If Err.Number = 0 Then
        IsServerRunning = True
    Else
        IsServerRunning = False
    End If
    On Error GoTo 0
End Function

' 1. Se il server non e' gia' attivo, avvialo in modo invisibile (0 = hidden)
If Not IsServerRunning() Then
    WshShell.Run "cmd /c npx tsx server.ts", 0, False
    ' Attendi fino a 5 secondi che il server risponda
    For i = 1 To 20
        WScript.Sleep 250
        If IsServerRunning() Then Exit For
    Next
End If

' 2. Trova Microsoft Edge o Google Chrome per la modalita' app nativa
browserFound = False

edgePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
If Not fso.FileExists(edgePath) Then
    edgePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
End If

If fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """ --app=http://localhost:3000", 1, False
    browserFound = True
Else
    chromePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe")
    If Not fso.FileExists(chromePath) Then
        chromePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe")
    End If
    If Not fso.FileExists(chromePath) Then
        chromePath = WshShell.ExpandEnvironmentStrings("%LocalAppData%\Google\Chrome\Application\chrome.exe")
    End If

    If fso.FileExists(chromePath) Then
        WshShell.Run """" & chromePath & """ --app=http://localhost:3000", 1, False
        browserFound = True
    End If
End If

' Fallback nel caso estremo in cui ne' Edge ne' Chrome siano trovati nei path standard
If Not browserFound Then
    WshShell.Run "http://localhost:3000", 1, False
End If
