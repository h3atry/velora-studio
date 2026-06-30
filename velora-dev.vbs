' Abre Velora (sem janela de terminal)
Option Explicit

Dim shell, fso, root, cmd
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)

cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & root & "\dev.ps1"""

' 0 = janela oculta — so abre a app Electron
shell.Run cmd, 0, False
