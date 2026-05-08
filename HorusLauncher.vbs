Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c ""C:\Users\joaov\OneDrive\Desktop\HORUS\start_horus.bat"" >> ""C:\Users\joaov\OneDrive\Desktop\HORUS\logs\launcher.log"" 2>&1", 0, False
