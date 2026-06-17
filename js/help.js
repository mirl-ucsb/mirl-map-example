/* ── Help panel ──────────────────────────────────────────
   The "?" button in the header opens a small panel that
   explains how to use the map (navigation, top bar, layers,
   photo drawer, and keyboard shortcuts). Click outside or
   press Escape to close.

   Mirrors the a11y panel's open/close pattern; no state to
   persist since the panel only displays text.
   ────────────────────────────────────────────────────── */

var helpOpen = false;

function toggleHelp() {
  helpOpen = !helpOpen;
  var panel = document.getElementById('help-panel');
  var btn   = document.getElementById('btn-help');
  if (!panel || !btn) return;
  panel.classList.toggle('open', helpOpen);
  btn.classList.toggle('active', helpOpen);
  btn.setAttribute('aria-expanded', String(helpOpen));
  if (helpOpen) {
    var first = panel.querySelector('button:not([disabled])');
    if (first) first.focus();
  }
}

function closeHelp() {
  if (!helpOpen) return;
  helpOpen = false;
  var panel = document.getElementById('help-panel');
  var btn   = document.getElementById('btn-help');
  if (panel) panel.classList.remove('open');
  if (btn) {
    btn.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && helpOpen) closeHelp();
});

// Outside-click close. Deferred so the opening click on btn-help
// doesn't immediately close the panel it just opened.
setTimeout(function () {
  document.addEventListener('click', function (e) {
    if (!helpOpen) return;
    var panel = document.getElementById('help-panel');
    var btn   = document.getElementById('btn-help');
    if (panel && !panel.contains(e.target) && e.target !== btn) closeHelp();
  });
}, 100);
