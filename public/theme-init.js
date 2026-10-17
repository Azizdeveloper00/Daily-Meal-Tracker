// Apply the saved theme before first paint to avoid a light/dark flash.
try {
  var saved = JSON.parse(localStorage.getItem('daily-meal-tracker:v1'));
  var theme = saved && saved.theme;
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
} catch (error) {
  document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
