@echo off
cd /d "%~dp0"
rem Muon doc danh sach phat YouTube: bo "rem" o dong duoi va dan khoa API vao
rem set YT_API_KEY=DAN_KHOA_API_CUA_BAN
start "" http://localhost:3000
node server.js
pause
