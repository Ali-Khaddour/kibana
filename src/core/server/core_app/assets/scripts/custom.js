var app_title = document.querySelector('meta[name="app-title"]').content;
var app_shortcut = document.querySelector('meta[name="app-shortcut"]').content;
localStorage.setItem("APP_TITLE", app_title);
localStorage.setItem("APP_SHORTCUT", app_shortcut);