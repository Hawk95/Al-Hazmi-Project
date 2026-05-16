@echo off
echo Adding firewall rules for ERP...
netsh advfirewall firewall add rule name="ERP Backend 8003" dir=in action=allow protocol=TCP localport=8003
netsh advfirewall firewall add rule name="ERP Frontend 5173" dir=in action=allow protocol=TCP localport=5173
echo.
echo Done! Both ports are now open.
pause
